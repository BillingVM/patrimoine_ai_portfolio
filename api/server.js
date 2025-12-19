/**
 * Portfolio AI - Express Server with HTTPS/WSS Support
 * Handles file uploads and AI report generation
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const https = require('https');
const http = require('http');

// Import modules
const db = require('./db');
const { parseFile } = require('./upload');
const { generateReport } = require('./ai');
const credits = require('./credits');
const FinancialDatasetsAPI = require('./financialDatasets');

// Import routers
const clientsRouter = require('./routes/clients');

const app = express();
const PORT = process.env.PORT || 3001;

// Detect SSL certificate paths based on script location
const scriptPath = __filename;
const domainMatch = scriptPath.match(/\/var\/www\/([^\/]+)\//);
const domain = domainMatch ? domainMatch[1] : null;

let server;
let useSSL = false;

if (domain) {
  const certPath = `/var/www/${domain}/fullchain.pem`;
  const keyPath = `/var/www/${domain}/privkey.pem`;

  // Check if SSL certificates exist
  if (fsSync.existsSync(certPath) && fsSync.existsSync(keyPath)) {
    try {
      const sslOptions = {
        cert: fsSync.readFileSync(certPath),
        key: fsSync.readFileSync(keyPath)
      };
      server = https.createServer(sslOptions, app);
      useSSL = true;
      console.log(`✅ SSL certificates loaded for domain: ${domain}`);
    } catch (error) {
      console.error('❌ Error loading SSL certificates:', error.message);
      console.log('⚠️  Falling back to HTTP...');
      server = http.createServer(app);
    }
  } else {
    console.log('⚠️  SSL certificates not found, using HTTP');
    server = http.createServer(app);
  }
} else {
  console.log('⚠️  Could not detect domain from path, using HTTP');
  server = http.createServer(app);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Ensure uploads directory exists
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch (err) {
      console.error('Error creating uploads directory:', err);
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only specific file types
    const allowedTypes = [
      'text/csv',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/bmp',
    ];

    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(csv|pdf|xlsx?|json|docx?|txt|jpe?g|png|tiff?|bmp)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported: CSV, PDF, Excel, JSON, Word, TXT, JPG, PNG'));
    }
  }
});

// ==================== ROUTES ====================

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Portfolio AI API is running' });
});

// ==================== CLIENT MANAGEMENT ====================
// Mount client management routes
app.use('/api/clients', clientsRouter);

/**
 * POST /api/upload
 * Upload portfolio file
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📤 Uploaded: ${req.file.originalname} (${req.file.size} bytes)`);

    // Get file extension
    const fileExt = path.extname(req.file.originalname).slice(1).toLowerCase();

    // Parse file content
    console.log(`📄 Parsing ${fileExt} file...`);
    const rawData = await parseFile(req.file.path, fileExt);

    // Save to database
    const portfolio = await db.savePortfolio(
      req.file.filename,
      req.file.originalname,
      fileExt,
      rawData
    );

    console.log(`✅ Portfolio saved with ID: ${portfolio.id}`);

    res.json({
      success: true,
      portfolio: {
        id: portfolio.id,
        filename: portfolio.original_name,
        fileType: portfolio.file_type,
        uploadedAt: portfolio.uploaded_at,
      }
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      error: 'Failed to upload file',
      message: error.message
    });
  }
});

/**
 * POST /api/generate-report
 * Generate AI report for a portfolio (costs credits)
 */
app.post('/api/generate-report', async (req, res) => {
  try {
    const { portfolioId } = req.body;
    const userId = 1; // Demo user

    if (!portfolioId) {
      return res.status(400).json({ error: 'Portfolio ID is required' });
    }

    // Check credits balance FIRST
    const hasCredits = await credits.hasCredits(userId);
    const balance = await credits.getBalance(userId);

    if (!hasCredits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        message: 'Your credit balance is depleted. Please add more credits to continue.',
        balance: balance,
        needsPayment: true
      });
    }

    // Get portfolio data
    const portfolio = await db.getPortfolio(portfolioId);
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    console.log(`🤖 Generating report for portfolio #${portfolioId}...`);
    console.log(`💰 Current balance: ${balance} credits`);

    // Generate AI report with metadata for adaptive prompts
    const aiResult = await generateReport(portfolio.raw_data, {
      file_type: portfolio.file_type,
      original_name: portfolio.original_name,
    });

    // Save report to database
    const report = await db.saveReport(
      portfolioId,
      aiResult.content,
      aiResult.aiModel,
      aiResult.tokensUsed,
      aiResult.costUsd
    );

    // DEDUCT CREDITS for tokens used
    const tokensUsed = aiResult.tokensUsed;
    const creditsResult = await credits.deductCredits(
      userId,
      tokensUsed,
      `AI Report for ${portfolio.original_name}`,
      report.id,
      portfolioId
    );

    console.log(`✅ Report generated with ID: ${report.id}`);
    console.log(`💳 Deducted ${tokensUsed} credits. New balance: ${creditsResult.balance}`);

    res.json({
      success: true,
      report: {
        id: report.id,
        content: aiResult.content,
        aiModel: aiResult.aiModel,
        tokensUsed: aiResult.tokensUsed,
        costUsd: aiResult.costUsd,
        generatedAt: report.generated_at,
      },
      credits: {
        used: tokensUsed,
        balance: creditsResult.balance,
        hasCredits: creditsResult.balance > 0,
      }
    });

  } catch (error) {
    console.error('❌ Report generation error:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      message: error.message
    });
  }
});

/**
 * GET /api/portfolios
 * Get all portfolios
 */
app.get('/api/portfolios', async (req, res) => {
  try {
    const portfolios = await db.getAllPortfolios();

    res.json({
      success: true,
      portfolios: portfolios.map(p => ({
        id: p.id,
        filename: p.original_name,
        fileType: p.file_type,
        uploadedAt: p.uploaded_at,
        hasReport: !!p.report_id,
        reportGeneratedAt: p.report_generated,
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching portfolios:', error);
    res.status(500).json({
      error: 'Failed to fetch portfolios',
      message: error.message
    });
  }
});

/**
 * GET /api/portfolio/:id
 * Get single portfolio with report
 */
app.get('/api/portfolio/:id', async (req, res) => {
  try {
    const portfolio = await db.getPortfolio(req.params.id);

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json({
      success: true,
      portfolio: {
        id: portfolio.id,
        filename: portfolio.original_name,
        fileType: portfolio.file_type,
        rawData: portfolio.raw_data,
        uploadedAt: portfolio.uploaded_at,
        report: portfolio.report_id ? {
          id: portfolio.report_id,
          content: portfolio.report_content,
          aiModel: portfolio.ai_model,
          tokensUsed: portfolio.tokens_used,
          costUsd: parseFloat(portfolio.cost_usd),
          generatedAt: portfolio.report_generated,
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Error fetching portfolio:', error);
    res.status(500).json({
      error: 'Failed to fetch portfolio',
      message: error.message
    });
  }
});

/**
 * DELETE /api/portfolio/:id
 * Delete portfolio
 */
app.delete('/api/portfolio/:id', async (req, res) => {
  try {
    const deleted = await db.deletePortfolio(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json({ success: true, message: 'Portfolio deleted' });

  } catch (error) {
    console.error('❌ Error deleting portfolio:', error);
    res.status(500).json({
      error: 'Failed to delete portfolio',
      message: error.message
    });
  }
});

// ==================== CHAT ENDPOINT ====================

/**
 * POST /api/chat
 * Chat with AI assistant with FinancialDatasets tool support (costs credits)
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const userId = 1; // Demo user

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check credits balance
    const hasCredits = await credits.hasCredits(userId);
    const balance = await credits.getBalance(userId);

    if (!hasCredits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        message: 'Your credit balance is depleted. Please add more credits to continue.',
        balance: balance,
        needsPayment: true
      });
    }

    console.log(`💬 Chat message from user: ${message.substring(0, 50)}...`);
    console.log(`💰 Current balance: ${balance} credits`);

    // Check if OpenRouter API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({
        error: 'AI service not configured',
        message: 'The AI assistant is not currently available. Please contact support.',
        needsSetup: true
      });
    }

    // Initialize Financial Datasets API
    const financialAPI = new FinancialDatasetsAPI(process.env.FINANCIAL_DATASETS_API_KEY);

    // Convert Financial Datasets tools to OpenAI function format
    const toolDefinitions = financialAPI.getToolDefinitions();
    const tools = toolDefinitions.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: Object.entries(tool.parameters).reduce((acc, [key, value]) => {
            acc[key] = {
              type: 'string',
              description: value
            };
            return acc;
          }, {}),
          required: ['ticker']
        }
      }
    }));

    // Build messages array for OpenRouter
    let messages = [
      {
        role: 'system',
        content: `You are a professional financial AI assistant for Portfolio AI platform with access to real-time financial data for 30,000+ tickers.

You help users with:
- Portfolio analysis and real-time market insights
- Client management advice
- Financial market information with live data
- Investment strategies and recommendations

CRITICAL INSTRUCTIONS:
When users ask about specific stocks, companies, or financial data:
1. Use the available tools to fetch real-time data
2. After receiving ALL tool results, you MUST provide a complete analysis
3. Include specific numbers, percentages, and recent trends from the data
4. Cite recent news or market events when relevant

IMPORTANT:
- NEVER stop after saying "Let me fetch..." - always complete your analysis
- After using tools, ALWAYS provide your final insights and recommendations
- Do NOT request the same tool multiple times unless the first attempt failed
- Provide comprehensive responses with all available data

Provide helpful, accurate, and professional responses. Keep answers clear and actionable.`
      },
      // Add conversation history
      ...history,
      // Add current user message
      { role: 'user', content: message }
    ];

    // Multi-round tool calling loop
    let allMessages = [];
    let currentResponse = await callOpenRouterChat(messages, tools);
    let usedTools = [];
    let maxRounds = 5; // Prevent infinite loops
    let roundCount = 0;

    // Keep calling AI until it stops requesting tools or hits max rounds
    while (currentResponse.tool_calls && currentResponse.tool_calls.length > 0 && roundCount < maxRounds) {
      roundCount++;
      console.log(`🔧 Round ${roundCount}: AI requesting ${currentResponse.tool_calls.length} tool calls...`);

      // Capture any message content from this round
      if (currentResponse.content) {
        allMessages.push(currentResponse.content);
      }

      // Add assistant's tool request to messages
      messages.push({
        role: 'assistant',
        content: currentResponse.content,
        tool_calls: currentResponse.tool_calls
      });

      // Track which tools were used
      currentResponse.tool_calls.forEach(tc => {
        if (!usedTools.includes(tc.function.name)) {
          usedTools.push(tc.function.name);
        }
      });

      // Execute all tool calls for this round
      for (const toolCall of currentResponse.tool_calls) {
        console.log(`📊 Executing tool: ${toolCall.function.name}`);

        try {
          const toolResult = await financialAPI.executeToolCall(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments)
          );

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          });
        } catch (toolError) {
          console.error(`❌ Tool execution error for ${toolCall.function.name}:`, toolError.message);
          // Add error result to messages so AI can handle it
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: true,
              message: toolError.message,
              note: 'This tool encountered an error. Please provide analysis without this data or suggest alternatives.'
            })
          });
        }
      }

      // Get next AI response (might request more tools or give final answer)
      currentResponse = await callOpenRouterChat(messages, tools);
    }

    // Final response from AI (no more tool calls)
    let finalMessage = currentResponse.content || '';

    console.log(`📝 Final message length: ${finalMessage ? finalMessage.length : 0} chars`);
    console.log(`📝 Intermediate messages: ${allMessages.length}`);

    // SAFEGUARD: If no final message after tool calls, force AI to provide analysis
    if (usedTools.length > 0 && (!finalMessage || finalMessage.trim().length < 50)) {
      console.log(`⚠️ No proper final response after using tools. Requesting analysis...`);

      // Add a message to force the AI to provide analysis
      messages.push({
        role: 'user',
        content: 'Based on the data you just gathered, please provide your complete analysis and recommendations now.'
      });

      // Get final response without tools (tool_choice: 'none')
      currentResponse = await callOpenRouterChat(messages, null);
      finalMessage = currentResponse.content || 'I apologize, but I encountered an issue generating the analysis. Please try again.';

      console.log(`✅ Forced final response: ${finalMessage.length} chars`);
    }

    // Combine all intermediate messages with final message
    if (allMessages.length > 0) {
      // Join all messages with newlines
      const combinedMessage = [...allMessages, finalMessage].filter(m => m && m.trim()).join('\n\n');
      finalMessage = combinedMessage;
    }

    // Count tokens in FINAL RESPONSE ONLY (fair billing)
    const tokenCounter = require('./tokenCounter');
    const tokensUsed = tokenCounter.countTokens(finalMessage);

    // Deduct credits
    const creditsResult = await credits.deductCredits(
      userId,
      tokensUsed,
      `AI Chat: ${message.substring(0, 50)}...`,
      null, // no report_id for chat
      null  // no portfolio_id for chat
    );

    const resultMessage = usedTools.length > 0
      ? `✅ Chat response generated (${roundCount} rounds, ${usedTools.length} tools used)`
      : `✅ Chat response generated`;
    console.log(resultMessage);
    console.log(`💳 Deducted ${tokensUsed} credits. New balance: ${creditsResult.balance}`);

    res.json({
      success: true,
      response: finalMessage,
      tokensUsed: tokensUsed,
      balance: creditsResult.balance,
      hasCredits: creditsResult.balance > 0,
      usedTools: usedTools.length > 0 ? usedTools : undefined,
      rounds: roundCount > 0 ? roundCount : undefined
    });

  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({
      error: 'Failed to get response from AI',
      message: error.message
    });
  }
});

/**
 * Helper function to call OpenRouter API for chat with timeout
 */
async function callOpenRouterChat(messages, tools) {
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

  try {
    // Build request body
    const requestBody = {
      model: process.env.AI_MODEL || 'xiaomi/mimo-v2-flash:free',
      messages: messages,
      max_tokens: 2000,
      temperature: 0.7,
    };

    // Only add tools if provided
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sol.inoutconnect.com',
        'X-Title': 'Portfolio AI Chat',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OpenRouter API error (${response.status}):`, errorText);

      // Check for authentication errors
      if (response.status === 401) {
        throw new Error('AI service authentication failed');
      }

      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const responseData = await response.json();

    // Handle case where response might be incomplete
    if (!responseData.choices || !responseData.choices[0]) {
      throw new Error('Invalid response from AI service - no choices returned');
    }

    const message = responseData.choices[0].message;

    return {
      content: message.content || null,
      tool_calls: message.tool_calls || null,
      usage: responseData.usage
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('AI request timed out. Please try again with a simpler question.');
    }

    throw error;
  }
}

// ==================== CREDITS ENDPOINTS ====================

/**
 * GET /api/credits/balance
 * Get user credits balance and summary
 */
app.get('/api/credits/balance', async (req, res) => {
  try {
    const userId = 1; // Demo user
    const summary = await credits.getUserSummary(userId);

    res.json({
      success: true,
      ...summary
    });

  } catch (error) {
    console.error('❌ Error fetching credits balance:', error);
    res.status(500).json({
      error: 'Failed to fetch credits balance',
      message: error.message
    });
  }
});

/**
 * POST /api/credits/purchase
 * Purchase credits (simulated payment)
 */
app.post('/api/credits/purchase', async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = 1; // Demo user

    if (!amount || amount < credits.CREDITS_PRICING.MIN_PURCHASE) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: `Minimum purchase is ${credits.CREDITS_PRICING.MIN_PURCHASE} credits`
      });
    }

    // Calculate price
    const priceUSD = credits.calculatePrice(amount);

    // Simulate payment (instant success for demo)
    const result = await credits.addCredits(
      userId,
      amount,
      `Purchased ${amount} credits for $${priceUSD}`
    );

    res.json({
      success: true,
      message: 'Credits purchased successfully',
      amount: result.added,
      balance: result.balance,
      priceUSD: priceUSD
    });

  } catch (error) {
    console.error('❌ Error purchasing credits:', error);
    res.status(500).json({
      error: 'Failed to purchase credits',
      message: error.message
    });
  }
});

/**
 * GET /api/credits/history
 * Get credits usage history
 */
app.get('/api/credits/history', async (req, res) => {
  try {
    const userId = 1; // Demo user
    const limit = parseInt(req.query.limit) || 50;

    const history = await credits.getHistory(userId, limit);

    res.json({
      success: true,
      history: history
    });

  } catch (error) {
    console.error('❌ Error fetching credits history:', error);
    res.status(500).json({
      error: 'Failed to fetch credits history',
      message: error.message
    });
  }
});

/**
 * GET /api/credits/pricing
 * Get credits pricing information
 */
app.get('/api/credits/pricing', (req, res) => {
  res.json({
    success: true,
    pricing: {
      tokensPerDollar: credits.CREDITS_PRICING.TOKENS_PER_DOLLAR,
      minPurchase: credits.CREDITS_PRICING.MIN_PURCHASE,
      examples: [
        { tokens: 10000, priceUSD: credits.calculatePrice(10000) },
        { tokens: 50000, priceUSD: credits.calculatePrice(50000) },
        { tokens: 100000, priceUSD: credits.calculatePrice(100000) },
        { tokens: 500000, priceUSD: credits.calculatePrice(500000) },
      ]
    }
  });
});

// ==================== START SERVER ====================

async function start() {
  try {
    // Initialize database tables
    await db.initTables();

    // Start server
    server.listen(PORT, () => {
      const protocol = useSSL ? 'https' : 'http';
      console.log('=================================');
      console.log(`🚀 Portfolio AI API Server`);
      console.log(`📡 Running on ${protocol}://localhost:${PORT}`);
      console.log(`🔒 Protocol: ${protocol.toUpperCase()} ${useSSL ? '(SSL Enabled)' : '(HTTP)'}`);
      console.log(`🗄️  Database: ${process.env.DB_NAME}`);
      console.log(`🤖 AI Model: ${process.env.AI_MODEL}`);
      if (domain) {
        console.log(`🌐 Domain: ${domain}`);
      }
      console.log('=================================');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 Shutting down gracefully...');
  await db.pool.end();
  process.exit(0);
});

// Start the server
start();

// Export for testing or external use
module.exports = { app, server };

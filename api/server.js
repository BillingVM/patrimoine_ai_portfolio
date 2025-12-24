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
const ModelManager = require('./modelManager');
const EnhancedChatHandler = require('./enhancedChat');
const EnhancedChatWithProgress = require('./enhancedChatWithProgress');
const VisionService = require('./visionService');
const ocr = require('./ocr');
const sessionHelper = require('./sessionHelper');
const chatSessions = require('./chatSessions');

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

// Initialize Model Manager (Round-robin with fallback)
const modelManager = new ModelManager();

// Initialize Vision Service (Hybrid image/document analysis)
const visionService = new VisionService(modelManager, ocr);

// Initialize Enhanced Chat Handler (Multi-agent AI system)
const enhancedChat = new EnhancedChatHandler();

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
 * SECURITY: Verifies portfolio belongs to current user
 */
app.get('/api/portfolio/:id', async (req, res) => {
  try {
    // Get current user ID
    const userId = sessionHelper.getCurrentUserId(req);

    // Verify portfolio ownership
    const hasAccess = await sessionHelper.verifyPortfolioOwnership(req.params.id, userId, db);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. This portfolio does not belong to you.'
      });
    }

    const portfolio = await db.getPortfolio(req.params.id);

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    res.json({
      success: true,
      portfolio: {
        id: portfolio.id,
        filename: portfolio.filename,
        original_name: portfolio.original_name,
        portfolio_name: portfolio.portfolio_name,
        file_type: portfolio.file_type,
        client_id: portfolio.client_id,
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
 * SECURITY: Verifies portfolio belongs to current user
 */
app.delete('/api/portfolio/:id', async (req, res) => {
  try {
    // Get current user ID
    const userId = sessionHelper.getCurrentUserId(req);

    // Verify portfolio ownership
    const hasAccess = await sessionHelper.verifyPortfolioOwnership(req.params.id, userId, db);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. This portfolio does not belong to you.'
      });
    }

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

/**
 * POST /api/portfolio/detect
 * AI-powered portfolio detection using Vision AI/OCR + classification
 * SECURITY: Verifies portfolio belongs to current user
 */
app.post('/api/portfolio/detect', async (req, res) => {
  try {
    const { portfolioId } = req.body;

    if (!portfolioId) {
      return res.status(400).json({ error: 'Portfolio ID is required' });
    }

    console.log(`🔍 Detecting portfolio for ID: ${portfolioId}`);

    // SECURITY: Verify portfolio ownership
    const userId = sessionHelper.getCurrentUserId(req);
    const hasAccess = await sessionHelper.verifyPortfolioOwnership(portfolioId, userId, db);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. This portfolio does not belong to you.'
      });
    }

    // 1. Fetch portfolio from database
    const portfolio = await db.getPortfolio(portfolioId);
    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    // 2. Construct file path
    const filePath = path.join(__dirname, '../uploads', portfolio.filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (err) {
      return res.status(404).json({ error: 'Portfolio file not found on disk' });
    }

    // 3. Analyze with Vision AI/OCR or use raw_data
    console.log(`📸 Analyzing file: ${portfolio.filename}`);
    const visionResult = await visionService.analyzeFile(
      filePath,
      portfolio.file_type,
      'Extract financial data from this document. Identify any portfolio holdings, stock tickers, amounts, dates, and account information. Describe the document type and structure.'
    );

    if (!visionResult.success) {
      return res.status(500).json({
        error: 'File analysis failed',
        message: visionResult.error
      });
    }

    console.log(`✅ File analyzed using: ${visionResult.method}`);

    // Determine content source: vision/OCR result or raw_data for structured files
    let contentForAI;
    if (visionResult.method === 'text' || !visionResult.content) {
      // Use raw_data from database for structured files (CSV, Excel, JSON, etc.)
      contentForAI = portfolio.raw_data || 'No content available';
      console.log(`   Using raw_data from database (${contentForAI.length} chars)`);
    } else {
      // Use vision/OCR analysis result
      contentForAI = visionResult.content;
    }

    // 4. AI classification to detect portfolio
    console.log(`🤖 Running AI classification...`);

    const detectionPrompt = `Analyze this document and respond ONLY with valid JSON in this exact format:
{
  "isPortfolio": true or false,
  "portfolioType": "stock portfolio" | "bond portfolio" | "crypto portfolio" | "mixed portfolio" | "NOT_A_PORTFOLIO",
  "suggestedTitle": "A descriptive title for this portfolio",
  "confidence": "high" | "medium" | "low"
}

Rules:
- isPortfolio: true if document contains investment holdings, positions, or account statements
- portfolioType: classify the type if it's a portfolio, otherwise "NOT_A_PORTFOLIO"
- suggestedTitle: Create a concise title (e.g., "John's Stock Portfolio", "Q4 2024 Investment Holdings")
- confidence: high if clear portfolio indicators, medium if ambiguous, low if unclear

Document content:
${contentForAI.substring(0, 3000)}`;

    const aiResponse = await modelManager.callModel([
      { role: 'system', content: 'You are a financial document classifier. Respond ONLY with valid JSON. Do not include any explanatory text.' },
      { role: 'user', content: detectionPrompt }
    ]);

    // 5. Parse JSON response
    let detection;
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      detection = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', aiResponse.content);
      return res.status(500).json({
        error: 'AI classification failed',
        message: 'Could not parse detection results'
      });
    }

    // 6. Store vision analysis in database
    await db.pool.query(
      `UPDATE portfolios_simple
       SET vision_analysis = $1, portfolio_type = $2
       WHERE id = $3`,
      [
        JSON.stringify({
          method: visionResult.method,
          content: (visionResult.content || contentForAI).substring(0, 5000), // Store first 5000 chars
          model: visionResult.model || 'text-parser',
          tokens: visionResult.tokens,
          confidence: visionResult.confidence,
          detectedAt: new Date().toISOString()
        }),
        detection.isPortfolio ? detection.portfolioType : null,
        portfolioId
      ]
    );

    console.log(`✅ Portfolio detection complete:`);
    console.log(`   Is Portfolio: ${detection.isPortfolio}`);
    console.log(`   Type: ${detection.portfolioType}`);
    console.log(`   Confidence: ${detection.confidence}`);

    res.json({
      success: true,
      detection: {
        isPortfolio: detection.isPortfolio,
        portfolioType: detection.portfolioType,
        suggestedTitle: detection.suggestedTitle,
        confidence: detection.confidence
      },
      analysisMethod: visionResult.method,
      portfolio: {
        id: portfolio.id,
        filename: portfolio.original_name
      }
    });

  } catch (error) {
    console.error('❌ Portfolio detection error:', error);
    res.status(500).json({
      error: 'Portfolio detection failed',
      message: error.message
    });
  }
});

/**
 * PUT /api/portfolio/:id/metadata
 * Update portfolio name and client assignment
 * SECURITY: Verifies portfolio belongs to current user
 */
app.put('/api/portfolio/:id/metadata', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, clientId } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Portfolio name is required' });
    }

    // SECURITY: Verify portfolio ownership
    const userId = sessionHelper.getCurrentUserId(req);
    const hasAccess = await sessionHelper.verifyPortfolioOwnership(id, userId, db);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. This portfolio does not belong to you.'
      });
    }

    console.log(`📝 Updating portfolio #${id} metadata:`);
    console.log(`   Name: ${name}`);
    console.log(`   Client ID: ${clientId || 'None'}`);

    // Update database
    const query = `
      UPDATE portfolios_simple
      SET portfolio_name = $1, client_id = $2
      WHERE id = $3
      RETURNING id, portfolio_name, client_id, filename, original_name
    `;

    const result = await db.pool.query(query, [name.trim(), clientId || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    console.log(`✅ Portfolio metadata updated successfully`);

    res.json({
      success: true,
      portfolio: {
        id: result.rows[0].id,
        name: result.rows[0].portfolio_name,
        clientId: result.rows[0].client_id,
        filename: result.rows[0].original_name
      }
    });

  } catch (error) {
    console.error('❌ Error updating portfolio metadata:', error);
    res.status(500).json({
      error: 'Failed to update portfolio metadata',
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

    // ==================== USE ENHANCED CHAT HANDLER ====================
    const result = await enhancedChat.processMessage(message, history, userId);

    return res.json(result);

  } catch (error) {
    console.error('❌ Chat error:', error);

    // Check if it's maintenance mode
    if (error.message === 'MAINTENANCE_MODE') {
      return res.status(503).json({
        success: false,
        error: 'MAINTENANCE_MODE',
        message: 'All AI models are currently unavailable. Please try again later.',
        maintenanceMode: true
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get response from AI',
      message: error.message
    });
  }
});

/**
 * GET /api/chat-stream
 * Chat with AI assistant with Server-Sent Events for real-time progress
 * Supports optional portfolio_id parameter for including file context
 */
app.get('/api/chat-stream', async (req, res) => {
  try {
    const { message, history, portfolio_id, session_id } = req.query;
    const userId = 1; // Demo user

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Parse history from JSON string
    const parsedHistory = history ? JSON.parse(history) : [];

    // Parse session_id if provided
    const sessionId = session_id ? parseInt(session_id) : null;

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Check credits balance
    const hasCredits = await credits.hasCredits(userId);
    const balance = await credits.getBalance(userId);

    if (!hasCredits) {
      // Send insufficient credits error via SSE
      res.write(`data: ${JSON.stringify({
        type: 'insufficient_credits',
        error: 'Insufficient credits',
        message: 'Your credit balance is depleted. Please add more credits to continue.',
        balance: balance,
        needsPayment: true
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // Fetch portfolio context if portfolio_id provided
    let enhancedMessage = message;
    let portfolioContext = null;

    if (portfolio_id) {
      console.log(`📎 Checking portfolio context for ID: ${portfolio_id}`);

      // SECURITY: Verify portfolio ownership
      const hasAccess = await sessionHelper.verifyPortfolioOwnership(portfolio_id, userId, db);

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'This portfolio does not belong to you.',
          success: false
        });
      }

      // CRITICAL: Only include raw OCR data in FIRST message
      // For follow-up messages, rely on conversation data extraction
      const isFirstMessage = !parsedHistory || parsedHistory.length === 0;

      if (isFirstMessage) {
        console.log(`   → First message: Including full portfolio context`);

        try {
          const portfolio = await db.getPortfolio(portfolio_id);

          if (portfolio) {
            portfolioContext = {
              id: portfolio.id,
              name: portfolio.portfolio_name || portfolio.original_name,
              type: portfolio.portfolio_type,
              fileType: portfolio.file_type,
              rawData: portfolio.raw_data
            };

            // Enhance message with portfolio context
            const contextHeader = `\n\n[ATTACHED FILE]\nFile: ${portfolioContext.name}\nType: ${portfolioContext.type || 'Document'}\nFormat: ${portfolioContext.fileType}\n\nContent:\n`;
            const contentPreview = portfolioContext.rawData ? portfolioContext.rawData.substring(0, 2000) : '[No content available]';

            enhancedMessage = `${message}${contextHeader}${contentPreview}${portfolioContext.rawData && portfolioContext.rawData.length > 2000 ? '\n\n[Content truncated...]' : ''}`;

            console.log(`✅ Portfolio context added (${portfolioContext.rawData ? portfolioContext.rawData.length : 0} chars)`);
          } else {
            console.warn(`⚠️ Portfolio ${portfolio_id} not found, proceeding without context`);
          }
        } catch (error) {
          console.error(`❌ Error fetching portfolio context:`, error);
          // Continue without portfolio context
        }
      } else {
        console.log(`   → Follow-up message (${parsedHistory.length} previous messages)`);
        console.log(`   → Skipping raw OCR data - using conversation extraction for consistency`);
      }
    }

    // Create progress-enabled chat handler
    const chatWithProgress = new EnhancedChatWithProgress();

    // Listen to progress events and send to client
    chatWithProgress.on('progress', (data) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', ...data })}\n\n`);
    });

    // Listen to token events for streaming text
    chatWithProgress.on('token', (data) => {
      res.write(`data: ${JSON.stringify({ type: 'token', ...data })}\n\n`);
    });

    // Process message with enhanced context
    // CRITICAL: Pass portfolio_id to ensure we use the EXACT portfolio from URL
    // CRITICAL: Pass session_id to enable session state persistence
    const result = await chatWithProgress.processMessageWithProgress(
      enhancedMessage,
      parsedHistory,
      userId,
      portfolio_id ? parseInt(portfolio_id) : null,  // Pass explicit portfolio ID
      sessionId  // Pass session ID for state persistence
    );

    // Send final result
    res.write(`data: ${JSON.stringify({ type: 'result', ...result })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('❌ Chat stream error:', error);

    // Send error event
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message,
      error: true
    })}\n\n`);
    res.end();
  }
});

// ==================== AI MODEL HEALTH ENDPOINTS ====================

/**
 * GET /api/ai/health
 * Get health status of all AI models
 */
app.get('/api/ai/health', (req, res) => {
  try {
    const healthStatus = modelManager.getHealthStatus();
    const activeCount = healthStatus.filter(m => m.active).length;

    res.json({
      success: true,
      totalModels: healthStatus.length,
      activeModels: activeCount,
      maintenanceMode: activeCount === 0,
      models: healthStatus
    });

  } catch (error) {
    console.error('❌ Error fetching AI health:', error);
    res.status(500).json({
      error: 'Failed to fetch AI health status',
      message: error.message
    });
  }
});

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

// ==================== CHAT SESSION ENDPOINTS ====================

/**
 * POST /api/chat/sessions
 * Create a new chat session
 */
app.post('/api/chat/sessions', async (req, res) => {
  try {
    const userId = sessionHelper.getCurrentUserId(req);
    const { title, portfolioId } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const session = await chatSessions.createSession(userId, title, portfolioId || null);

    res.json({
      success: true,
      session
    });

  } catch (error) {
    console.error('❌ Error creating chat session:', error);
    res.status(500).json({
      error: 'Failed to create chat session',
      message: error.message
    });
  }
});

/**
 * GET /api/chat/sessions
 * Get all chat sessions for current user (grouped by general/portfolio)
 */
app.get('/api/chat/sessions', async (req, res) => {
  try {
    const userId = sessionHelper.getCurrentUserId(req);
    const sessions = await chatSessions.getUserSessions(userId);

    res.json({
      success: true,
      sessions
    });

  } catch (error) {
    console.error('❌ Error fetching chat sessions:', error);
    res.status(500).json({
      error: 'Failed to fetch chat sessions',
      message: error.message
    });
  }
});

/**
 * GET /api/chat/sessions/paginated
 * Get paginated chat sessions (for modal tabs)
 * Query params: limit, offset, portfolio_id OR general=true
 * NOTE: Must be BEFORE /:id route to avoid matching "paginated" as an ID
 */
app.get('/api/chat/sessions/paginated', async (req, res) => {
  try {
    const userId = sessionHelper.getCurrentUserId(req);
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    // Determine if this is general chats or portfolio-specific
    let portfolioId = null;
    if (req.query.portfolio_id) {
      const parsedId = parseInt(req.query.portfolio_id);

      // Validate portfolio ID is a valid number
      if (isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid portfolio ID',
          message: 'Portfolio ID must be a positive integer'
        });
      }

      portfolioId = parsedId;

      // Verify portfolio ownership
      const ownsPortfolio = await sessionHelper.verifyPortfolioOwnership(portfolioId, userId, db);
      if (!ownsPortfolio) {
        return res.status(403).json({ error: 'Access denied to this portfolio' });
      }
    } else if (req.query.general === 'true') {
      portfolioId = null; // Explicitly set to null for general chats
    }

    const result = await chatSessions.getSessionsPaginated(userId, portfolioId, limit, offset);

    res.json({
      success: true,
      sessions: result.sessions,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
      currentPage: result.currentPage,
      totalPages: result.totalPages
    });

  } catch (error) {
    console.error('❌ Error fetching paginated sessions:', error);
    res.status(500).json({
      error: 'Failed to fetch chat sessions',
      message: error.message
    });
  }
});

/**
 * GET /api/chat/sessions/:id
 * Get a specific chat session with all messages
 */
app.get('/api/chat/sessions/:id', async (req, res) => {
  try {
    const userId = sessionHelper.getCurrentUserId(req);
    const sessionId = parseInt(req.params.id);

    const session = await chatSessions.getSession(sessionId, userId);

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({
      success: true,
      session
    });

  } catch (error) {
    console.error('❌ Error fetching chat session:', error);
    res.status(500).json({
      error: 'Failed to fetch chat session',
      message: error.message
    });
  }
});

/**
 * POST /api/chat/sessions/:id/messages
 * Add a message to a chat session
 */
app.post('/api/chat/sessions/:id/messages', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { role, content, metadata } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: 'Role and content are required' });
    }

    const message = await chatSessions.addMessage(sessionId, role, content, metadata || {});

    res.json({
      success: true,
      message
    });

  } catch (error) {
    console.error('❌ Error adding message:', error);
    res.status(500).json({
      error: 'Failed to add message',
      message: error.message
    });
  }
});

/**
 * PUT /api/chat/sessions/:id
 * Update chat session title
 */
app.put('/api/chat/sessions/:id', async (req, res) => {
  try {
    const userId = sessionHelper.getCurrentUserId(req);
    const sessionId = parseInt(req.params.id);
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const session = await chatSessions.updateSessionTitle(sessionId, title, userId);

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({
      success: true,
      session
    });

  } catch (error) {
    console.error('❌ Error updating chat session:', error);
    res.status(500).json({
      error: 'Failed to update chat session',
      message: error.message
    });
  }
});

/**
 * DELETE /api/chat/sessions/:id
 * Delete a chat session and all its messages
 */
app.delete('/api/chat/sessions/:id', async (req, res) => {
  try {
    const userId = sessionHelper.getCurrentUserId(req);
    const sessionId = parseInt(req.params.id);

    const deleted = await chatSessions.deleteSession(sessionId, userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({
      success: true,
      message: 'Chat session deleted'
    });

  } catch (error) {
    console.error('❌ Error deleting chat session:', error);
    res.status(500).json({
      error: 'Failed to delete chat session',
      message: error.message
    });
  }
});

// ==================== CLIENT ENDPOINTS ====================

/**
 * GET /api/clients
 * Get all clients with portfolio and report counts
 */
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await db.getAllClients();

    res.json({
      success: true,
      clients: clients
    });

  } catch (error) {
    console.error('❌ Error fetching clients:', error);
    res.status(500).json({
      error: 'Failed to fetch clients',
      message: error.message
    });
  }
});

/**
 * GET /api/clients/:id
 * Get single client by ID
 */
app.get('/api/clients/:id', async (req, res) => {
  try {
    const client = await db.getClient(req.params.id);

    if (!client) {
      return res.status(404).json({
        error: 'Client not found'
      });
    }

    res.json({
      success: true,
      client: client
    });

  } catch (error) {
    console.error('❌ Error fetching client:', error);
    res.status(500).json({
      error: 'Failed to fetch client',
      message: error.message
    });
  }
});

/**
 * POST /api/clients
 * Create new client
 */
app.post('/api/clients', async (req, res) => {
  try {
    const { name, entity_type, email, phone } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Client name is required'
      });
    }

    const client = await db.createClient(
      name.trim(),
      entity_type,
      email,
      phone
    );

    res.json({
      success: true,
      client: client
    });

  } catch (error) {
    console.error('❌ Error creating client:', error);
    res.status(500).json({
      error: 'Failed to create client',
      message: error.message
    });
  }
});

/**
 * PUT /api/clients/:id
 * Update client
 */
app.put('/api/clients/:id', async (req, res) => {
  try {
    const { name, entity_type, email, phone } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Client name is required'
      });
    }

    const client = await db.updateClient(
      req.params.id,
      name.trim(),
      entity_type,
      email,
      phone
    );

    if (!client) {
      return res.status(404).json({
        error: 'Client not found'
      });
    }

    res.json({
      success: true,
      client: client
    });

  } catch (error) {
    console.error('❌ Error updating client:', error);
    res.status(500).json({
      error: 'Failed to update client',
      message: error.message
    });
  }
});

/**
 * DELETE /api/clients/:id
 * Delete client
 */
app.delete('/api/clients/:id', async (req, res) => {
  try {
    const deleted = await db.deleteClient(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Client not found'
      });
    }

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });

  } catch (error) {
    // Check if error is due to foreign key constraint
    if (error.code === '23503') {
      return res.status(400).json({
        error: 'Cannot delete client with existing portfolios',
        message: 'Please delete all portfolios for this client first'
      });
    }

    console.error('❌ Error deleting client:', error);
    res.status(500).json({
      error: 'Failed to delete client',
      message: error.message
    });
  }
});

/**
 * GET /api/clients/:id/portfolios
 * Get all portfolios for a client
 */
app.get('/api/clients/:id/portfolios', async (req, res) => {
  try {
    const portfolios = await db.getClientPortfolios(req.params.id);

    res.json({
      success: true,
      portfolios: portfolios
    });

  } catch (error) {
    console.error('❌ Error fetching client portfolios:', error);
    res.status(500).json({
      error: 'Failed to fetch portfolios',
      message: error.message
    });
  }
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

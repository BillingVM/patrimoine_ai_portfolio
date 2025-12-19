/**
 * Portfolio AI - Simple Express Server
 * Handles file uploads and AI report generation
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import modules
const db = require('./db');
const { parseFile } = require('./upload');
const { generateReport } = require('./ai');
const credits = require('./credits');

const app = express();
const PORT = process.env.PORT || 3001;

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
    app.listen(PORT, () => {
      console.log('=================================');
      console.log(`🚀 Portfolio AI API Server`);
      console.log(`📡 Running on http://localhost:${PORT}`);
      console.log(`🗄️  Database: ${process.env.DB_NAME}`);
      console.log(`🤖 AI Model: ${process.env.AI_MODEL}`);
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

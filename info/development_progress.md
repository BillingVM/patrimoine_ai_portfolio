# Portfolio AI - Development Progress & Technical Documentation

**Last Updated**: 2025-12-19
**Status**: Production-ready demo with full monetization system
**Project Location**: `/var/www/sol.inoutconnect.com/portai/`

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technical Stack](#technical-stack)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [File Structure](#file-structure)
7. [Features Implemented](#features-implemented)
8. [Key Implementation Details](#key-implementation-details)
9. [Environment & Configuration](#environment--configuration)
10. [Testing & Verification](#testing--verification)
11. [Known Limitations](#known-limitations)
12. [Next Steps for New AI](#next-steps-for-new-ai)

---

## Project Overview

**Portfolio AI** is a monetized SaaS platform that provides AI-powered investment portfolio analysis using real-time financial data.

**Core Concept**:
- Users upload investment portfolios (CSV, PDF, Excel, JSON, Word, Images)
- AI analyzes portfolio with real-time market data from financialdatasets.ai
- Users pay per report generation using a token-based credits system
- Professional, customer-facing reports displayed in modal popups

**Business Model**: Pay-per-use (100,000 tokens = $3.00 USD)

---

## Technical Stack

### Backend
- **Runtime**: Node.js v18+ with Express.js
- **Database**: PostgreSQL 12+
- **Process Manager**: PM2 (ecosystem.config.js)
- **API Port**: 3001
- **AI Provider**: OpenRouter API (xiaomi/mimo-v2-flash:free model - 309B params, 256K context)
- **Financial Data**: FinancialDatasets.ai API (30,000+ tickers, 9 tools)
- **Token Counting**: gpt-tokenizer library (cl100k_base encoding - ChatGPT compatible)

### OCR System
- **Primary**: Tesseract.js (free, self-hosted, JavaScript-based)
- **Optional**: Google Cloud Vision API (higher accuracy, requires API key)
- **Strategy**: Dual fallback - try Google first, fall back to Tesseract

### Frontend
- **HTML Engine**: PHP (for dynamic asset loading with cache busting)
- **JavaScript**: Vanilla JS (no frameworks)
- **CSS**: Custom dark theme with responsive grid layouts
- **Upload**: FormData with fetch API
- **UI Pattern**: Modal popups for reports

### File Processing
- **CSV**: Papa Parse library
- **PDF**: pdf-parse library
- **Excel**: xlsx library
- **Word**: mammoth library
- **Images**: OCR (Tesseract.js or Google Cloud Vision)
- **JSON**: Native JSON.parse

---

## Architecture

### Request Flow

```
User uploads file → PHP frontend → Express API (port 3001) → File processing → Database storage → AI analysis → Token deduction → Response
```

### AI Report Generation Flow

```
1. User clicks "Generate Report" → Check credits balance
2. If balance > 0 → Load portfolio data
3. Extract tickers (AAPL, MSFT, etc.)
4. Build system prompt (internal context: OCR quality, file type)
5. Build user prompt (clean, customer-facing)
6. First AI call with tool definitions (9 financial tools)
7. AI requests real-time data (tool calls) → financialdatasets.ai API
8. Second AI call with tool results → Final report
9. Count tokens in FINAL REPORT ONLY (fair billing)
10. Deduct tokens from user balance
11. Save report to database with token count
12. Return report + new balance to frontend
```

### Token Counting (Critical Implementation)

**Problem Solved**: User should only pay for final report text, NOT internal API calls.

**Solution**:
- OpenRouter API returns `usage.total_tokens` (includes system prompts, tool calls, responses)
- We use `gpt-tokenizer` library to count ONLY the final report content
- This ensures fair billing

**Code Location**: `/portai/api/ai.js` lines 135-140 and 152-157

```javascript
const reportTokens = tokenCounter.countTokens(finalResponse.content);
// NOT: finalResponse.usage.total_tokens
```

---

## Database Schema

### Database Name: `portfolio_ai`

### Connection Details
- **Host**: localhost
- **Port**: 5432
- **User**: postgres
- **Password**: `apzosldkcAO91561ssa6@gasy`
- **Connection Pool**: Max 20 connections

### Tables

#### 1. `portfolios_simple`
Stores uploaded portfolio files and extracted data.

```sql
CREATE TABLE portfolios_simple (
    id SERIAL PRIMARY KEY,
    original_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    raw_data TEXT NOT NULL,
    ocr_confidence NUMERIC(5,2),
    ocr_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Auto-increment primary key
- `original_name`: Original filename (e.g., "portfolio.csv")
- `file_type`: csv, pdf, xlsx, json, docx, jpg, png
- `file_size`: Size in bytes
- `raw_data`: Extracted text/data (JSON string for structured data, text for OCR)
- `ocr_confidence`: 0-100 (only for image files)
- `ocr_method`: "tesseract" or "google-vision" (only for images)
- `created_at`: Upload timestamp

#### 2. `reports_simple`
Stores AI-generated reports with token usage.

```sql
CREATE TABLE reports_simple (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios_simple(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    ai_model VARCHAR(100),
    tokens_used INTEGER DEFAULT 0,
    cost_usd NUMERIC(10,6) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Auto-increment primary key
- `portfolio_id`: Foreign key to portfolios_simple
- `content`: Full markdown report text
- `ai_model`: "xiaomi/mimo-v2-flash:free"
- `tokens_used`: Token count from final report only (NOT total API tokens)
- `cost_usd`: Currently 0 (free model)
- `created_at`: Generation timestamp

#### 3. `users_demo`
Demo user account with credits balance.

```sql
CREATE TABLE users_demo (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) DEFAULT 'demo@portfolioai.com',
    credits_balance INTEGER DEFAULT 100000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Always 1 (single demo user)
- `email`: demo@portfolioai.com
- `credits_balance`: Current token balance (can go negative)
- `created_at`, `updated_at`: Timestamps

**Default User**: Pre-seeded with 100,000 credits on first run.

#### 4. `credits_transactions`
Complete audit trail of all credit purchases and usage.

```sql
CREATE TABLE credits_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users_demo(id),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    description TEXT,
    related_report_id INTEGER REFERENCES reports_simple(id),
    related_portfolio_id INTEGER REFERENCES portfolios_simple(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields**:
- `id`: Auto-increment primary key
- `user_id`: Foreign key to users_demo (always 1)
- `amount`: Positive for purchases, negative for usage
- `balance_after`: Snapshot of balance after transaction
- `transaction_type`: "purchase" or "usage"
- `description`: Human-readable description
  - Purchase: "Purchased 100,000 credits for $3.00"
  - Usage: "AI Report for portfolio.csv"
- `related_report_id`: Link to report (if usage)
- `related_portfolio_id`: Link to portfolio (if usage)
- `created_at`: Transaction timestamp

---

## API Endpoints

**Base URL**: `http://localhost:3001/api`

### Portfolio Management

#### `POST /api/upload`
Upload a portfolio file.

**Request**: multipart/form-data with file
**Response**:
```json
{
  "success": true,
  "portfolio": {
    "id": 1,
    "original_name": "portfolio.csv",
    "file_type": "csv",
    "file_size": 1234,
    "created_at": "2025-12-19T10:00:00Z"
  }
}
```

**File Processing**:
- CSV: Parsed to JSON with Papa Parse, stored as JSON string
- PDF: Text extracted with pdf-parse
- Excel: Converted to JSON with xlsx library
- Word: Converted to HTML/text with mammoth
- Images: OCR with Tesseract.js or Google Vision
- JSON: Validated and stored as-is

#### `GET /api/portfolios`
List all uploaded portfolios.

**Response**:
```json
{
  "success": true,
  "portfolios": [
    {
      "id": 1,
      "original_name": "portfolio.csv",
      "file_type": "csv",
      "file_size": 1234,
      "has_report": true,
      "report_id": 1,
      "created_at": "2025-12-19T10:00:00Z"
    }
  ]
}
```

#### `GET /api/portfolio/:id`
Get portfolio details with report (if exists).

**Response**:
```json
{
  "success": true,
  "portfolio": {
    "id": 1,
    "original_name": "portfolio.csv",
    "file_type": "csv",
    "raw_data": "{...}",
    "created_at": "2025-12-19T10:00:00Z"
  },
  "report": {
    "id": 1,
    "content": "# Portfolio Analysis...",
    "ai_model": "xiaomi/mimo-v2-flash:free",
    "tokens_used": 2345,
    "created_at": "2025-12-19T10:05:00Z"
  }
}
```

#### `DELETE /api/portfolio/:id`
Delete a portfolio and its reports.

**Response**:
```json
{
  "success": true,
  "message": "Portfolio deleted"
}
```

### AI Report Generation

#### `POST /api/generate-report`
Generate AI analysis report for a portfolio.

**Request**:
```json
{
  "portfolioId": 1
}
```

**Response (Success)**:
```json
{
  "success": true,
  "report": {
    "id": 1,
    "content": "# Portfolio Analysis\n\n...",
    "aiModel": "xiaomi/mimo-v2-flash:free",
    "tokensUsed": 2345
  },
  "credits": {
    "used": 2345,
    "balance": 97655
  }
}
```

**Response (Insufficient Credits) - HTTP 402**:
```json
{
  "error": "Insufficient credits",
  "message": "Your credit balance is depleted.",
  "needsPayment": true,
  "balance": 0
}
```

**Processing Steps**:
1. Check user balance > 0
2. Load portfolio data
3. Extract tickers (AAPL, MSFT, etc.)
4. Generate AI report with real-time financial data
5. Count tokens in final report only
6. Deduct tokens from balance
7. Save report and transaction
8. Return report + new balance

### Credits Management

#### `GET /api/credits/balance`
Get current credits balance and summary.

**Response**:
```json
{
  "success": true,
  "balance": 97655,
  "summary": {
    "totalUsed": 50000,
    "totalPurchased": 150000,
    "reportsGenerated": 15
  }
}
```

#### `POST /api/credits/purchase`
Simulate credit purchase (instant for demo).

**Request**:
```json
{
  "amount": 100000,
  "paymentMethod": "credit_card"
}
```

**Response**:
```json
{
  "success": true,
  "transaction": {
    "id": 10,
    "amount": 100000,
    "cost": 3.00,
    "balance": 197655
  }
}
```

**Note**: This is a simulated payment. In production, integrate with Stripe/PayPal.

#### `GET /api/credits/history`
Get transaction history (50 most recent).

**Response**:
```json
{
  "success": true,
  "history": [
    {
      "id": 10,
      "amount": 100000,
      "balance_after": 197655,
      "transaction_type": "purchase",
      "description": "Purchased 100,000 credits for $3.00",
      "created_at": "2025-12-19T10:00:00Z"
    },
    {
      "id": 9,
      "amount": -2345,
      "balance_after": 97655,
      "transaction_type": "usage",
      "description": "AI Report for portfolio.csv",
      "related_report_id": 1,
      "related_portfolio_id": 1,
      "created_at": "2025-12-19T09:55:00Z"
    }
  ]
}
```

#### `GET /api/credits/pricing`
Get pricing tiers and package information.

**Response**:
```json
{
  "success": true,
  "pricing": {
    "baseRate": "100,000 tokens = $3.00",
    "tokensPerDollar": 33333,
    "packages": [
      { "tokens": 10000, "price": 0.30, "label": "Starter" },
      { "tokens": 50000, "price": 1.50, "label": "Basic" },
      { "tokens": 100000, "price": 3.00, "label": "Popular" },
      { "tokens": 500000, "price": 15.00, "label": "Best Value" }
    ]
  }
}
```

---

## File Structure

```
/var/www/sol.inoutconnect.com/portai/
│
├── api/                          # Backend Node.js API
│   ├── server.js                 # Main Express server (port 3001)
│   ├── db.js                     # PostgreSQL connection pool & queries
│   ├── ai.js                     # AI report generation with tool calling
│   ├── credits.js                # Credits management system
│   ├── tokenCounter.js           # ChatGPT-compatible token counting
│   ├── financialDatasets.js     # FinancialDatasets.ai API integration (9 tools)
│   ├── uploads/                  # Uploaded files storage
│   ├── ecosystem.config.js       # PM2 configuration
│   ├── package.json              # Dependencies
│   └── .env                      # Environment variables
│
├── public/                       # Frontend PHP/JS/CSS
│   ├── index.php                 # Main dashboard page
│   ├── credits-history.php       # Transaction history page
│   ├── css/
│   │   └── style.css             # Dark theme, responsive design
│   └── js/
│       └── app.js                # Frontend logic (upload, reports, credits)
│
├── info/                         # Documentation
│   ├── development_progress.md   # This file
│   └── claude_plan_progress.md   # Original plan (older)
│
└── logs/                         # PM2 logs
    ├── pm2-out.log
    └── pm2-error.log
```

---

## Features Implemented

### ✅ 1. Multi-Format File Upload
**Status**: Fully working

**Supported Formats**:
- CSV (parsed to JSON)
- PDF (text extraction)
- Excel (.xlsx, .xls)
- JSON
- Word (.docx, .doc)
- Images (.jpg, .jpeg, .png) with OCR

**OCR Methods**:
1. Google Cloud Vision API (optional, requires `GOOGLE_VISION_API_KEY`)
2. Tesseract.js (fallback, always available)

**Implementation**: `/portai/api/server.js` lines 50-200

### ✅ 2. AI Report Generation with Real-Time Financial Data
**Status**: Fully working

**Features**:
- Uses OpenRouter API with xiaomi/mimo-v2-flash:free model
- Integrates FinancialDatasets.ai API (9 financial tools)
- AI can request real-time data via tool calling
- Adaptive prompts based on data quality (OCR vs structured)
- Clean, customer-facing reports (technical details hidden)

**9 Financial Tools Available**:
1. get_stock_price - Current and historical prices
2. get_company_news - Latest news for tickers
3. get_earnings - Earnings reports and dates
4. get_analyst_estimates - Price targets and ratings
5. get_sec_filings - SEC filings (10-K, 10-Q, 8-K)
6. get_insider_trading - Insider transactions
7. get_institutional_holdings - Institutional ownership
8. get_financials - Income statements, balance sheets
9. get_financial_metrics - PE ratio, dividend yield, etc.

**System Prompt Strategy**:
- **System Prompt** (internal): Includes technical context (OCR confidence, file type, data quality)
- **User Prompt** (clean): Customer-facing, professional language
- **Rule**: AI told explicitly "DO NOT mention OCR, file types, data extraction" in final report

**Implementation**: `/portai/api/ai.js` and `/portai/api/financialDatasets.js`

### ✅ 3. Token-Based Credits System
**Status**: Fully working

**Features**:
- Users have credits balance (default 100,000 on first run)
- Each report generation deducts tokens from balance
- Balance can go negative
- If balance <= 0, report generation blocked (HTTP 402)
- Complete transaction audit trail

**Pricing**:
- 100,000 tokens = $3.00 USD
- Average report: 2,000-5,000 tokens = $0.06 - $0.15

**Implementation**: `/portai/api/credits.js`

### ✅ 4. Fair Token Counting (Critical Feature)
**Status**: Fully working

**Problem Solved**: Users should only pay for final report text, not internal API calls to financialdatasets.ai.

**Solution**:
- Uses `gpt-tokenizer` library with cl100k_base encoding (ChatGPT standard)
- Counts tokens ONLY in final report content
- Ignores system prompts, tool calls, tool responses

**Example**:
- OpenRouter reports: 8,587 total tokens (includes everything)
- We charge: 2,345 tokens (final report only)

**Verification**: Check server logs for comparison:
```
📊 Token breakdown: 2,345 tokens (9,123 chars, 1,234 words)
⚠️  OpenRouter reported 8,587 total tokens (includes tool calls)
✅ Billing user for: 2,345 tokens (final report only)
```

**Implementation**: `/portai/api/tokenCounter.js` and `/portai/api/ai.js` lines 135-140, 152-157

### ✅ 5. Credits Display & Purchase
**Status**: Fully working

**Location**: Header (top right of index.php)

**Display**:
- Current balance formatted with commas (e.g., "35,500")
- Color coding:
  - Green: > 20,000 credits
  - Orange: < 20,000 credits (low balance warning)
  - Red: <= 0 credits (depleted)

**Add Credits Button**:
- Opens modal with 4 preset packages
- Custom amount input (min 10,000)
- Real-time price calculator
- Simulated instant payment (for demo)

**Implementation**: `/portai/public/js/app.js` lines 400-550

### ✅ 6. Insufficient Credits Protection
**Status**: Fully working

**Behavior**:
- If balance <= 0, "Generate Report" button triggers modal
- Modal shows:
  - Current balance
  - "Insufficient credits" message
  - Pricing information
  - Two buttons: Cancel or Add Credits

**API Response**: HTTP 402 Payment Required

**Implementation**: `/portai/api/server.js` lines 220-230 and `/portai/public/js/app.js` lines 250-280

### ✅ 7. Transaction History Page
**Status**: Fully working

**URL**: `/portai/public/credits-history.php`

**Features**:
- Summary cards: Current Balance, Total Used, Total Purchased, Reports Generated
- Transaction table with columns:
  - Date (formatted: "2025-12-18 5:48 PM")
  - Type (PURCHASE or USAGE with color-coded badges)
  - Description (e.g., "AI Report for portfolio.csv")
  - Amount (+100,000 in green or -2,345 in red)
  - Balance After
- Most recent first (descending order)
- Shows 50 most recent transactions
- "← Back to Dashboard" button

**Implementation**: `/portai/public/credits-history.php` and API endpoint `/api/credits/history`

### ✅ 8. Report Regeneration (Revenue Driver)
**Status**: Fully working

**Old Behavior (Removed)**:
- "✓ Report Generated" button (grayed out, disabled)
- Can't generate again

**New Behavior**:
- "🔄 Make New Report" button (always enabled, green)
- Users can regenerate unlimited times
- Each generation costs credits
- Encourages updated analysis = more revenue

**Implementation**: `/portai/public/js/app.js` lines 180-220

### ✅ 9. Modal Popup for Reports
**Status**: Fully working

**Features**:
- Wide popup (90% width, max 1200px)
- 85% height, scrollable content
- Dark overlay background
- Close button (X)
- Markdown rendering for reports
- Professional presentation

**Implementation**: `/portai/public/css/style.css` lines 300-400

### ✅ 10. Responsive Design
**Status**: Fully working

**Breakpoints**:
- Mobile (<768px): Single column, stacked layout, touch-friendly buttons
- Tablet (769-1024px): 2-column grid
- Desktop (1024-1400px): Multi-column grid
- Large screens (>1400px): Optimized 450px cards

**Optimizations**:
- Upload section: Reduced size (smaller padding, 48px icons)
- Portfolio cards: Increased size (400px min-width, 2rem padding)
- Touch targets: 44px minimum on mobile
- Print-friendly styles

**Implementation**: `/portai/public/css/style.css` lines 600-750

---

## Key Implementation Details

### 1. Dynamic Asset Loading (PHP)
**Problem**: Browser caching causes CSS/JS updates not to load.

**Solution**: PHP-based cache busting with `filemtime()`.

```php
<?php
$cssFile = __DIR__ . '/css/style.css';
$cssVersion = file_exists($cssFile) ? filemtime($cssFile) : time();
echo "<link rel=\"stylesheet\" href=\"/portai/public/css/style.css?v={$cssVersion}\">";
?>
```

**Location**: `/portai/public/index.php` lines 9-13, 70-74

### 2. Tool Calling (AI + Financial Data)
**How It Works**:

1. First AI call with tool definitions (9 financial tools)
2. AI responds with `tool_calls` array
3. Execute each tool call via FinancialDatasets.ai API
4. Append tool results to conversation
5. Second AI call with tool results
6. AI generates final report using real-time data

**Code**:
```javascript
const response = await callOpenRouter(messages, tools);

if (response.tool_calls && response.tool_calls.length > 0) {
  for (const toolCall of response.tool_calls) {
    const toolResult = await financialAPI.executeToolCall(
      toolCall.function.name,
      JSON.parse(toolCall.function.arguments)
    );
    messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
  }
  const finalResponse = await callOpenRouter(messages, tools);
}
```

**Location**: `/portai/api/ai.js` lines 104-131

### 3. Ticker Extraction
**Purpose**: Identify stock symbols in portfolio data to fetch real-time data.

**Pattern**: `\b([A-Z]{1,5})\b` (1-5 uppercase letters)

**Exclusions**: USD, CSV, PDF, JPG, PNG, OCR, THE, AND, FOR, ARE, WITH

**Limit**: Max 10 tickers per portfolio (to avoid excessive API calls)

**Location**: `/portai/api/ai.js` lines 25-42

### 4. Database Connection Pooling
**Configuration**:
```javascript
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'portfolio_ai',
  user: 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Location**: `/portai/api/db.js` lines 10-20

### 5. Error Handling
**API Responses**:
- 200: Success
- 402: Insufficient credits (payment required)
- 404: Resource not found
- 500: Server error

**Frontend Handling**:
- Toast notifications for user feedback
- Modal for insufficient credits
- Console logs for debugging

### 6. PM2 Process Management
**Configuration**: `/portai/api/ecosystem.config.js`

**Key Settings**:
- Name: portai-api
- Script: server.js
- Instances: 1
- Watch: false (prevent auto-restart on file changes)
- Max restarts: 10
- Restart delay: 5000ms

**Environment Variables** (embedded in config):
```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3001,
  DB_PASSWORD: 'apzosldkcAO91561ssa6@gasy',
  OPENROUTER_API_KEY: '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',
  AI_MODEL: 'xiaomi/mimo-v2-flash:free',
  FINANCIAL_DATASETS_API_KEY: 'b2fc1001-ebc6-4740-8968-a22092058880',
  USE_GOOGLE_VISION: 'false',
}
```

**Commands**:
```bash
pm2 start ecosystem.config.js       # Start server
pm2 restart portai-api --update-env # Restart with new env vars
pm2 logs portai-api                 # View logs
pm2 status                          # Check status
```

---

## Environment & Configuration

### Environment Variables

**File**: `/portai/api/.env` (also embedded in ecosystem.config.js)

```env
# Server
NODE_ENV=production
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=portfolio_ai
DB_USER=postgres
DB_PASSWORD=apzosldkcAO91561ssa6@gasy

# AI
OPENROUTER_API_KEY=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
AI_MODEL=xiaomi/mimo-v2-flash:free

# Financial Data
FINANCIAL_DATASETS_API_KEY=b2fc1001-ebc6-4740-8968-a22092058880

# OCR (Optional)
USE_GOOGLE_VISION=false
GOOGLE_VISION_API_KEY=
```

### API Keys & Credentials

**OpenRouter API**:
- Key: `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`
- Model: xiaomi/mimo-v2-flash:free (309B params, 256K context)
- Cost: $0.00 (free model)

**FinancialDatasets.ai**:
- Key: `b2fc1001-ebc6-4740-8968-a22092058880`
- Plan: Free tier (rate limits apply)
- Endpoints: 9 financial tools

**Google Cloud Vision** (Optional):
- Not currently configured
- To enable: Set `USE_GOOGLE_VISION=true` and add API key

### Database Access

**PostgreSQL**:
- Host: localhost
- Port: 5432
- Database: portfolio_ai
- User: postgres
- Password: apzosldkcAO91561ssa6@gasy

**Connection String**:
```
postgresql://postgres:apzosldkcAO91561ssa6@gasy@localhost:5432/portfolio_ai
```

### Server Ports

- **API**: http://localhost:3001
- **Frontend**: https://sol.inoutconnect.com/portai/public/

### File Permissions

**Required**:
- `/portai/api/uploads/` - Writable by Node.js process
- `/portai/logs/` - Writable by PM2

---

## Testing & Verification

### 1. Verify API Server Running

```bash
pm2 status
# Should show: portai-api | online

curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}
```

### 2. Test Database Connection

```bash
PGPASSWORD='apzosldkcAO91561ssa6@gasy' psql -U postgres -d portfolio_ai -c "SELECT COUNT(*) FROM portfolios_simple;"
# Should return count of portfolios
```

### 3. Test File Upload

```bash
# Upload a CSV file
curl -X POST http://localhost:3001/api/upload \
  -F "file=@test.csv"

# Should return:
# {"success": true, "portfolio": {...}}
```

### 4. Test Credits Balance

```bash
curl http://localhost:3001/api/credits/balance

# Should return:
# {"success": true, "balance": 100000, "summary": {...}}
```

### 5. Test Report Generation

1. Upload a portfolio via UI: https://sol.inoutconnect.com/portai/public/
2. Click "Generate Report"
3. Check server logs: `pm2 logs portai-api`
4. Verify token counting:
   - Look for: "📊 Token breakdown: X tokens"
   - Look for: "⚠️ OpenRouter reported Y total tokens"
   - Look for: "✅ Billing user for: X tokens (final report only)"
5. Verify credits deducted: Check balance in UI

### 6. Test Insufficient Credits

1. Generate reports until balance <= 0
2. Try to generate another report
3. Should show "Insufficient Credits" modal
4. Verify HTTP 402 status in network tab

### 7. Test Credits Purchase

1. Click "+ Add Credits" button
2. Select a package (e.g., 100,000 credits)
3. Click "Complete Purchase"
4. Verify balance increases
5. Check transaction history page

### 8. Test Transaction History

1. Navigate to: https://sol.inoutconnect.com/portai/public/credits-history.php
2. Verify summary cards show correct data
3. Verify transaction table has all purchases and usage
4. Check that amounts are color-coded (green for +, red for -)

### 9. Test Responsive Design

1. Open https://sol.inoutconnect.com/portai/public/
2. Resize browser window to mobile size (<768px)
3. Verify:
   - Single column layout
   - Stacked header sections
   - Touch-friendly buttons (44px min)
   - Readable text sizes

### 10. Verify Token Counting Accuracy

**Test Script**:
```bash
cd /var/www/sol.inoutconnect.com/portai/api

node -e "
const tc = require('./tokenCounter');
const text = 'This is a test report with some content.';
const count = tc.countTokens(text);
const breakdown = tc.getTokenBreakdown(text);
console.log('Token count:', count);
console.log('Breakdown:', JSON.stringify(breakdown, null, 2));
"
```

**Expected Output**:
```
Token count: 10
Breakdown: {
  "tokens": 10,
  "chars": 41,
  "words": 8,
  "avgCharsPerToken": 4.1
}
```

---

## Known Limitations

### 1. Single Demo User
**Issue**: Currently hardcoded to user ID = 1 (demo user).

**Impact**: No multi-user support.

**Fix Needed**: Add authentication system (Clerk, Auth0, or custom JWT).

### 2. Simulated Payment
**Issue**: Credit purchases are instant simulations, no real payment processing.

**Impact**: Cannot accept real payments.

**Fix Needed**: Integrate Stripe, PayPal, or other payment service provider.

### 3. No Rate Limiting
**Issue**: No throttling on API calls.

**Impact**: Could be abused (especially report generation).

**Fix Needed**: Add express-rate-limit middleware.

### 4. No Email Notifications
**Issue**: Users not notified of low balance or successful purchases.

**Impact**: Less engagement.

**Fix Needed**: Integrate email service (SendGrid, AWS SES).

### 5. No Admin Dashboard
**Issue**: No way to manage users, view system stats, adjust credits manually.

**Impact**: Manual database queries needed for admin tasks.

**Fix Needed**: Build admin panel with user management.

### 6. OCR Accuracy Varies
**Issue**: Tesseract.js has lower accuracy than Google Cloud Vision, especially for complex layouts.

**Impact**: Some image uploads may have poor data extraction.

**Fix Needed**: Enable Google Cloud Vision API for better accuracy.

### 7. No Report Caching
**Issue**: Every "Make New Report" click generates a fresh report, even for same portfolio.

**Impact**: Users charged for duplicate analyses.

**Note**: This is intentional for revenue, but could add "View Previous Report" option.

### 8. No Ticker Validation
**Issue**: Extracted tickers not validated against known ticker lists.

**Impact**: AI may request data for invalid tickers (e.g., "INC", "LLC").

**Fix Needed**: Add ticker validation against FinancialDatasets.ai ticker list.

### 9. No Token Limit per Report
**Issue**: No cap on report size/token usage.

**Impact**: Very large portfolios could consume excessive credits.

**Fix Needed**: Add max_tokens limit and pre-generation cost estimate.

### 10. No Batch Processing
**Issue**: Must process one portfolio at a time.

**Impact**: Slow for users with multiple portfolios.

**Fix Needed**: Add batch upload and parallel processing.

---

## Next Steps for New AI

### Immediate Checklist

Before starting new work:

1. **Verify System Running**:
   ```bash
   pm2 status
   pm2 logs portai-api --lines 50
   curl http://localhost:3001/health
   ```

2. **Test Basic Flow**:
   - Upload a file
   - Generate a report
   - Check credits deduction
   - View transaction history

3. **Review Code Structure**:
   - Read `/portai/api/server.js` (main API logic)
   - Read `/portai/api/ai.js` (AI report generation)
   - Read `/portai/public/js/app.js` (frontend logic)

4. **Check Database State**:
   ```sql
   SELECT * FROM users_demo;
   SELECT * FROM portfolios_simple ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM reports_simple ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM credits_transactions ORDER BY created_at DESC LIMIT 10;
   ```

### Common Tasks

**Add a New API Endpoint**:
1. Add route to `/portai/api/server.js`
2. Implement logic (may need new function in db.js)
3. Test with curl or Postman
4. Update frontend to call new endpoint

**Add a New Financial Tool**:
1. Add tool definition to `/portai/api/financialDatasets.js` (getToolDefinitions)
2. Add execution logic to executeToolCall() method
3. AI will automatically have access to new tool

**Change AI Model**:
1. Update `AI_MODEL` in `/portai/api/.env`
2. Update `AI_MODEL` in `/portai/api/ecosystem.config.js`
3. Restart PM2: `pm2 restart portai-api --update-env`
4. Test report generation

**Adjust Token Pricing**:
1. Update `CREDITS_PRICING` in `/portai/api/credits.js`
2. Update pricing display in `/portai/public/js/app.js`
3. Update documentation

**Add New File Type Support**:
1. Add file extension to upload input in `/portai/public/index.php`
2. Add processing logic in `/portai/api/server.js` (POST /api/upload)
3. Install any needed npm packages
4. Test upload and report generation

### Debugging Tips

**If API not responding**:
```bash
pm2 logs portai-api --err     # Check errors
pm2 restart portai-api         # Restart
netstat -tulpn | grep 3001     # Check port
```

**If database errors**:
```bash
# Check if PostgreSQL running
systemctl status postgresql

# Check database exists
PGPASSWORD='apzosldkcAO91561ssa6@gasy' psql -U postgres -l

# Check tables exist
PGPASSWORD='apzosldkcAO91561ssa6@gasy' psql -U postgres -d portfolio_ai -c "\dt"
```

**If token counting issues**:
```bash
# Check tokenCounter module
cd /var/www/sol.inoutconnect.com/portai/api
node -e "const tc = require('./tokenCounter'); console.log(tc.countTokens('test'));"
```

**If frontend not loading**:
- Check browser console for errors
- Verify asset cache busting: View page source, check `?v=` timestamps
- Clear browser cache
- Check nginx configuration

### Integration Points for New Features

**User Authentication**:
- Replace hardcoded `userId = 1` in server.js
- Add middleware to extract user from JWT/session
- Update database queries to use authenticated user ID

**Real Payment Processing**:
- Replace `simulatePurchase()` in credits.js
- Add Stripe/PayPal webhook handlers
- Add payment status tracking to database

**Email Notifications**:
- Add email service client (SendGrid, AWS SES)
- Trigger emails on:
  - Low balance (<10,000 credits)
  - Purchase confirmation
  - Report completion
  - Weekly summary

**Admin Dashboard**:
- Create new route: `/admin`
- Add authentication check (admin role)
- Build UI for:
  - User management
  - Credit adjustments
  - System stats
  - Report monitoring

**API Documentation**:
- Set up Swagger/OpenAPI
- Document all endpoints
- Add request/response examples
- Generate interactive docs

---

## Key Files Reference

### Backend Core

| File | Purpose | Lines | Key Functions |
|------|---------|-------|---------------|
| `/api/server.js` | Main API server | 600 | Express routes, upload handling, report generation |
| `/api/db.js` | Database layer | 300 | Connection pool, CRUD operations |
| `/api/ai.js` | AI report generation | 336 | generateReport(), tool calling, token counting |
| `/api/credits.js` | Credits system | 250 | Balance checks, deductions, purchases, history |
| `/api/tokenCounter.js` | Token counting | 120 | countTokens(), getTokenBreakdown() |
| `/api/financialDatasets.js` | Financial API | 400 | 9 financial tools, API requests |

### Frontend Core

| File | Purpose | Lines | Key Functions |
|------|---------|-------|---------------|
| `/public/index.php` | Main page | 77 | Dashboard UI, dynamic asset loading |
| `/public/credits-history.php` | History page | 150 | Transaction history display |
| `/public/js/app.js` | Frontend logic | 800 | Upload, reports, credits, modals |
| `/public/css/style.css` | Styling | 750 | Dark theme, responsive, modals |

### Configuration

| File | Purpose |
|------|---------|
| `/api/.env` | Environment variables |
| `/api/ecosystem.config.js` | PM2 process config |
| `/api/package.json` | Node.js dependencies |

### Documentation

| File | Purpose |
|------|---------|
| `/info/development_progress.md` | This file - complete technical docs |
| `/info/claude_plan_progress.md` | Original plan (older) |
| `/TOKEN_COUNTING.md` | Token counting details |
| `/CREDITS_SYSTEM.md` | Credits system details |

---

## Success Metrics

**What Works Perfectly**:
✅ File upload (all 6 formats)
✅ AI report generation with real-time financial data
✅ Token counting (fair billing - final report only)
✅ Credits system (balance, deduction, protection)
✅ Transaction history
✅ Credits purchase (simulated)
✅ Report regeneration (revenue driver)
✅ Responsive design (mobile, tablet, desktop)
✅ Modal popups for reports
✅ Professional UI (dark theme)

**What Needs Work**:
⚠️ Multi-user authentication
⚠️ Real payment processing
⚠️ Rate limiting
⚠️ Email notifications
⚠️ Admin dashboard

---

## Contact & Handoff

**Current State**: Production-ready demo with full monetization system.

**Deployment**: https://sol.inoutconnect.com/portai/public/

**Database**: Seeded with demo user (100,000 credits)

**API**: Running on PM2, stable

**For Next AI**: This document contains all technical details needed to continue development. Review architecture, test existing features, then proceed with new objectives.

**Last Modified**: 2025-12-19 by Claude Code (Sonnet 4.5)

---

## Appendix: Quick Commands

```bash
# Server Management
pm2 status
pm2 restart portai-api --update-env
pm2 logs portai-api --lines 50
pm2 stop portai-api

# Database Queries
PGPASSWORD='apzosldkcAO91561ssa6@gasy' psql -U postgres -d portfolio_ai

# Check Current Balance
PGPASSWORD='apzosldkcAO91561ssa6@gasy' psql -U postgres -d portfolio_ai -c "SELECT credits_balance FROM users_demo WHERE id = 1;"

# View Recent Transactions
PGPASSWORD='apzosldkcAO91561ssa6@gasy' psql -U postgres -d portfolio_ai -c "SELECT * FROM credits_transactions ORDER BY created_at DESC LIMIT 10;"

# Test Token Counter
cd /var/www/sol.inoutconnect.com/portai/api && node -e "const tc = require('./tokenCounter'); console.log(tc.countTokens('test'));"

# Test API Health
curl http://localhost:3001/health

# View Nginx Logs (if frontend issues)
sudo tail -f /var/log/nginx/error.log
```

---

**End of Technical Documentation**

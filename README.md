# Portfolio AI - Simple Demo

**Clean, simple system for portfolio upload and AI analysis**

## Quick Start

### 1. Apply Nginx Configuration

```bash
# Copy the new config
sudo cp /var/www/sol.inoutconnect.com/portai/nginx-complete-config.conf /etc/nginx/sites-available/sol.inoutconnect.com

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 2. Start the API Server

```bash
cd /var/www/sol.inoutconnect.com/portai

# Using PM2 (recommended for production)
pm2 start ecosystem.config.js
pm2 save

# OR run directly for testing
cd api && node server.js
```

### 3. Access the Application

Open your browser and go to:
**https://sol.inoutconnect.com/portai/**

---

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Browser   │ ──────> │  Nginx:443   │ ──────> │  PHP-FPM     │
│             │         │              │         │  (Frontend)  │
└─────────────┘         └──────────────┘         └──────────────┘
                               │
                               │
                               v
                        ┌──────────────┐
                        │ Node.js:3001 │
                        │  (API)       │
                        └──────────────┘
                               │
                               v
                        ┌──────────────┐
                        │ PostgreSQL   │
                        └──────────────┘
```

- **Frontend**: PHP with dynamic JS/CSS loading
- **API**: Node.js Express server
- **Database**: PostgreSQL (existing `portfolio_ai` database)
- **AI**: OpenRouter API (DeepSeek V3 or similar)

---

## Features

### ✅ File Upload
- Supports: CSV, PDF, Excel (XLSX), JSON, Word (DOCX)
- Drag & drop or click to upload
- Automatic parsing and data extraction

### ✅ AI Report Generation
- Click "Generate Report" button
- AI analyzes portfolio data
- Provides insights, risk assessment, recommendations
- Tracks cost and token usage

### ✅ Portfolio Management
- View all uploaded portfolios
- See upload date and file type
- Access raw data or generated reports

---

## File Structure

```
portai/
├── api/                    # Node.js backend
│   ├── server.js          # Main server
│   ├── db.js              # Database operations
│   ├── upload.js          # File parsing
│   ├── ai.js              # AI integration
│   ├── package.json
│   └── .env               # Configuration
│
├── public/                 # Frontend (served by PHP)
│   ├── index.php          # Main page
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
│
├── uploads/                # Uploaded files
├── logs/                   # PM2 logs
├── test-samples/           # Sample files for testing
│
├── ecosystem.config.js     # PM2 configuration
├── README.md              # This file
└── info/
    └── TODO.md            # Development plan
```

---

## API Endpoints

### POST /api/upload
Upload portfolio file

**Request:**
- `multipart/form-data` with `file` field

**Response:**
```json
{
  "success": true,
  "portfolio": {
    "id": 1,
    "filename": "portfolio.csv",
    "fileType": "csv",
    "uploadedAt": "2025-12-18T14:30:00Z"
  }
}
```

### POST /api/generate-report
Generate AI report

**Request:**
```json
{
  "portfolioId": 1
}
```

**Response:**
```json
{
  "success": true,
  "report": {
    "id": 1,
    "content": "AI analysis...",
    "aiModel": "deepseek/deepseek-chat",
    "tokensUsed": 1500,
    "costUsd": 0.000405,
    "generatedAt": "2025-12-18T14:31:00Z"
  }
}
```

### GET /api/portfolios
List all portfolios

### GET /api/portfolio/:id
Get portfolio details with report

### DELETE /api/portfolio/:id
Delete portfolio

---

## Database Schema

### portfolios_simple
```sql
CREATE TABLE portfolios_simple (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    raw_data TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### reports_simple
```sql
CREATE TABLE reports_simple (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios_simple(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    ai_model VARCHAR(100),
    tokens_used INTEGER,
    cost_usd DECIMAL(10, 6),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Configuration

### Environment Variables (.env)

```bash
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=portfolio_ai
DB_USER=portfolio_user
DB_PASSWORD=your_password
OPENROUTER_API_KEY=your_api_key
AI_MODEL=deepseek/deepseek-chat
```

---

## Testing

### Test Files
Sample files are in `test-samples/`:
- `portfolio-sample.csv` - Sample CSV portfolio
- `portfolio-sample.json` - Sample JSON portfolio

### Manual Testing Steps

1. **Upload Test**
   - Go to https://sol.inoutconnect.com/portai/
   - Upload `test-samples/portfolio-sample.csv`
   - Verify file appears in portfolio list

2. **AI Report Test**
   - Click "Generate Report" on uploaded portfolio
   - Wait for AI processing (10-30 seconds)
   - Verify report appears with cost/tokens

3. **View Report**
   - Click "View Report"
   - Verify formatted AI analysis displays

---

## Troubleshooting

### API Server Not Running
```bash
# Check if server is running
pm2 list

# View logs
pm2 logs portai-api

# Restart server
pm2 restart portai-api
```

### Database Connection Error
```bash
# Test database connection
PGPASSWORD='your_password' psql -h localhost -U portfolio_user -d portfolio_ai -c "SELECT 1"

# Check if tables exist
PGPASSWORD='your_password' psql -h localhost -U portfolio_user -d portfolio_ai -c "\dt"
```

### File Upload Fails
- Check uploads directory permissions: `chmod 755 /var/www/sol.inoutconnect.com/portai/uploads`
- Check PHP upload limits in `php.ini`

### AI Report Generation Fails
- Verify OpenRouter API key is valid
- Check API server logs: `pm2 logs portai-api`
- Ensure model name is correct in `.env`

---

## Development

### For Other Developers

1. **Code is intentionally simple**
   - No frameworks, no complex abstractions
   - Flat file structure
   - Well-commented functions

2. **Adding New File Formats**
   - Edit `api/upload.js`
   - Add new parser function
   - Update `parseFile()` switch statement

3. **Modifying AI Prompts**
   - Edit `api/ai.js`
   - Update `buildPrompt()` function

4. **Changing UI**
   - CSS: `public/css/style.css`
   - JS: `public/js/app.js`
   - HTML: `public/index.php`

---

## Production Checklist

- [ ] Update `.env` with production API keys
- [ ] Set up SSL certificates (already done)
- [ ] Configure PM2 to start on boot: `pm2 startup`
- [ ] Set up log rotation for PM2
- [ ] Monitor API server resource usage
- [ ] Set AI spending limits if needed
- [ ] Back up database regularly
- [ ] Test file upload size limits

---

## Support

For issues or questions, check:
- `info/TODO.md` - Development plan and notes
- API logs: `logs/pm2-*.log`
- Nginx logs: `/var/log/nginx/ssl-sol.inoutconnect.com.*.log`

---

**Last Updated:** 2025-12-18
**Version:** 1.0.0
**Status:** Ready for Demo

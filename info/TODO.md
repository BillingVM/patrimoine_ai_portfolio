# Portfolio AI - Simple Demo TODO

**Goal:** Working demo for presentation tomorrow
**Focus:** AI reporting + Portfolio uploading ONLY
**No:** User accounts, roles, complex auth

---

## Architecture Overview

```
portai/
├── api/                    # Node.js Express server
│   ├── server.js          # Main server file
│   ├── upload.js          # File upload handler
│   ├── ai.js              # AI report generation
│   └── db.js              # Database connection
├── public/                 # Frontend files served by PHP
│   ├── index.php          # Main page (dynamic JS/CSS loading)
│   ├── css/
│   │   └── style.css      # App styles
│   └── js/
│       ├── app.js         # Main app logic
│       └── upload.js      # Upload handling
├── uploads/                # Uploaded portfolio files
└── info/
    └── TODO.md            # This file
```

---

## Database Schema (Simplified)

Using existing `portfolio_ai` database:

```sql
-- Simple portfolios table
CREATE TABLE IF NOT EXISTS portfolios_simple (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    raw_data TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Simple reports table
CREATE TABLE IF NOT EXISTS reports_simple (
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

## API Endpoints

### POST /api/upload
- Accepts: CSV, PDF, Excel, JSON, Word files
- Returns: `{ success: true, portfolioId: 123, filename: "..." }`
- Extracts data and stores in database

### POST /api/generate-report
- Body: `{ portfolioId: 123 }`
- Sends portfolio data to AI (OpenRouter/DeepSeek)
- Returns: `{ success: true, reportId: 456, content: "...", cost: 0.001 }`

### GET /api/portfolios
- Returns list of all uploaded portfolios

### GET /api/portfolio/:id
- Returns specific portfolio with its report (if generated)

---

## Implementation Checklist

### Phase 1: Backend Setup (API)
- [x] Create directory structure
- [ ] Initialize Node.js project (`package.json`)
- [ ] Install dependencies (express, multer, pg, xlsx, pdf-parse, mammoth)
- [ ] Create database tables
- [ ] Set up Express server with CORS
- [ ] Build file upload endpoint with multi-format support
- [ ] Integrate OpenRouter AI API
- [ ] Create AI report generation endpoint

### Phase 2: Frontend (PHP + JS)
- [ ] Create PHP index page with dynamic asset loading
- [ ] Build upload UI (drag-drop or file picker)
- [ ] Display uploaded portfolios list
- [ ] Add "Generate Report" button for each portfolio
- [ ] Display generated reports with formatting
- [ ] Add loading states and error handling

### Phase 3: Testing & Polish
- [ ] Test CSV upload → report generation
- [ ] Test PDF upload → report generation
- [ ] Test Excel upload → report generation
- [ ] Verify AI costs are tracked
- [ ] Add basic error messages
- [ ] Clean up UI styling

---

## Key Features for Demo

1. **Simple Upload**
   - Drag & drop or click to upload
   - Support multiple file formats
   - Show upload progress

2. **Portfolio List**
   - Display all uploaded portfolios
   - Show filename, date, and file type
   - Click to view details

3. **AI Report Generation**
   - "Generate Report" button
   - Loading spinner while AI processes
   - Display report with markdown formatting
   - Show cost and token usage

4. **Clean UI**
   - Dark theme (matches existing style)
   - Responsive design
   - Clear CTAs (Call-to-Actions)

---

## File Format Parsing

### CSV
- Expected columns: `Ticker, Quantity, Price` (or similar)
- Parse with simple split/map

### PDF
- Use `pdf-parse` library
- Extract text content
- Regex to find ticker symbols and values

### Excel (XLSX)
- Use `xlsx` library
- Read first sheet
- Find columns with ticker data

### JSON
- Direct parse
- Expected format: `[{ticker: "AAPL", quantity: 100, price: 150}]`

### Word (DOCX)
- Use `mammoth` library
- Extract text
- Parse similar to PDF

---

## AI Prompt Template

```
You are a financial portfolio analyzer. Analyze the following portfolio data and provide:

1. **Portfolio Overview**: Total value, number of holdings
2. **Asset Allocation**: Breakdown by sector/stock
3. **Risk Assessment**: Diversification analysis
4. **Key Insights**: Notable holdings, concentration risks
5. **Recommendations**: Suggestions for improvement (general, not financial advice)

Portfolio Data:
{portfolio_data}

Important: Include disclaimer that this is AI-generated analysis for informational purposes only, not financial advice.
```

---

## Environment Variables (.env)

```bash
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=portfolio_ai
DB_USER=portfolio_user
DB_PASSWORD=apzosldkcAO91561ssa6@gasy
OPENROUTER_API_KEY=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
AI_MODEL=deepseek/deepseek-chat
```

---

## Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1",
    "xlsx": "^0.18.5",
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.6.0",
    "csv-parser": "^3.0.0"
  }
}
```

---

## Nginx Configuration

```nginx
location /portai/ {
    alias /var/www/sol.inoutconnect.com/portai/public/;
    index index.php;
    try_files $uri $uri/ /portai/index.php?$args;

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $request_filename;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
    }
}

location /portai/api/ {
    proxy_pass http://localhost:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

---

## Timeline (Today)

- **Now - 2 hours**: Build backend (API + file parsing)
- **2-4 hours**: Build frontend (PHP + JS)
- **4-5 hours**: Integration testing
- **5-6 hours**: Polish & bug fixes
- **Evening**: Final testing with real data

---

## Notes for Other Developers

### Code Structure
- **Simple and flat**: All API code in `api/` folder, no complex modules
- **Well-commented**: Each function has clear comments
- **Error handling**: All endpoints have try-catch with clear error messages
- **No frameworks**: Plain Express, no heavy dependencies

### Adding New File Formats
1. Add parser in `upload.js` (see existing examples)
2. Update `parseFile()` function with new format
3. Test with sample file

### Modifying AI Prompt
- Edit `ai.js` → `generateReport()` function
- Change the system prompt template
- Adjust temperature/max_tokens if needed

### Database Changes
- All queries are in `db.js`
- Use parameterized queries (no SQL injection)
- Run migrations manually via psql

---

## Success Criteria

✅ User can upload CSV file with portfolio data
✅ User can see list of uploaded portfolios
✅ User can click "Generate Report" and see AI analysis
✅ Report shows cost and token usage
✅ System supports at least 3 file formats
✅ UI is clean and demo-ready

---

**Last Updated:** 2025-12-18
**Status:** In Progress

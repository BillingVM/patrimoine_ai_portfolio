Portfolio AI v1.1 → v1.5 Development Plan
Continuation from plan_v1.0 - Using Demo Account Foundation
Current State (v1.0 - WORKING)
✅ File upload (6 formats) + OCR
✅ AI report generation with real-time financial data
✅ Token-based billing (fair - final report only)
✅ Credits system (demo user: ID=1)
✅ Transaction history
✅ Responsive design
Next Phase Strategy
Preserve what works: Demo user system, existing billing, file processing
Add in layers: Clients → Portfolios → Enhanced AI → Automation
PHP role: Dynamic asset loading only (keep current system)
v1.1: Multi-Client Foundation (Week 1)
Goal: Add client layer on top of existing demo user
Database Changes
sql
Copy
-- Add to existing portfolio_ai database
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT 1, -- Demo user for now
    name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) DEFAULT 'individual',
    email VARCHAR(255),
    phone VARCHAR(50),
    total_aum NUMERIC(15,2) DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Modify existing tables
ALTER TABLE portfolios_simple ADD COLUMN client_id INTEGER REFERENCES clients(id);
ALTER TABLE portfolios_simple ADD COLUMN portfolio_name VARCHAR(255);
ALTER TABLE portfolios_simple ADD COLUMN sync_type VARCHAR(50) DEFAULT 'manual';
ALTER TABLE reports_simple ADD COLUMN report_type VARCHAR(50) DEFAULT 'analysis';

-- Add indexes
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_portfolios_client_id ON portfolios_simple(client_id);
Backend (Node.js)
New File: /api/routes/clients.js
JavaScript
Copy
// Keep existing server.js, add these endpoints:
GET    /api/clients                    // List clients for demo user
POST   /api/clients                    // Create client  
GET    /api/clients/:id                // Get client details
PUT    /api/clients/:id                // Update client
DELETE /api/clients/:id                // Delete client
GET    /api/clients/:id/summary        // AUM, portfolio count, risk
Modify: /api/db.js - Add client queries
Keep: All existing endpoints working as-is
Frontend (PHP + HTML)
New File: /public/clients.php
php
Copy
<?php
// Dynamic asset loading (keep existing system)
$cssVersion = file_exists(__DIR__ . '/css/style.css') ? filemtime(__DIR__ . '/css/style.css') : time();
$jsVersion = file_exists(__DIR__ . '/js/clients.js') ? filemtime(__DIR__ . '/js/clients.js') : time();
?>
<!DOCTYPE html>
<html>
<head>
    <title>Clients - Portfolio AI</title>
    <link rel="stylesheet" href="/portai/public/css/style.css?v=<?php echo $cssVersion; ?>">
</head>
<body>
    <!-- HTML content here - no PHP logic -->
    <div id="clients-app">
        <header>
            <h1>Clients</h1>
            <button id="add-client-btn">Add Client</button>
        </header>
        <div id="clients-list"></div>
    </div>
    <script src="/portai/public/js/clients.js?v=<?php echo $jsVersion; ?>"></script>
</body>
</html>
New File: /public/js/clients.js
JavaScript
Copy
// Vanilla JS - no frameworks
// Load clients, handle CRUD operations
// Reuse existing API patterns from app.js
Navigation Update
Modify: /public/index.php - Add clients link in header
Keep: Existing upload/report flow working
v1.2: Portfolio Management (Week 2)
Goal: Multiple portfolios per client, holdings tracking
Database Changes
sql
Copy
CREATE TABLE holdings (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios_simple(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    asset_name VARCHAR(255),
    asset_type VARCHAR(50), -- stock, crypto, etf, bond
    quantity NUMERIC(20, 8),
    avg_cost NUMERIC(20, 8),
    current_price NUMERIC(20, 8),
    current_value NUMERIC(20, 2),
    allocation_pct NUMERIC(5, 2),
    pnl_total NUMERIC(20, 2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update existing portfolios_simple to support multiple per client
-- (Already have client_id from v1.1)
Backend Extensions
Modify: /api/routes/clients.js - Add portfolio endpoints
JavaScript
Copy
GET    /api/clients/:clientId/portfolios    // List portfolios
POST   /api/clients/:clientId/portfolios    // Create portfolio  
GET    /api/portfolios/:id                  // Get portfolio + holdings
PUT    /api/portfolios/:id                  // Update portfolio
DELETE /api/portfolios/:id                  // Delete portfolio
POST   /api/portfolios/:id/holdings         // Add holding
PUT    /api/holdings/:id                    // Update holding
DELETE /api/holdings/:id                    // Delete holding
New: /api/services/portfolioService.js
Parse uploaded files into holdings
Calculate portfolio metrics
Reuse existing file processing logic
Frontend
New: /public/portfolio.php
php
Copy
<?php
// Same pattern - PHP for asset loading only
$cssVersion = file_exists(__DIR__ . '/css/style.css') ? filemtime(__DIR__ . '/css/style.css') : time();
$jsVersion = file_exists(__DIR__ . '/js/portfolio.js') ? filemtime(__DIR__ . '/js/portfolio.js') : time();
?>
<!-- Portfolio detail view with holdings table -->
Reuse: Existing file upload system
Path: /api/portfolios/:id/holdings/import (use current upload logic)
v1.3: Enhanced AI Reports (Week 3)
Goal: Context-aware reports with portfolio data
AI System Upgrade
Modify: /api/ai.js
JavaScript
Copy
// Add portfolio context to existing report generation
function buildPortfolioContext(portfolioId) {
    const portfolio = await db.getPortfolio(portfolioId);
    const holdings = await db.getHoldings(portfolioId);
    const client = await db.getClient(portfolio.client_id);
    
    return {
        clientName: client.name,
        portfolioName: portfolio.portfolio_name,
        totalValue: calculateTotalValue(holdings),
        holdings: holdings.map(h => ({
            symbol: h.symbol,
            allocation: h.allocation_pct,
            pnl: h.pnl_total,
            risk: h.risk_level || 'medium'
        }))
    };
}
Report Types
New endpoints:
JavaScript
Copy
POST /api/portfolios/:id/reports/analysis    // Current reports
POST /api/portfolios/:id/reports/risk        // Risk assessment  
POST /api/portfolios/:id/reports/performance // Performance review
POST /api/portfolios/:id/reports/tax         // Tax implications
Billing: Keep existing token counting, different rates per report type
Frontend Integration
Modify: /public/js/portfolio.js
Add report type selector
Show report history per portfolio
Keep existing modal display system
v1.4: AI Chat Interface (Week 4)
Goal: Conversational AI with portfolio context
Database
sql
Copy
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT 1,
    client_id INTEGER REFERENCES clients(id),
    portfolio_id INTEGER REFERENCES portfolios_simple(id),
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
Backend
New: /api/routes/chat.js
JavaScript
Copy
POST /api/conversations                      // New conversation
GET  /api/conversations                      // List conversations  
GET  /api/conversations/:id                  // Get messages
POST /api/conversations/:id/messages         // Send message
AI Integration: Extend existing OpenRouter integration
Billing: Count tokens per assistant response (keep fair billing)
Frontend
New: /public/chat.php
php
Copy
<?php
// PHP only for asset versioning
$cssVersion = filemtime(__DIR__ . '/css/style.css');
$jsVersion = filemtime(__DIR__ . '/js/chat.js');
?>
<!-- Chat interface HTML -->
Features:
Conversation list sidebar
Message bubbles (user/assistant)
Portfolio/client context selector
Token usage display
Suggested questions
v1.5: Automation Missions (Week 5)
Goal: Scheduled AI tasks with portfolio monitoring
Database
sql
Copy
CREATE TABLE missions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT 1,
    portfolio_id INTEGER REFERENCES portfolios_simple(id),
    name VARCHAR(255) NOT NULL,
    instructions TEXT NOT NULL,
    frequency VARCHAR(20), -- daily, weekly, monthly
    status VARCHAR(20) DEFAULT 'active',
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    total_tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mission_runs (
    id SERIAL PRIMARY KEY,
    mission_id INTEGER REFERENCES missions(id) ON DELETE CASCADE,
    status VARCHAR(20), -- success, failed
    result TEXT,
    tokens_used INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
Backend
New: /api/routes/missions.js
JavaScript
Copy
GET  /api/missions                      // List missions
POST /api/missions                      // Create mission
GET  /api/missions/:id                  // Get mission
PUT  /api/missions/:id                  // Update mission
POST /api/missions/:id/run              // Manual trigger
GET  /api/missions/:id/runs             // Run history
New: /api/services/missionRunner.js
Schedule missions using node-cron
Execute AI instructions
Handle billing per run
Email results (future feature)
Frontend
New: /public/missions.php
Mission templates (daily recap, risk alerts, etc.)
Mission creation interface
Execution history
Status monitoring
File Structure (Progressive)
Copy
/var/www/sol.inoutconnect.com/portai/
├── api/
│   ├── server.js                 // Keep existing + new routes
│   ├── db.js                     // Extended queries
│   ├── ai.js                     // Enhanced with context
│   ├── routes/                   // NEW - organized endpoints
│   │   ├── clients.js
│   │   ├── chat.js
│   │   └── missions.js
│   └── services/                 // NEW - business logic
│       ├── portfolioService.js
│       └── missionRunner.js
│
├── public/
│   ├── index.php                 // Modified - add navigation
│   ├── clients.php               // NEW
│   ├── portfolio.php             // NEW  
│   ├── chat.php                  // NEW
│   ├── missions.php              // NEW
│   └── js/
│       ├── clients.js            // NEW
│       ├── portfolio.js          // NEW
│       ├── chat.js               // NEW
│       └── missions.js           // NEW
Key Principles
Keep existing system working - All v1.0 functionality remains
Demo user foundation - user_id = 1 throughout system
PHP for assets only - No business logic in PHP
Progressive enhancement - Each version builds on previous
Reuse existing patterns - File upload, token counting, billing
Future Login System (Documented)
sql
Copy
-- When ready for multi-user:
ALTER TABLE clients ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE portfolios_simple ALTER COLUMN user_id DROP DEFAULT;
-- Add user registration/login endpoints
-- Add JWT middleware to existing routes
This plan maintains your velocity advantage while building toward the full client vision.

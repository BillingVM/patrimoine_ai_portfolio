SUPER PROMPT FOR CLAUDE CODE: Portfolio AI Analyzer Platform (v2.0 — Red Team Hardened)
CRITICAL CONSTRAINT: No AWS services permitted. All AWS references (Textract, S3, SDK) replaced with self-hosted or alternative cloud providers.
🎯 PROJECT OVERVIEW
Build a secure, compliant AI-powered portfolio analysis SaaS platform for trading brokerages (agencies) to white-label and resell. Core requirements: document upload, OCR extraction, AI analysis, real-time market data, multi-role RBAC with tenant isolation.
COMPLIANCE WARNING: This platform handles financial data and provides AI-generated investment analysis. Requires legal review for SEC/FINRA regulations, GDPR/CCPA compliance, and disclaimers. Budget $5,000-$10,000 for legal counsel before production launch.
🏗️ TECHNICAL STACK (Revised)
Backend
Runtime: Node.js v20+ with TypeScript 5.3+
Framework: NestJS (modular, built-in validation, better than Express)
Database: PostgreSQL 16+ with Row-Level Security (RLS) enabled
Cache/Queue: Redis 7+ Cluster (3 masters + 3 replicas)
Job Queue: BullMQ (successor to Bull, more reliable)
API Documentation: Swagger/OpenAPI
Frontend
Framework: Vue 3.4+ with TypeScript + Vite
State Management: Pinia
Router: Vue Router 4
Charts: Vue ChartJS wrapper
File Upload: Vue Dropzone + tus-js-client (resumable uploads)
Styling: Tailwind CSS 3.4
External Services (No AWS)
AI: OpenRouter API (DeepSeek V3) + fallback to Anthropic Claude 3 Haiku
OCR: Tesseract.js (self-hosted) + Google Cloud Vision API (backup)
Market Data: Financial Datasets API (requires enterprise tier for redistribution)
Email: SendGrid (or Resend.com)
Telegram: Telegram Bot API
SMS: Twilio (optional)
Storage: MinIO (S3-compatible, self-hosted) or direct disk storage with backups
Authentication: Clerk.com (or Auth0) – do NOT build your own auth
DevOps
Reverse Proxy: Nginx (proxy only, not serving static files)
Containerization: Docker + Docker Compose (dev) → Kubernetes (prod)
Monitoring: Datadog APM + Sentry (error tracking)
Logging: Winston → Loki (or CloudWatch if using GCP)
CI/CD: GitHub Actions
📁 PROJECT STRUCTURE (Updated)
Copy
portfolio-ai/
├── docker-compose.yml
├── Dockerfile.app
├── Dockerfile.worker
├── Dockerfile.nginx
├── .env.example
├── .gitignore
├── package.json
├── README.md
│
├── kubernetes/
│   ├── deployment-app.yml
│   ├── deployment-worker.yml
│   ├── configmap.yml
│   └── ingress.yml
│
├── server/
│   ├── src/
│   │   ├── main.ts                    # NestJS bootstrap
│   │   ├── app.module.ts              # Root module
│   │   │
│   │   ├── config/
│   │   │   ├── database.config.ts     # PostgreSQL + TypeORM
│   │   │   ├── redis.config.ts        # Redis Cluster
│   │   │   ├── bullmq.config.ts       # Queue config
│   │   │   └── constants.ts           # App constants
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts     # Clerk JWT verification
│   │   │   ├── ownership.guard.ts     # Resource ownership verification
│   │   │   ├── role.guard.ts          # RBAC enforcement
│   │   │   ├── rate-limit.guard.ts    # Per-customer rate limits
│   │   │   └── compliance.guard.ts    # Audit logging
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.service.ts    # Clerk integration
│   │   │   │   └── auth.controller.ts
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── users.entity.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── users.controller.ts
│   │   │   │
│   │   │   ├── agencies/
│   │   │   │   ├── agencies.entity.ts
│   │   │   │   ├── agencies.service.ts
│   │   │   │   └── agencies.controller.ts
│   │   │   │
│   │   │   ├── customers/
│   │   │   │   ├── customers.entity.ts
│   │   │   │   ├── customers.service.ts
│   │   │   │   └── customers.controller.ts
│   │   │   │
│   │   │   ├── portfolios/
│   │   │   │   ├── portfolios.entity.ts
│   │   │   │   ├── portfolios.service.ts
│   │   │   │   └── portfolios.controller.ts
│   │   │   │
│   │   │   ├── holdings/
│   │   │   │   ├── holdings.entity.ts
│   │   │   │   ├── holdings.service.ts
│   │   │   │   └── holdings.controller.ts
│   │   │   │
│   │   │   ├── prompts/
│   │   │   │   ├── prompts.entity.ts
│   │   │   │   ├── prompts.service.ts
│   │   │   │   └── prompts.controller.ts
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── reports.entity.ts
│   │   │   │   ├── reports.service.ts
│   │   │   │   └── reports.controller.ts
│   │   │   │
│   │   │   ├── billing/
│   │   │   │   ├── invoices.entity.ts
│   │   │   │   ├── billing.service.ts
│   │   │   │   └── billing.controller.ts
│   │   │   │
│   │   │   └── notifications/
│   │   │       ├── notifications.entity.ts
│   │   │       ├── notifications.service.ts
│   │   │       └── notifications.controller.ts
│   │   │
│   │   ├── services/
│   │   │   ├── ocr.service.ts         # Tesseract.js integration
│   │   │   ├── ai.service.ts          # OpenRouter + Claude
│   │   │   ├── financial.service.ts   # Market data API
│   │   │   ├── ticker.service.ts      # Normalization service
│   │   │   ├── report.service.ts      # PDF generation
│   │   │   ├── notification.service.ts # Multi-channel
│   │   │   ├── billing.service.ts     # Cost tracking
│   │   │   ├── minio.service.ts       # File storage
│   │   │   └── cache.service.ts       # Redis operations
│   │   │
│   │   ├── workers/
│   │   │   ├── ocr.processor.ts       # OCR queue processor
│   │   │   ├── price-update.processor.ts # Price sync
│   │   │   ├── report.processor.ts    # Report generation
│   │   │   └── notification.processor.ts # Notification sending
│   │   │
│   │   ├── utils/
│   │   │   ├── validation schemas.ts  # Zod schemas
│   │   │   ├── encryption.ts          # Encrypt PII
│   │   │   ├── logger.ts              # Winston setup
│   │   │   └── exceptions/            # Custom exceptions
│   │   │
│   │   └── database/
│   │       ├── migrations/            # TypeORM migrations
│   │       └── seeds/                 # Test data
│   │
│   └── test/
│       ├── unit/
│       ├── integration/
│       └── e2e/
│
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   │
│   ├── src/
│   │   ├── main.ts                    # Vue app entry
│   │   ├── App.vue
│   │   ├── router/
│   │   │   └── index.ts               # Route guards
│   │   │
│   │   ├── stores/
│   │   │   ├── auth.ts                # Clerk + Pinia
│   │   │   ├── portfolios.ts
│   │   │   └── settings.ts
│   │   │
│   │   ├── views/
│   │   │   ├── admin/
│   │   │   ├── agency/
│   │   │   └── customer/
│   │   │
│   │   ├── components/
│   │   │   ├── PortfolioUpload.vue
│   │   │   ├── AIChat.vue
│   │   │   ├── HoldingsTable.vue
│   │   │   └── DataQualityIndicator.vue # Show OCR confidence
│   │   │
│   │   ├── composables/
│   │   │   ├── useRateLimit.ts        # Client-side rate limit tracking
│   │   │   └── useCostCalculator.ts   # Show AI cost in real-time
│   │   │
│   │   └── utils/
│   │       ├── api.ts                 # Axios instance
│   │       └── validators.ts          # Zod schemas
│   │
│   └── public/
│       └── uploads/                   # Temp upload directory
│
└── storage/
    ├── documents/                     # MinIO or disk storage
    ├── reports/                       # Generated PDFs
    ├── ocr-raw/                     # Raw OCR output for reprocessing
    └── backups/                     # Encrypted daily backups
🗄️ DATABASE SCHEMA (with RLS & Security)
Enable RLS on All Tables
sql
Copy
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
1. users table (Clerk-managed, sync only)
sql
Copy
CREATE TABLE users (
    id UUID PRIMARY KEY, -- Clerk user ID
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'agency', 'customer')),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RLS: Users can only see their own record (except super_admins)
CREATE POLICY users_isolation ON users FOR ALL
    USING (role = 'super_admin' OR id = current_setting('app.current_user_id')::UUID);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
2. agencies table
sql
Copy
CREATE TABLE agencies (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    company_name VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) NOT NULL DEFAULT 'starter'
        CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
    
    -- Billing configuration (immutable, set by super_admin)
    monthly_base_fee DECIMAL(10, 2) NOT NULL DEFAULT 99.00,
    per_customer_fee DECIMAL(10, 2) NOT NULL DEFAULT 2.00,
    ppp_discount_percent INTEGER NOT NULL DEFAULT 30,
    revenue_share_percent INTEGER NOT NULL DEFAULT 20,
    
    -- Spending caps (critical for cost control)
    monthly_ai_spend_cap DECIMAL(10, 2) DEFAULT 500.00,
    current_month_ai_spend DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Customer limits
    max_customers INTEGER NOT NULL DEFAULT 50,
    current_customer_count INTEGER NOT NULL DEFAULT 0 CHECK (current_customer_count >= 0),
    
    -- White-label config (validated JSON)
    branding_config JSONB DEFAULT '{}' 
        CHECK (jsonb_typeof(branding_config) = 'object'),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RLS: Agencies can only see their own record
CREATE POLICY agencies_isolation ON agencies FOR ALL
    USING (user_id = current_setting('app.current_user_id')::UUID OR 
           current_setting('app.current_user_role') = 'super_admin');

CREATE INDEX idx_agencies_user_id ON agencies(user_id);
CREATE INDEX idx_agencies_tier ON agencies(subscription_tier);
3. customers table
sql
Copy
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agency_id INTEGER REFERENCES agencies(id) ON DELETE SET NULL,
    
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    
    -- PII fields (encrypted at rest)
    encrypted_ssn VARCHAR(255), -- If required for compliance
    encryption_key_id VARCHAR(100), -- KMS key reference
    
    -- Notification settings
    telegram_chat_id VARCHAR(100),
    notification_email BOOLEAN NOT NULL DEFAULT TRUE,
    notification_telegram BOOLEAN NOT NULL DEFAULT FALSE,
    notification_sms BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Preferences
    risk_tolerance VARCHAR(50) CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    investment_goals TEXT,
    
    -- Auto-update settings (premium)
    auto_update_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    update_frequency_hours INTEGER NOT NULL DEFAULT 6 CHECK (update_frequency_hours >= 1),
    
    -- AI usage tracking (real-time)
    total_prompts_used INTEGER NOT NULL DEFAULT 0,
    total_tokens_used INTEGER NOT NULL DEFAULT 0,
    total_ai_spend DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Data retention (GDPR/CCPA)
    data_retention_days INTEGER DEFAULT 2555, -- 7 years default
    data_deleted_at TIMESTAMP, -- When data was hard-deleted
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- RLS: Customers see own data; Agencies see their customers; Super admins see all
CREATE POLICY customers_isolation ON customers FOR ALL
    USING (
        id = current_setting('app.current_customer_id')::INTEGER OR
        (agency_id IS NOT NULL AND agency_id = current_setting('app.current_agency_id')::INTEGER) OR
        current_setting('app.current_user_role') = 'super_admin'
    );

CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_agency_id ON customers(agency_id);
CREATE INDEX idx_customers_created_at ON customers(created_at);
4. portfolios table
sql
Copy
CREATE TABLE portfolios (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    
    -- File metadata
    original_filename VARCHAR(255) NOT NULL,
    stored_filename UUID NOT NULL UNIQUE, -- UUIDv4 for security
    storage_path VARCHAR(500) NOT NULL, -- MinIO path or disk path
    
    -- Entity info
    entity_name VARCHAR(255) NOT NULL, -- Broker/fund name
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('broker', 'hedge_fund', 'bank', 'other')),
    
    -- OCR processing
    ocr_status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed', 'needs_review')),
    ocr_confidence_score DECIMAL(3, 2), -- 0.00 to 1.00
    ocr_error TEXT,
    extracted_data JSONB, -- Raw OCR output
    
    -- Compliance
    contains_pii BOOLEAN DEFAULT FALSE,
    pii_detected_at TIMESTAMP,
    
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- RLS: Strict tenant isolation
CREATE POLICY portfolios_isolation ON portfolios FOR ALL
    USING (
        customer_id = current_setting('app.current_customer_id')::INTEGER OR
        (customer_id IN (
            SELECT id FROM customers WHERE agency_id = current_setting('app.current_agency_id')::INTEGER
        )) OR
        current_setting('app.current_user_role') = 'super_admin'
    );

CREATE INDEX idx_portfolios_customer_id ON portfolios(customer_id);
CREATE INDEX idx_portfolios_status ON portfolios(ocr_status);
CREATE INDEX idx_portfolios_uploaded_at ON portfolios(uploaded_at);
5. holdings table
sql
Copy
CREATE TABLE holdings (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Stock info (normalized)
    ticker VARCHAR(20) NOT NULL,
    company_name VARCHAR(255),
    asset_type VARCHAR(50) NOT NULL DEFAULT 'stock'
        CHECK (asset_type IN ('stock', 'etf', 'bond', 'option', 'crypto')),
    
    -- Position details
    quantity DECIMAL(15, 4) NOT NULL,
    purchase_price DECIMAL(15, 4),
    current_price DECIMAL(15, 4),
    total_value DECIMAL(15, 2),
    gain_loss DECIMAL(15, 2),
    gain_loss_percent DECIMAL(10, 4),
    
    -- Metadata
    sector VARCHAR(100),
    industry VARCHAR(100),
    
    -- Timestamps
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    price_updated_at TIMESTAMP,
    
    UNIQUE(portfolio_id, ticker)
);

-- RLS
CREATE POLICY holdings_isolation ON holdings FOR ALL
    USING (
        customer_id = current_setting('app.current_customer_id')::INTEGER OR
        (customer_id IN (
            SELECT id FROM customers WHERE agency_id = current_setting('app.current_agency_id')::INTEGER
        )) OR
        current_setting('app.current_user_role') = 'super_admin'
    );

CREATE INDEX idx_holdings_customer_id ON holdings(customer_id);
CREATE INDEX idx_holdings_ticker ON holdings(ticker);
CREATE INDEX idx_holdings_portfolio_id ON holdings(portfolio_id);
CREATE INDEX idx_holdings_price_updated_at ON holdings(price_updated_at);
6. prompts table (Partitioned by month)
sql
Copy
CREATE TABLE prompts (
    id BIGSERIAL,
    customer_id INTEGER NOT NULL,
    agency_id INTEGER,
    
    -- Prompt content
    prompt_text TEXT NOT NULL,
    response_text TEXT,
    
    -- Token tracking (OpenRouter format)
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    
    -- Cost tracking (actual rates)
    input_cost_usd DECIMAL(10, 6) NOT NULL,
    output_cost_usd DECIMAL(10, 6) NOT NULL,
    total_cost_usd DECIMAL(10, 6) NOT NULL,
    
    -- Context
    portfolio_ids INTEGER[], -- Simplified; use JSON for junction table alternative
    
    report_id INTEGER REFERENCES reports(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, created_at) -- Partition key
) PARTITION BY RANGE (created_at);

-- Create monthly partitions automatically via script
CREATE POLICY prompts_isolation ON prompts FOR ALL
    USING (
        customer_id = current_setting('app.current_customer_id')::INTEGER OR
        agency_id = current_setting('app.current_agency_id')::INTEGER OR
        current_setting('app.current_user_role') = 'super_admin'
    );

CREATE INDEX idx_prompts_customer_id ON prompts(customer_id);
CREATE INDEX idx_prompts_agency_id ON prompts(agency_id);
CREATE INDEX idx_prompts_created_at ON prompts(created_at);
7. reports table
sql
Copy
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    
    report_type VARCHAR(50) NOT NULL 
        CHECK (report_type IN ('global', 'per_entity', 'custom')),
    
    -- Content
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    risk_assessment TEXT,
    recommendations TEXT,
    diversification_score DECIMAL(4, 2) CHECK (diversification_score BETWEEN 0 AND 10),
    
    -- Data snapshot
    total_portfolio_value DECIMAL(15, 2),
    total_holdings INTEGER,
    sectors JSONB,
    
    -- Entity-specific
    entity_name VARCHAR(255),
    
    -- File export
    pdf_path VARCHAR(500),
    
    -- AI metadata
    ai_model_used VARCHAR(100),
    tokens_used INTEGER,
    cost_usd DECIMAL(10, 6),
    
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE POLICY reports_isolation ON reports FOR ALL
    USING (
        customer_id = current_setting('app.current_customer_id')::INTEGER OR
        (customer_id IN (
            SELECT id FROM customers WHERE agency_id = current_setting('app.current_agency_id')::INTEGER
        )) OR
        current_setting('app.current_user_role') = 'super_admin'
    );

CREATE INDEX idx_reports_customer_id ON reports(customer_id);
CREATE INDEX idx_reports_generated_at ON reports(generated_at);
8. invoice table
sql
Copy
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    agency_id INTEGER REFERENCES agencies(id) ON DELETE CASCADE,
    customer_id INTEGER, -- NULL for agency invoices
    
    invoice_type VARCHAR(50) NOT NULL
        CHECK (invoice_type IN ('agency_monthly', 'customer_ppp')),
    
    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Amounts
    base_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    usage_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Payment
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    paid_at TIMESTAMP,
    
    -- Line items (JSON for flexibility)
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE POLICY invoices_isolation ON invoices FOR ALL
    USING (
        agency_id = current_setting('app.current_agency_id')::INTEGER OR
        customer_id = current_setting('app.current_customer_id')::INTEGER OR
        current_setting('app.current_user_role') = 'super_admin'
    );

CREATE INDEX idx_invoices_agency_id ON invoices(agency_id);
CREATE INDEX idx_invoices_status ON invoices(status);
🔐 RBAC with Ownership Enforcement
Role Hierarchy
TypeScript
Copy
enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  AGENCY = 'agency',
  CUSTOMER = 'customer'
}

// Permissions map with ownership requirement
const PERMISSIONS = {
  'users.view': [Role.SUPER_ADMIN],
  'users.create': [Role.SUPER_ADMIN],
  
  'agencies.view_all': [Role.SUPER_ADMIN, Role.ADMIN],
  'agencies.view_own': [Role.AGENCY],
  'agencies.edit_own': [Role.AGENCY],
  
  'customers.view_all': [Role.SUPER_ADMIN, Role.ADMIN],
  'customers.view_agency': [Role.AGENCY], // Requires ownership check
  'customers.view_own': [Role.CUSTOMER],
  'customers.create': [Role.AGENCY, Role.SUPER_ADMIN],
  
  'portfolios.view_own': [Role.CUSTOMER],
  'portfolios.view_agency': [Role.AGENCY], // Requires ownership check
  'portfolios.upload': [Role.CUSTOMER],
  'portfolios.delete': [Role.CUSTOMER],
  
  'billing.view_own': [Role.CUSTOMER],
  'billing.view_agency': [Role.AGENCY],
  'billing.view_all': [Role.SUPER_ADMIN, Role.ADMIN],
  
  'settings.system': [Role.SUPER_ADMIN],
  'settings.agency': [Role.AGENCY],
  'settings.customer': [Role.CUSTOMER],
};
NestJS Guards Implementation
TypeScript
Copy
// server/src/guards/ownership.guard.ts
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // From Clerk JWT
    const resourceId = request.params.id;
    const resourceType = this.reflector.get<string>('resourceType', context.getHandler());

    // Set session variables for RLS
    await this.db.query('SELECT set_config($1, $2, true)', [
      'app.current_user_id',
      user.id
    ]);
    await this.db.query('SELECT set_config($1, $2, true)', [
      'app.current_user_role',
      user.role
    ]);

    // Perform explicit ownership check
    if (user.role === 'agency') {
      const ownsResource = await this.checkAgencyOwnership(user.id, resourceType, resourceId);
      if (!ownsResource) throw new ForbiddenException('Resource does not belong to your agency.');
    }

    if (user.role === 'customer') {
      const ownsResource = await this.checkCustomerOwnership(user.id, resourceType, resourceId);
      if (!ownsResource) throw new ForbiddenException('You do not own this resource.');
    }

    return true;
  }
}
🚀 PHASED IMPLEMENTATION PLAN (Realistic)
Phase 1: MVP — Single Tenant Core (Months 1-2)
Goal: One agency, manual CSV upload, basic AI, no OCR
Week 1-2: Foundation & Auth
[ ] Set up NestJS + TypeScript monorepo
[ ] Configure PostgreSQL with RLS enabled
[ ] Integrate Clerk.com for authentication (DO NOT BUILD YOUR OWN)
[ ] Create users, agencies, customers tables with RLS policies
[ ] Implement ownership guards and role-based access
[ ] Add audit logging middleware (every data access logged)
Week 3-4: Core CRUD
[ ] Build Vue 3 + TypeScript frontend with Pinia
[ ] Create agency dashboard (manage own customers)
[ ] Create customer dashboard (view-only)
[ ] Implement CSV upload for holdings (manual format)
[ ] Build holdings table view with sorting/filtering
Week 5-6: AI Integration
[ ] Integrate OpenRouter API with DeepSeek V3
[ ] Implement prompt cost tracking (per-customer spend)
[ ] Build basic AI chat interface
[ ] Create global portfolio report generation
[ ] Add rate limiting: 5 requests/minute per customer
[ ] Add cost caps: $50/month per customer default
Week 7-8: Billing & Polish
[ ] Implement monthly invoice generation (cron job)
[ ] Stripe integration for payments
[ ] Add spending limit alerts (80%, 90%, 100%)
[ ] Basic error handling and loading states
[ ] Unit tests for services (80% coverage target)
Phase 1 Deliverable: Working platform for ONE agency with up to 10 customers. No OCR, no white-labeling, no auto-updates. Manual CSV only.
Phase 2: Multi-Tenant & OCR (Months 3-4)
Goal: Multiple agencies, automated document processing, white-labeling
Week 9-10: Multi-Tenant Isolation
[ ] Test and validate RLS policies with multiple agencies
[ ] Build super_admin panel for agency management
[ ] Add per-agency spending caps and customer limits
[ ] Implement agency signup flow (with Stripe checkout)
Week 11-12: OCR Pipeline
[ ] Set up Tesseract.js with English + number training data
[ ] Build OCR worker service (separate Docker container)
[ ] Implement PDF → Image conversion (pdf2pic)
[ ] Create OCR confidence scoring (0-1.0)
[ ] Build "Needs Review" UI for low-confidence extractions (< 0.85)
[ ] Add human-in-the-loop review queue
Week 13-14: Ticker Normalization
[ ] Build fuzzy matching service for ticker symbols
[ ] Integrate Financial Datasets API for ticker validation
[ ] Create manual ticker override UI
[ ] Add sector/industry enrichment from API
[ ] Cache ticker details in Redis (24h TTL)
Week 15-16: White-Labeling
[ ] Add branding_config JSON to agencies table
[ ] Build logo upload (MinIO storage)
[ ] Implement dynamic CSS generation (primary/secondary colors)
[ ] Create custom domain setup instructions (CNAME to your app)
[ ] Test white-labeling with 2 test agencies
Phase 2 Deliverable: Multi-tenant platform with OCR (70% auto-extract), white-labeling basics, and human review UI.
Phase 3: Automation & Compliance (Months 5-6)
Goal: Auto-updates, notifications, GDPR compliance, security hardening
Week 17-18: Real-Time Updates
[ ] Build price update worker (every 6 hours)
[ ] Implement batch price fetching (500 tickers/request)
[ ] Add Redis caching for prices (1h TTL)
[ ] Create "auto-update" premium feature flag
[ ] Generate updated reports automatically for subscribed customers
Week 19-20: Notification System
[ ] Integrate SendGrid with templates
[ ] Build Telegram bot connection flow
[ ] Implement notification preferences UI
[ ] Add queue for async notifications
[ ] Create "Report Ready" and "Portfolio Processed" email templates
Week 21-22: GDPR & CCPA Compliance
[ ] Build "Export My Data" feature (JSON/CSV)
[ ] Implement "Delete My Account" with hard delete logic
[ ] Add data retention cron job (delete after retention_days)
[ ] Create audit log viewer for compliance officer
[ ] Add PII detection and redaction in OCR output
Week 23-24: Security Hardening
[ ] Penetration testing (hire external firm, $3k-$5k)
[ ] Implement SQL injection test suite
[ ] Add XSS prevention headers (helmet)
[ ] Create API rate limiting per IP and per user
[ ] Set up Sentry for error tracking
Phase 3 Deliverable: Production-ready platform with compliance features, auto-updates, and security audit passed.
Phase 4: Scale & Optimize (Months 7-8)
Goal: Performance, monitoring, DevOps maturity
Week 25-26: Database Optimization
[ ] Partition prompts table by month (automated script)
[ ] Create materialized views for analytics dashboards
[ ] Add read replicas for reporting queries
[ ] Implement pgBouncer for connection pooling
[ ] Optimize slow queries (add composite indexes)
Week 27-28: Caching Strategy
[ ] Implement Redis Cluster (3 master + 3 replica)
[ ] Add cache warming for popular tickers
[ ] Build cache invalidation strategy for holdings
[ ] Use Redis for session storage (instead of JWT alone)
Week 29-30: Monitoring & Alerting
[ ] Set up Datadog APM for performance monitoring
[ ] Create alerting rules (error rate >5%, latency >2s, disk >80%)
[ ] Build status page (status.portfolioai.com)
[ ] Add structured logging with correlation IDs
Week 31-32: K8s Deployment
[ ] Migrate from Docker Compose to Kubernetes
[ ] Set up Helm charts for each service
[ ] Implement blue-green deployments
[ ] Add Horizontal Pod Autoscaler (HPA) for app and workers
Phase 4 Deliverable: Platform handling 100+ agencies, 10k+ customers with 99.9% uptime SLA.
🔧 OCR PIPELINE (Tesseract.js Alternative)
TypeScript
Copy
// server/src/services/ocr.service.ts
import { createWorker } from 'tesseract.js';
import pdf from 'pdf-parse';
import { fromPath } from 'pdf2pic';

export class OCRService {
  private worker: Tesseract.Worker;

  async initialize() {
    this.worker = await createWorker('eng', 1, {
      cacheMethod: 'none',
      gzip: false,
    });
    await this.worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.$,',
      preserve_interword_spaces: '1',
    });
  }

  async processPDF(filePath: string, customerId: number): Promise<OCRResult> {
    const result: OCRResult = {
      status: 'processing',
      confidence: 0,
      extractedData: [],
      error: null,
    };

    try {
      // Convert PDF pages to images
      const pages = await this.convertPdfToImages(filePath);
      
      for (const page of pages) {
        const pageResult = await this.worker.recognize(page.path);
        
        // Extract holdings using regex patterns
        const extractions = this.extractHoldingsFromText(pageResult.data.text);
        
        result.extractedData.push(...extractions);
        
        // Calculate average confidence
        const pageConfidence = pageResult.data.confidence / 100;
        result.confidence = (result.confidence + pageConfidence) / 2;
        
        // Clean up temp image
        await fs.unlink(page.path);
      }

      // Determine status based on confidence
      if (result.confidence >= 0.85) {
        result.status = 'completed';
      } else if (result.confidence >= 0.70) {
        result.status = 'needs_review';
      } else {
        result.status = 'failed';
        result.error = 'OCR confidence too low';
      }

    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
    }

    return result;
  }

  private extractHoldingsFromText(text: string): ExtractedHolding[] {
    // Example patterns for broker statements
    const patterns = [
      // "AAPL 100 $150.00 $15,000.00"
      /([A-Z]{1,5})\s+([\d,.]+)\s+[$]([\d,.]+)\s+[$]([\d,.]+)/g,
      // "Apple Inc. (AAPL) 100 150.00"
      /([A-Za-z\s.]+)\s+\(([A-Z]{1,5})\)\s+([\d,.]+)\s+[$]?([\d,.]+)/g,
    ];

    const holdings = [];
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        holdings.push({
          ticker: match[1],
          quantity: parseFloat(match[2]),
          price: parseFloat(match[3]),
          confidence: 0.85, // Pattern-based extraction
        });
      }
    }
    return holdings;
  }
}
OCR Confidence UI:
vue
Copy
<!-- Frontend component to show OCR quality -->
<template>
  <div class="data-quality-indicator">
    <span v-if="confidence >= 0.85" class="text-green-600">
      ✅ Auto-extracted ({{ (confidence * 100).toFixed(0) }}% confidence)
    </span>
    <span v-else-if="confidence >= 0.70" class="text-yellow-600">
      ⚠️ Needs Review ({{ (confidence * 100).toFixed(0) }}% confidence)
    </span>
    <span v-else class="text-red-600">
      ❌ Manual Entry Required
    </span>
  </div>
</template>
🤖 AI ENGINE (Cost-Controlled)
TypeScript
Copy
// server/src/services/ai.service.ts
export class AIService {
  private readonly OPENROUTER_API_KEY: string;
  private readonly MODEL = 'deepseek/deepseek-chat';
  private readonly FALLBACK_MODEL = 'anthropic/claude-3-haiku';
  
  // Accurate pricing (as of March 2024)
  private readonly PRICING = {
    INPUT: 0.50 / 1_000_000,  // $0.50 per 1M input tokens
    OUTPUT: 0.50 / 1_000_000, // $0.50 per 1M output tokens
    MAX_TOKENS_PER_PROMPT: 8192,
    MAX_COST_PER_CUSTOMER: 50.00, // Monthly cap
  };

  async analyzePortfolio(
    customerId: number,
    prompt: string,
    portfolioIds: number[] = []
  ): Promise<AIResponse> {
    // 1. Check customer spend cap
    const customer = await this.customersRepository.findOne(customerId);
    if (customer.current_month_ai_spend >= customer.monthly_ai_spend_cap) {
      throw new ForbiddenException('Monthly AI spend limit reached. Contact support to increase.');
    }

    // 2. Fetch holdings (with RLS)
    const holdings = await this.holdingsRepository.find({
      where: { customer_id: customerId },
      take: 100, // Limit context size
    });

    // 3. Build context
    const context = this.buildPortfolioContext(holdings);
    const fullPrompt = `${context}\n\nUser Question: ${prompt}`;

    // 4. Check token count (rough estimate)
    const tokenCount = this.estimateTokens(fullPrompt);
    if (tokenCount > this.PRICING.MAX_TOKENS_PER_PROMPT) {
      throw new BadRequestException(`Prompt too large (${tokenCount} tokens). Max: ${this.PRICING.MAX_TOKENS_PER_PROMPT}`);
    }

    // 5. Call OpenRouter
    const startTime = Date.now();
    let response: OpenRouterResponse;
    
    try {
      response = await this.callOpenRouter(fullPrompt);
    } catch (error) {
      // Fallback to Claude on failure
      console.warn('OpenRouter failed, using fallback:', error.message);
      response = await this.callClaudeFallback(fullPrompt);
    }

    // 6. Calculate cost
    const inputCost = response.usage.prompt_tokens * this.PRICING.INPUT;
    const outputCost = response.usage.completion_tokens * this.PRICING.OUTPUT;
    const totalCost = inputCost + outputCost;

    // 7. Track prompt with cost
    await this.promptsRepository.save({
      customer_id: customerId,
      agency_id: customer.agency_id,
      prompt_text: prompt,
      response_text: response.choices[0].message.content,
      input_tokens: response.usage.prompt_tokens,
      output_tokens: response.usage.completion_tokens,
      total_tokens: response.usage.total_tokens,
      input_cost_usd: inputCost,
      output_cost_usd: outputCost,
      total_cost_usd: totalCost,
      portfolio_ids: portfolioIds,
    });

    // 8. Update customer spend
    await this.customersRepository.increment(customerId, {
      current_month_ai_spend: totalCost,
      total_prompts_used: 1,
      total_tokens_used: response.usage.total_tokens,
    });

    // 9. Alert if approaching cap (80%, 90%, 100%)
    this.checkSpendAlerts(customer, totalCost);

    return {
      content: response.choices[0].message.content,
      tokens_used: response.usage.total_tokens,
      cost_usd: totalCost,
      model: response.model,
    };
  }

  private async callOpenRouter(prompt: string): Promise<OpenRouterResponse> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'PortfolioAI', // Optional: app name
      },
      body: JSON.stringify({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a financial analysis assistant. Provide data-driven insights. Always include disclaimer: "Not financial advice. Consult a licensed advisor."`
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3, // Lower temperature for factual consistency
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    return response.json();
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
AI Response Disclaimer:
Every AI response must include:
"This analysis is generated by AI for informational purposes only and does not constitute financial advice. Always consult with a qualified financial advisor before making investment decisions. Past performance does not guarantee future results."
💰 COST MANAGEMENT SYSTEM
Customer-Level Spend Caps
TypeScript
Copy
// server/src/services/cost-cap.service.ts
export class CostCapService {
  async enforceCap(customerId: number, estimatedCost: number): Promise<void> {
    const customer = await this.customersRepository.findOne(customerId);
    
    const projectedSpend = customer.current_month_ai_spend + estimatedCost;
    
    if (projectedSpend > customer.monthly_ai_spend_cap) {
      // Block and notify
      await this.notificationsService.sendEmail(
        customer.notification_email,
        'AI Usage Limit Reached',
        `Your monthly AI analysis limit of $${customer.monthly_ai_spend_cap} has been reached.`
      );
      throw new ForbiddenException('Monthly AI spend limit exceeded.');
    }

    // Warn at 80% and 90%
    const threshold = projectedSpend / customer.monthly_ai_spend_cap;
    if (threshold > 0.9 && customer.total_ai_spend * 0.9 <= customer.monthly_ai_spend_cap) {
      await this.notificationsService.sendEmail(
        customer.notification_email,
        'AI Usage Alert: 90% Limit Reached',
        `You have used 90% of your monthly AI analysis budget.`
      );
    }
  }

  // Reset counters on 1st of month
  @Cron('0 0 1 * *')
  async resetMonthlyCounters(): Promise<void> {
    await this.customersRepository.update({}, {
      current_month_ai_spend: 0,
    });
    await this.agenciesRepository.update({}, {
      current_month_ai_spend: 0,
    });
  }
}
Agency-Level Spend Reporting
TypeScript
Copy
// In agency dashboard, show real-time spend
const agencySpend = await this.promptsRepository
  .createQueryBuilder('prompts')
  .select('SUM(prompts.total_cost_usd)', 'total')
  .where('prompts.agency_id = :agencyId', { agencyId })
  .andWhere('prompts.created_at >= :startOfMonth', { startOfMonth })
  .getRawOne();

const customerBreakdown = await this.promptsRepository
  .createQueryBuilder('prompts')
  .select(['customers.full_name', 'SUM(prompts.total_cost_usd) AS spend'])
  .innerJoin('prompts.customer', 'customers')
  .where('prompts.agency_id = :agencyId', { agencyId })
  .groupBy('customers.id')
  .getRawMany();
📦 PACKAGE.JSON (Updated)
JSON
Copy
{
  "name": "portfolio-ai",
  "version": "1.0.0",
  "description": "AI-powered portfolio analysis platform with cost controls",
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "worker:dev": "tsx watch src/workers/ocr.processor.ts",
    "worker:prod": "node dist/workers/ocr.processor.js",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "migration:generate": "typeorm migration:generate -d ormconfig.ts",
    "migration:run": "typeorm migration:run -d ormconfig.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/schedule": "^4.0.0",
    "@nestjs/throttler": "^5.1.0",
    "typeorm": "^0.3.19",
    "pg": "^8.11.3",
    "ioredis": "^5.3.2",
    "bullmq": "^5.1.0",
    "zod": "^3.22.4",
    "tesseract.js": "^5.0.4",
    "pdf-parse": "^1.1.1",
    "pdf2pic": "^3.1.1",
    "@clerk/clerk-sdk-node": "^4.13.6",
    "stripe": "^14.16.0",
    "@sendgrid/mail": "^8.1.0",
    "node-telegram-bot-api": "^0.64.0",
    "minio": "^7.1.3",
    "sharp": "^0.33.2",
    "pdfkit": "^0.14.0",
    "winston": "^3.11.0",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/testing": "^10.3.0",
    "@types/node": "^20.11.0",
    "@types/jest": "^29.5.0",
    "jest": "^29.7.0",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "tailwindcss": "^3.4.1",
    "vite": "^5.0.12",
    "vue-tsc": "^1.8.0"
  }
}
🐳 DOCKER SETUP (Multi-Container)
docker-compose.yml (Development)
yaml
Copy
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: portfolio_ai
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./server/src/database/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile.app
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    volumes:
      - ./storage:/app/storage
      - ./server/src:/app/src # For hot reload
    command: npm run start:dev

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    volumes:
      - ./storage:/app/storage
      - ./server/src:/app/src
    command: npm run worker:dev

volumes:
  postgres_data:
  redis_data:
  minio_data:
Dockerfile.app
dockerfile
Copy
FROM node:20-alpine

WORKDIR /app

# Install system dependencies for OCR
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    graphicsmagick \
    pdftk

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "run", "start:prod"]
Dockerfile.worker
dockerfile
Copy
FROM node:20-alpine

WORKDIR /app

# OCR dependencies
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    graphicsmagick \
    pdftk

COPY package*.json ./
RUN npm ci --only=production

COPY --from=app-build /app/dist ./dist

CMD ["node", "dist/workers/ocr.processor.js"]
🚨 CRITICAL SECURITY CHECKLIST (Must-Have)
Database Security
[ ] RLS enabled on all tables (check with SELECT * FROM pg_tables WHERE rowsecurity = false;)
[ ] Connection encryption enforced (sslmode=require in production)
[ ] Backup encryption enabled (pg_dump with encryption)
[ ] Superuser access restricted (no app credentials with superuser)
[ ] Query logging enabled for audit (log_statement = 'all')
Application Security
[ ] Clerk JWTs validated with signature verification (never trust client)
[ ] Rate limiting per user ID (not just IP) – use Redis to track
[ ] File upload validation:
MIME type validation (pdf, jpg, png only)
File size limit (10MB)
Virus scan with ClamAV (separate container)
[ ] CORS configured to specific origins (no wildcard)
[ ] Helmet.js with strict CSP headers
[ ] Dependencies scanned weekly with npm audit and snyk test
AI & Cost Security
[ ] Token limits enforced (8,192 per prompt)
[ ] Cost caps enforced at customer and agency level
[ ] OpenRouter API key rotated monthly (automated script)
[ ] Prompt injection detection using OpenAI Moderation API or similar
[ ] AI output sanitization (strip HTML, validate JSON)
Compliance & Audit
[ ] Audit log table created (immutable append-only):
sql
Copy
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Write-only, no UPDATE/DELETE allowed
REVOKE UPDATE, DELETE ON audit_logs FROM app_user;
[ ] Data retention job runs daily (deletes data past retention_days)
[ ] PII detection in OCR output using regex patterns (SSN, account numbers)
[ ] Right to be forgotten endpoint (hard delete + backup purge)
[ ] Breach notification procedure documented (72-hour GDPR deadline)
🧪 TESTING STRATEGY
Unit Tests (Jest)
TypeScript
Copy
// server/src/services/ai.service.spec.ts
describe('AIService', () => {
  it('should block request if customer has exceeded spend cap', async () => {
    const customer = { id: 1, current_month_ai_spend: 49.99, monthly_ai_spend_cap: 50.00 };
    await expect(service.analyzePortfolio(customer.id, 'test prompt'))
      .rejects.toThrow('Monthly AI spend limit exceeded');
  });

  it('should calculate cost correctly for token usage', async () => {
    const tokens = { input: 1000, output: 1000 };
    const cost = service.calculateCost(tokens);
    expect(cost).toBe(0.001); // $0.50/M * 1000 + $0.50/M * 1000
  });
});
Coverage Target: 80% for services, 100% for billing and security logic.
Integration Tests
Test full upload → OCR → AI analysis flow with real database
Mock external APIs (OpenRouter, Financial Datasets)
Test RLS policies with different user roles
E2E Tests (Playwright)
TypeScript
Copy
// e2e/agency-onboarding.spec.ts
test('agency can create customer and upload portfolio', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'agency@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button:has-text("Login")');
  
  await page.click('nav:has-text("Customers")');
  await page.click('button:has-text("Add Customer")');
  await page.fill('[name=full_name]', 'John Doe');
  await page.click('button[type=submit]');
  
  await page.click('button:has-text("Upload Portfolio")');
  await page.setInputFiles('input[type=file]', 'test-portfolio.pdf');
  await page.waitForSelector('text=Portfolio Processed');
});
Security Tests (OWASP ZAP)
Run automated security scans in CI/CD pipeline
Check for SQL injection, XSS, CSRF
API fuzzing on all endpoints
⚖️ COMPLIANCE & LEGAL REQUIREMENTS
1. SEC/FINRA Regulations
DO NOT provide specific investment recommendations without disclosing algorithm limitations
Registered Investment Advisor (RIA) status may be required if AI output is deemed "advice"
Disclosures required: "AI-generated analysis is not a substitute for professional financial advice"
Recordkeeping: Maintain copies of all AI outputs for 7 years (SEC Rule 204-2)
2. GDPR (EU Customers)
Data Processing Agreement (DPA) with all subprocessors (OpenRouter, SendGrid, etc.)
Right to erasure: Hard delete all data within 30 days of request
Data portability: Export user data in machine-readable format (JSON)
Lawful basis: Consent for processing financial data (explicit opt-in)
3. CCPA (California Residents)
"Do Not Sell" button  : Provide opt-out for data sharing
Privacy policy: Disclose all data collection and usage
Third-party disclosures: List all subprocessors in privacy policy
4. PCI DSS (If Storing Payment Data)
DO NOT store card data – Use Stripe Elements / Checkout
Stripe must be PCI Level 1 certified (they are)
Annual SAQ-A attestation required if using Stripe hosted fields
5. Required Legal Documents
Terms of Service: Include limitation of liability, disclaimers
Privacy Policy: GDPR/CCPA compliant
AI Disclaimer: "Not financial advice" on every report
Data Processing Agreement: For B2B agency clients
Budget: $5,000-$10,000 for securities lawyer to draft documents.
📊 COST PROJECTION (Realistic)
Development Costs (8 months, 2 senior devs)
Developers: $120,000 (2 devs × $7.5k/month × 8 months)
Legal: $10,000
Security Audit: $5,000
DevOps/Infrastructure: $3,000
Total: $138,000
Monthly Operating Costs (100 agencies, 1,000 customers)
OpenRouter AI: $500 (assuming avg $0.50/customer/month)
Financial Datasets API: $200 (enterprise tier)
SendGrid: $100 (10k emails/month)
PostgreSQL Cloud: $300 (managed service, 100GB)
Redis Cloud: $200 (managed cluster)
MinIO/S3: $50 (500GB storage)
Clerk.com: $100 (10k active users)
Datadog: $150 (APM)
Stripe: $50 (processing fees)
Total: $1,650/month
Revenue Model
Agency Subscription: $99/month base + $2/customer
Example: Agency with 50 customers = $199/month
Break-even: ~15 active agencies needed to cover operating costs
🎯 FINAL CLAUDE CODE INSTRUCTIONS
When implementing this project, prioritize these tasks:
CRITICAL PATH (Must be done in order):
Set up PostgreSQL with RLS and create migration scripts
Configure Clerk.com authentication and sync user table
Implement ownership guards before any CRUD operations
Build cost cap service before integrating AI
Create audit logging for all data access
Implement OCR confidence scoring and human review UI
Add GDPR-compliant data deletion endpoints
Set up monitoring and alerting before production
DANGER ZONES (High Risk):
OCR accuracy: Expect 60-70% auto-extract rate; budget time for manual review UI
AI reliability: DeepSeek V3 may hallucinate; implement fact-checking against holdings data
Tenant isolation: Test RLS with every feature; one bug can leak all data
Cost overruns: Without caps, one customer can burn $500 in a day
CLAUDE CODE PROMPT TEMPLATE:
bash
Copy
# When asking Claude to implement a feature:
"Implement the [feature name] following the existing NestJS architecture.
Use TypeScript with strict mode. Add unit tests with 80% coverage.
Enforce tenant isolation with RLS and ownership guards.
Add audit logging for data access. Update the security checklist.
Do not use any AWS services. Use MinIO for storage. Test with realistic data."
Remember: This is a financial platform, not a toy project. One data breach or compliance failure can kill the business. Slow is smooth, and smooth is fast.

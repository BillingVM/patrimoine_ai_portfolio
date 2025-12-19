-- Portfolio AI v1.1 Migration
-- Adds client management layer
-- BACKUP DATABASE BEFORE RUNNING!

-- 1. Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    user_id INTEGER DEFAULT 1, -- Demo user
    name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) DEFAULT 'individual',
    email VARCHAR(255),
    phone VARCHAR(50),
    total_aum NUMERIC(15,2) DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add columns to existing portfolios_simple table (safe - only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portfolios_simple' AND column_name='client_id') THEN
        ALTER TABLE portfolios_simple ADD COLUMN client_id INTEGER REFERENCES clients(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portfolios_simple' AND column_name='portfolio_name') THEN
        ALTER TABLE portfolios_simple ADD COLUMN portfolio_name VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portfolios_simple' AND column_name='sync_type') THEN
        ALTER TABLE portfolios_simple ADD COLUMN sync_type VARCHAR(50) DEFAULT 'manual';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portfolios_simple' AND column_name='file_size') THEN
        ALTER TABLE portfolios_simple ADD COLUMN file_size INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portfolios_simple' AND column_name='ocr_confidence') THEN
        ALTER TABLE portfolios_simple ADD COLUMN ocr_confidence NUMERIC(5,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portfolios_simple' AND column_name='ocr_method') THEN
        ALTER TABLE portfolios_simple ADD COLUMN ocr_method VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portfolios_simple' AND column_name='created_at') THEN
        ALTER TABLE portfolios_simple ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 3. Add columns to existing reports_simple table (safe - only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports_simple' AND column_name='report_type') THEN
        ALTER TABLE reports_simple ADD COLUMN report_type VARCHAR(50) DEFAULT 'analysis';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports_simple' AND column_name='created_at') THEN
        ALTER TABLE reports_simple ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_client_id ON portfolios_simple(client_id);

-- 5. Update existing uploaded_at to created_at (if column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portfolios_simple' AND column_name='uploaded_at')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='portfolios_simple' AND column_name='created_at') THEN
        UPDATE portfolios_simple SET created_at = uploaded_at WHERE created_at IS NULL;
    END IF;
END $$;

-- 6. Update existing generated_at to created_at (if column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports_simple' AND column_name='generated_at')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports_simple' AND column_name='created_at') THEN
        UPDATE reports_simple SET created_at = generated_at WHERE created_at IS NULL;
    END IF;
END $$;

-- Verification queries
SELECT 'Migration completed successfully!' as status;
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('clients', 'portfolios_simple', 'reports_simple')
ORDER BY table_name, ordinal_position;

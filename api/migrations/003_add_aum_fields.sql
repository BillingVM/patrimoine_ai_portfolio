-- Migration: Add AUM and statistics fields
-- Description: Add calculated fields for Assets Under Management and holdings count

-- Add fields to portfolios_simple table
ALTER TABLE portfolios_simple
ADD COLUMN IF NOT EXISTS total_value DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS holdings_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMP;

-- Add fields to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS total_aum DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_holdings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_calculated_at TIMESTAMP;

-- Create index for faster calculations
CREATE INDEX IF NOT EXISTS idx_portfolios_client_id ON portfolios_simple(client_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_total_value ON portfolios_simple(total_value);

-- Add comment
COMMENT ON COLUMN portfolios_simple.total_value IS 'Total value of all holdings in this portfolio';
COMMENT ON COLUMN portfolios_simple.holdings_count IS 'Number of holdings in this portfolio';
COMMENT ON COLUMN clients.total_aum IS 'Total Assets Under Management for all client portfolios';
COMMENT ON COLUMN clients.total_holdings IS 'Total number of holdings across all client portfolios';

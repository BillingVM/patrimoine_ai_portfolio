-- Migration: Add portfolio naming and metadata
-- Date: 2025-12-23
-- Purpose: Enable portfolio identification by user-friendly names

-- Add name column to portfolios_simple
ALTER TABLE portfolios_simple
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add description column
ALTER TABLE portfolios_simple
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add parsed_holdings column (JSON format)
ALTER TABLE portfolios_simple
ADD COLUMN IF NOT EXISTS parsed_holdings JSONB;

-- Add total_value column
ALTER TABLE portfolios_simple
ADD COLUMN IF NOT EXISTS total_value DECIMAL(15, 2);

-- Add currency column
ALTER TABLE portfolios_simple
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';

-- Create index on portfolio name for faster lookups
CREATE INDEX IF NOT EXISTS idx_portfolios_name ON portfolios_simple(name);

-- Create index on client_id for faster client portfolio queries
CREATE INDEX IF NOT EXISTS idx_portfolios_client_id ON portfolios_simple(client_id);

-- Set default names for existing portfolios (use original_name without extension)
UPDATE portfolios_simple
SET name = CASE
  WHEN name IS NULL THEN
    REGEXP_REPLACE(original_name, '\.(csv|xlsx|xls|json)$', '', 'i')
  ELSE name
END;

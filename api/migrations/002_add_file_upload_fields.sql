-- Migration: Add file upload and portfolio detection fields
-- Version: 002
-- Date: 2025-12-23

DO $$
BEGIN
    -- Add portfolio_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='portfolios_simple' AND column_name='portfolio_name'
    ) THEN
        ALTER TABLE portfolios_simple ADD COLUMN portfolio_name VARCHAR(255);
        COMMENT ON COLUMN portfolios_simple.portfolio_name IS 'User-defined portfolio name';

        -- Create index for faster portfolio name lookups
        CREATE INDEX idx_portfolios_name ON portfolios_simple(portfolio_name);

        RAISE NOTICE 'Added portfolio_name column and index';
    ELSE
        RAISE NOTICE 'Column portfolio_name already exists';
    END IF;

    -- Add vision_analysis column for storing vision AI results
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='portfolios_simple' AND column_name='vision_analysis'
    ) THEN
        ALTER TABLE portfolios_simple ADD COLUMN vision_analysis JSONB;
        COMMENT ON COLUMN portfolios_simple.vision_analysis IS 'Vision AI analysis results and metadata';

        RAISE NOTICE 'Added vision_analysis column';
    ELSE
        RAISE NOTICE 'Column vision_analysis already exists';
    END IF;

    -- Add portfolio_type column for classification
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='portfolios_simple' AND column_name='portfolio_type'
    ) THEN
        ALTER TABLE portfolios_simple ADD COLUMN portfolio_type VARCHAR(100);
        COMMENT ON COLUMN portfolios_simple.portfolio_type IS 'Portfolio type: stock portfolio, bond portfolio, etc.';

        RAISE NOTICE 'Added portfolio_type column';
    ELSE
        RAISE NOTICE 'Column portfolio_type already exists';
    END IF;

    RAISE NOTICE 'Migration 002 completed successfully!';
END $$;

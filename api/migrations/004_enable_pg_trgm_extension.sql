-- Enable pg_trgm extension for fuzzy text matching (similarity function)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extension is installed
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm';

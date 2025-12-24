-- Add session_state column to chat_sessions table
-- This stores structured financial data (prices, holdings, etc.) with timestamps
-- Allows SPA to decide whether to refresh data based on age

ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS session_state JSONB DEFAULT '{}';

-- Add index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_state ON chat_sessions USING GIN (session_state);

-- Add comment explaining the structure
COMMENT ON COLUMN chat_sessions.session_state IS
'Structured financial data cache with timestamps. Format:
{
  "prices": {
    "AAPL": {
      "price": 272.36,
      "timestamp": "2025-12-24T10:30:00Z",
      "source": "api",
      "confirmed": false,
      "updatedAt": "2025-12-24T10:30:00Z"
    }
  },
  "holdings": {
    "AAPL": {
      "shares": 100,
      "timestamp": "2025-12-24T10:25:00Z",
      "source": "ocr|user|api",
      "confirmed": false,
      "updatedAt": "2025-12-24T10:25:00Z"
    }
  },
  "portfolioValue": {
    "value": 76471.75,
    "timestamp": "2025-12-24T10:30:00Z",
    "calculatedFrom": ["AAPL", "MSFT"],
    "updatedAt": "2025-12-24T10:30:00Z"
  },
  "metadata": {
    "createdAt": "2025-12-24T10:25:00Z",
    "lastUpdated": "2025-12-24T10:30:00Z",
    "version": 1
  }
}';

-- Verify the migration
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'chat_sessions'
  AND column_name = 'session_state';

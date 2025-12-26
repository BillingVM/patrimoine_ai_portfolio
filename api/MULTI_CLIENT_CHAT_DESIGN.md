# Multi-Client/Multi-Portfolio Chat Architecture

## Overview
Design for intelligent chat system on clients.php that understands queries across:
- All clients (aggregate)
- Specific client(s)
- Specific portfolio(s)
- Cross-client comparisons
- Solo user portfolios

## Architecture Components

### 1. Enhanced Intent Classifier
```javascript
{
  intent: "analysis",        // prediction, analysis, comparison, summary, question
  scope: "specific_client",  // all_clients, specific_client, specific_portfolio, multiple_clients, comparison, solo
  entities: {
    clients: ["John Doe"],   // Extracted client names/IDs
    portfolios: ["Tech Portfolio"],  // Extracted portfolio names
    stocks: ["AAPL", "TSLA"] // Mentioned stock symbols
  },
  comparison: true,          // Is this a comparison query?
  timeframe: "current"       // current, historical, future
}
```

**Detection Examples**:
- "What is my total AUM?" → scope: all_clients, intent: summary
- "How is John's portfolio performing?" → scope: specific_client, entities: {clients: ["John"]}
- "Compare AAPL performance across all clients" → scope: comparison, entities: {stocks: ["AAPL"]}
- "Show me my best performing portfolios" → scope: all_clients, intent: analysis
- "What's Tesla doing in Acme Corp's growth portfolio?" → scope: specific_portfolio

### 2. Multi-Client Context Builder
Fetches and structures ALL client/portfolio data upfront:

```javascript
{
  scope: "all_clients",
  summary: {
    totalClients: 3,
    totalPortfolios: 7,
    totalAUM: 5200000,
    totalHoldings: 45,
    soloPortfolios: 2
  },
  clients: [
    {
      id: 1,
      name: "John Doe",
      entity_type: "individual",
      total_aum: 2100000,
      portfolios: [
        {
          id: 5,
          name: "Tech Portfolio",
          total_value: 1500000,
          holdings: [
            {ticker: "AAPL", value: 500000, percentage: 33.3},
            {ticker: "MSFT", value: 400000, percentage: 26.7}
          ]
        }
      ]
    }
  ],
  soloPortfolios: [
    {
      id: 10,
      name: "Agency Crypto Fund",
      total_value: 300000,
      holdings: [...]
    }
  ]
}
```

### 3. MultiClientSPA (Specialized Prompter Agent)
Generates context-aware prompts based on scope:

#### Scope: all_clients
```
PORTFOLIO MANAGEMENT CONTEXT:
You are analyzing ALL clients for an investment advisory firm.

AGGREGATE SUMMARY:
- Total Clients: 3
- Total Portfolios: 7
- Total AUM: $5.2M
- Total Holdings: 45 stocks

CLIENT BREAKDOWN:
1. John Doe (Individual) - AUM: $2.1M
   - Tech Portfolio: $1.5M
     Holdings: AAPL (33%), MSFT (27%), GOOGL (20%)
   - Dividend Portfolio: $600K
     Holdings: VZ (40%), T (35%), KO (25%)

2. Acme Corp (Company) - AUM: $3.1M
   - Growth Portfolio: $3.1M
     Holdings: TSLA (45%), NVDA (30%), AMD (25%)

SOLO PORTFOLIOS (Agency):
- Crypto Fund: $300K (BTC, ETH)

USER QUESTION: {prompt}

INSTRUCTIONS:
- Provide aggregate analysis across all clients
- Highlight top performers and underperformers
- Use specific client/portfolio names when relevant
```

#### Scope: specific_client
```
PORTFOLIO MANAGEMENT CONTEXT:
You are analyzing portfolios for CLIENT: John Doe (Individual)

CLIENT OVERVIEW:
- Total AUM: $2.1M
- Number of Portfolios: 2
- Risk Profile: Moderate

PORTFOLIOS:
1. Tech Portfolio ($1.5M - 71% of total)
   - AAPL: $500K (33%)
   - MSFT: $400K (27%)
   - GOOGL: $300K (20%)

2. Dividend Portfolio ($600K - 29% of total)
   - VZ: $240K (40%)
   - T: $210K (35%)
   - KO: $150K (25%)

USER QUESTION: {prompt}

INSTRUCTIONS:
- Focus specifically on John Doe's portfolios
- Compare his portfolios to each other
- Reference specific holdings when answering
```

#### Scope: comparison
```
PORTFOLIO MANAGEMENT CONTEXT:
You are comparing AAPL holdings across multiple clients.

AAPL DISTRIBUTION:
1. John Doe - Tech Portfolio
   - AAPL Holdings: $500K (33% of portfolio)
   - Performance YTD: +15.2%

2. Jane Smith - Growth Portfolio
   - AAPL Holdings: $800K (40% of portfolio)
   - Performance YTD: +15.2%

AGGREGATE:
- Total AAPL Exposure: $1.3M
- Weighted Average Allocation: 36.5%

USER QUESTION: {prompt}

INSTRUCTIONS:
- Compare AAPL performance across clients
- Highlight differences in allocation
- Provide recommendations if asked
```

## 4. Data Gathering Strategy

### Stage 1: Fetch Context Hierarchy
```javascript
// Always fetch upfront (cached)
const context = {
  clients: await db.getAllClients(),
  portfolios: await Promise.all(
    clients.map(c => db.getClientPortfolios(c.id))
  ),
  soloPortfolios: await db.getSoloPortfolios()
};
```

### Stage 2: Parse Holdings On-Demand
```javascript
// Only parse holdings for entities mentioned in query
if (entities.clients.includes("John Doe")) {
  const johnPortfolios = portfolios.filter(p => p.client_name === "John Doe");
  johnPortfolios.forEach(p => {
    p.holdings = aumCalculator.parseHoldings(p.raw_data);
  });
}
```

### Stage 3: Enrich with Market Data
```javascript
// Only fetch prices for stocks mentioned in context
if (entities.stocks.length > 0) {
  const prices = await dataGatherer.fetchPrices(entities.stocks);
}
```

## 5. Implementation Flow

```
User Query: "Compare AAPL performance across all my clients"
              ↓
┌─────────────────────────────────────────────┐
│ Stage 1: Intent Classification              │
│ - Detected: scope=comparison                │
│ - Entities: {stocks: ["AAPL"]}              │
│ - Intent: analysis                          │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ Stage 2: Context Builder                    │
│ - Fetch all clients                         │
│ - Fetch all portfolios                      │
│ - Filter portfolios with AAPL holdings      │
│ - Parse holdings for filtered portfolios    │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ Stage 3: Data Gatherer                      │
│ - Fetch AAPL current price                  │
│ - Fetch AAPL fundamentals                   │
│ - Fetch AAPL performance metrics            │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ Stage 4: MultiClientSPA                     │
│ - Generate comparison prompt                │
│ - Include AAPL distribution table           │
│ - Add performance metrics per client        │
│ - Add analysis framework                    │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ Stage 5: AI Response                        │
│ - Uses enhanced prompt with context         │
│ - Provides client-specific insights         │
│ - References specific portfolios            │
└─────────────────────────────────────────────┘
```

## 6. Example Queries & Expected Behavior

### Query 1: "What is my total AUM?"
- **Scope**: all_clients
- **Context**: All clients + portfolios summary
- **Response**: "$5.2M across 3 clients (John Doe: $2.1M, Acme Corp: $3.1M, solo: $300K)"

### Query 2: "How is Tesla performing in Acme Corp's portfolio?"
- **Scope**: specific_portfolio
- **Entities**: {clients: ["Acme Corp"], stocks: ["TSLA"]}
- **Context**: Acme Corp → Growth Portfolio → TSLA holdings
- **Response**: "TSLA represents $1.4M (45%) of Acme Corp's Growth Portfolio, up 12% YTD"

### Query 3: "Which client has the best performing portfolio this year?"
- **Scope**: comparison
- **Context**: All clients → All portfolios → YTD performance
- **Response**: "Acme Corp's Growth Portfolio leads with +18.5% YTD, driven by NVDA (+45%)"

### Query 4: "Show me all portfolios with tech stocks"
- **Scope**: all_clients
- **Filter**: Portfolios containing tech stocks (AAPL, MSFT, GOOGL, etc.)
- **Response**: Lists John Doe's Tech Portfolio, Acme Corp's Growth Portfolio

### Query 5: "Compare my solo portfolios to client portfolios"
- **Scope**: comparison
- **Entities**: {scope_comparison: ["solo", "clients"]}
- **Context**: Solo portfolios vs all client portfolios
- **Response**: Side-by-side comparison with performance metrics

## 7. Technical Implementation

### New Files:
1. `/api/multiClientContextBuilder.js` - Builds hierarchical context
2. `/api/spa/MultiClientSPA.js` - Generates multi-client prompts
3. `/api/intentClassifier.js` (enhance) - Add scope + entity detection

### Enhanced Files:
1. `/api/enhancedChatWithProgress.js` - Add multi-client mode
2. `/api/server.js` - Add `/api/chat-multilient` endpoint

### Frontend:
1. `/public/clients.php` - Add chat section UI
2. `/public/js/clients-chat.js` - Chat handler for clients page

## 8. Session State for Multi-Client Context

```javascript
sessionState.multiClientContext = {
  lastScope: "all_clients",
  mentionedClients: ["John Doe", "Acme Corp"],
  mentionedPortfolios: ["Tech Portfolio"],
  mentionedStocks: ["AAPL", "TSLA"],
  contextSnapshot: {
    timestamp: "2025-12-26T10:30:00Z",
    clients: [...],  // Cached for follow-up questions
    portfolios: [...] // Cached for performance
  }
};
```

This allows follow-up questions like:
- User: "What about John's dividend portfolio?" (remembers John Doe context)
- User: "How does that compare to Acme?" (remembers comparison mode)

## Benefits

1. **Smart Context Detection**: Understands multi-entity queries
2. **Efficient Data Loading**: Only fetches what's needed
3. **Contextual Responses**: References specific clients/portfolios
4. **Comparison Support**: Side-by-side analysis across entities
5. **Session Continuity**: Remembers context for follow-ups
6. **Scalable**: Works with 1 client or 1000 clients

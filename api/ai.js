/**
 * AI Report Generation Module with Real-Time Financial Data
 * Uses OpenRouter API + FinancialDatasets.ai
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const FinancialDatasetsAPI = require('./financialDatasets');
const tokenCounter = require('./tokenCounter');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'xiaomi/mimo-v2-flash:free';

// Initialize Financial Datasets API
const financialAPI = new FinancialDatasetsAPI(process.env.FINANCIAL_DATASETS_API_KEY);

// Pricing (free models = $0)
const PRICING = {
  INPUT: 0,
  OUTPUT: 0,
};

/**
 * Extract ticker symbols from portfolio data
 */
function extractTickers(portfolioData) {
  const tickers = new Set();

  // Common ticker patterns: 2-5 uppercase letters
  const tickerPattern = /\b([A-Z]{1,5})\b/g;
  const matches = portfolioData.match(tickerPattern) || [];

  // Filter out common words that look like tickers
  const excludeWords = ['USD', 'CSV', 'PDF', 'JPG', 'PNG', 'OCR', 'THE', 'AND', 'FOR', 'ARE', 'WITH'];

  matches.forEach(match => {
    if (!excludeWords.includes(match) && match.length >= 2) {
      tickers.add(match);
    }
  });

  return Array.from(tickers).slice(0, 10); // Limit to 10 tickers
}

/**
 * Convert Financial Datasets tools to OpenAI function format
 */
function getOpenAIFunctions() {
  const tools = financialAPI.getToolDefinitions();
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.entries(tool.parameters).reduce((acc, [key, value]) => {
          acc[key] = {
            type: 'string',
            description: value
          };
          return acc;
        }, {}),
        required: ['ticker']
      }
    }
  }));
}

/**
 * Generate AI report for portfolio with real-time data
 */
async function generateReport(portfolioData, metadata = {}) {
  try {
    // Extract data
    const data = typeof portfolioData === 'object' && portfolioData.raw_data
      ? portfolioData.raw_data
      : portfolioData;

    const fileType = metadata.file_type || portfolioData.file_type || 'unknown';
    const fileName = metadata.original_name || portfolioData.original_name || '';

    // Analyze data internally (but don't mention technical details in output)
    const analysis = analyzePortfolioData(data, fileType);
    const tickers = extractTickers(data);

    console.log(`🤖 Generating AI report using ${AI_MODEL}...`);
    console.log(`📊 Detected ${tickers.length} tickers:`, tickers.join(', '));

    // Build system prompt (internal context - not shown to user)
    const systemPrompt = buildSystemPrompt(analysis, fileType);

    // Build user prompt (clean, customer-facing)
    const userPrompt = buildUserPrompt(data, tickers, analysis);

    // Get OpenAI-compatible tool definitions
    const tools = getOpenAIFunctions();

    // First AI call - let it request financial data
    let messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const response = await callOpenRouter(messages, tools);

    // Handle tool calls if AI wants real-time data
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log(`🔧 AI requesting ${response.tool_calls.length} tool calls...`);

      // Execute all tool calls
      for (const toolCall of response.tool_calls) {
        const toolResult = await financialAPI.executeToolCall(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments)
        );

        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: [toolCall]
        });

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }

      // Second AI call with tool results
      const finalResponse = await callOpenRouter(messages, tools);

      // Count tokens in FINAL REPORT ONLY (fair billing - not internal API calls)
      const reportTokens = tokenCounter.countTokens(finalResponse.content);
      const breakdown = tokenCounter.getTokenBreakdown(finalResponse.content);

      console.log(`📊 Token breakdown: ${reportTokens} tokens (${breakdown.chars} chars, ${breakdown.words} words)`);
      console.log(`⚠️  OpenRouter reported ${finalResponse.usage.total_tokens} total tokens (includes tool calls)`);
      console.log(`✅ Billing user for: ${reportTokens} tokens (final report only)`);

      return {
        content: finalResponse.content,
        aiModel: AI_MODEL,
        tokensUsed: reportTokens, // Use counted tokens from final report only
        costUsd: 0,
      };
    }

    // No tool calls - return initial response
    // Count tokens in FINAL REPORT ONLY (fair billing)
    const reportTokens = tokenCounter.countTokens(response.content);
    const breakdown = tokenCounter.getTokenBreakdown(response.content);

    console.log(`📊 Token breakdown: ${reportTokens} tokens (${breakdown.chars} chars, ${breakdown.words} words)`);
    console.log(`⚠️  OpenRouter reported ${response.usage.total_tokens} total tokens`);
    console.log(`✅ Billing user for: ${reportTokens} tokens (final report only)`);

    return {
      content: response.content,
      aiModel: AI_MODEL,
      tokensUsed: reportTokens, // Use counted tokens from final report only
      costUsd: 0,
    };

  } catch (error) {
    console.error('❌ AI generation error:', error);
    throw new Error(`Failed to generate report: ${error.message}`);
  }
}

/**
 * Call OpenRouter API
 */
async function callOpenRouter(messages, tools) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://sol.inoutconnect.com',
      'X-Title': 'Portfolio AI',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: messages,
      tools: tools,
      tool_choice: 'auto',
      max_tokens: 3000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${error}`);
  }

  const responseData = await response.json();

  return {
    content: responseData.choices[0].message.content,
    tool_calls: responseData.choices[0].message.tool_calls,
    usage: responseData.usage
  };
}

/**
 * Build system prompt (internal - includes technical context)
 */
function buildSystemPrompt(analysis, fileType) {
  let prompt = `You are a professional portfolio analyst with access to real-time financial data for 30,000+ tickers.

**Data Context (Internal - DO NOT mention in your report):**
- File type: ${fileType.toUpperCase()}
- Data quality: ${analysis.isOCR ? `OCR extraction (${analysis.ocrConfidence}% confidence)` : analysis.hasStructuredData ? 'Structured data' : 'Unstructured text'}
- Detected fields: ${analysis.detectedFields.join(', ') || 'none'}

**Your Task:**
Analyze the portfolio and provide a professional investment analysis report. Use the available tools to fetch real-time data for any tickers you identify.

**Important Rules:**
1. DO NOT mention OCR, file types, data extraction, or technical details
2. If data is unclear, work with what's available without explaining why
3. Focus entirely on investment insights and recommendations
4. Use real-time data from tools whenever possible
5. Write in a professional, customer-facing tone
6. Include specific numbers, percentages, and actionable advice`;

  return prompt;
}

/**
 * Build user prompt (clean, customer-facing)
 */
function buildUserPrompt(data, tickers, analysis) {
  let prompt = `Please analyze the following portfolio:\n\n`;

  prompt += `\`\`\`\n${data}\n\`\`\`\n\n`;

  if (tickers.length > 0) {
    prompt += `**Tickers identified:** ${tickers.join(', ')}\n\n`;
  }

  if (analysis.hasStructuredData) {
    prompt += `**Provide a comprehensive analysis including:**

1. **Portfolio Summary**
   - Total positions and estimated value
   - Asset allocation breakdown
   - Portfolio composition

2. **Holdings Analysis** (use real-time data)
   - Current prices and market conditions for each ticker
   - Position sizes and weights
   - Recent performance and trends

3. **Risk Assessment**
   - Diversification score (1-10)
   - Concentration risks
   - Sector exposure analysis

4. **Market Context** (use real-time data)
   - Recent news affecting holdings
   - Earnings updates
   - Analyst estimates and outlook

5. **Recommendations**
   - Specific rebalancing suggestions
   - Position adjustments with target allocations
   - Risk management strategies

**Format:** Use markdown with clear sections. Include real data, percentages, and specific recommendations.`;

  } else {
    prompt += `**Based on the available information, provide:**

1. **Holdings Identified**
   - List recognizable assets
   - Current market data for each ticker (use real-time tools)

2. **Market Analysis**
   - Recent performance and trends
   - News and market context
   - Analyst sentiment

3. **Portfolio Assessment**
   - General diversification analysis
   - Notable strengths or concerns
   - Risk considerations

4. **Recommendations**
   - Suggested improvements
   - Position-specific advice
   - General portfolio strategy

**Note:** Work with available information. Focus on actionable insights.`;
  }

  prompt += `\n\n**Disclaimer:** Include standard investment disclaimer at the end.`;

  return prompt;
}

/**
 * Analyze portfolio data (internal use only)
 */
function analyzePortfolioData(data, fileType) {
  const analysis = {
    hasStructuredData: false,
    isUnstructured: false,
    isOCR: false,
    ocrConfidence: null,
    detectedFields: [],
  };

  // Check if it's OCR data
  if (data.includes('[OCR Extracted')) {
    analysis.isOCR = true;
    const confidenceMatch = data.match(/Confidence:\s*(\d+\.?\d*)%/);
    if (confidenceMatch) {
      analysis.ocrConfidence = parseFloat(confidenceMatch[1]);
    }
  }

  // Detect structured data patterns
  const hasTickerColumn = /\b(ticker|symbol|stock)\b/i.test(data);
  const hasQuantityColumn = /\b(quantity|shares|units|qty)\b/i.test(data);
  const hasPriceColumn = /\b(price|value|amount)\b/i.test(data);
  const hasValueColumn = /\b(market value|current value|total)\b/i.test(data);

  if (hasTickerColumn) analysis.detectedFields.push('ticker/symbol');
  if (hasQuantityColumn) analysis.detectedFields.push('quantity');
  if (hasPriceColumn) analysis.detectedFields.push('price');
  if (hasValueColumn) analysis.detectedFields.push('value');

  // Check for structured format
  const hasCommas = (data.match(/,/g) || []).length > 5;
  const hasMultipleLines = data.split('\n').length > 3;

  if ((hasTickerColumn || hasQuantityColumn) && (hasCommas || hasMultipleLines)) {
    analysis.hasStructuredData = true;
  } else if (!analysis.hasStructuredData && data.length > 50) {
    analysis.isUnstructured = true;
  }

  return analysis;
}

module.exports = {
  generateReport,
};

/**
 * Portfolio Analysis SPA (Specialized Prompter Agent)
 * Enhances portfolio-related prompts with comprehensive analysis framework
 */

const BaseSPA = require('./baseSPA');

class PortfolioSPA extends BaseSPA {
  constructor() {
    super('Portfolio Analysis SPA');
  }

  /**
   * Determine if this SPA should handle the request
   * @param {Object} classification - Intent classification
   * @param {Object} portfolioContext - Resolved portfolio context
   * @returns {boolean}
   */
  canHandle(classification, portfolioContext) {
    // Handle if portfolio context is resolved
    return portfolioContext && portfolioContext.resolved === true;
  }

  /**
   * Generate enhanced prompt for portfolio analysis
   * @param {string} userPrompt - Original user prompt
   * @param {Object} classification - Intent classification
   * @param {Object} gatheredData - Data from data gatherer
   * @param {Object} portfolioContext - Resolved portfolio data
   * @returns {Promise<Object>} Enhanced prompt
   */
  async generate(userPrompt, classification, gatheredData, portfolioContext) {
    console.log(`📊 Portfolio SPA generating enhanced prompt...`);
    console.log(`   Action: ${portfolioContext.action}`);
    console.log(`   Scope: ${portfolioContext.scope}`);
    console.log(`   Portfolios: ${portfolioContext.portfolios.length}`);

    const { action, scope, portfolios, assetMentions, aggregateStats } = portfolioContext;

    // Build action-specific framework
    const framework = this.buildAnalysisFramework(action, scope, portfolios, assetMentions, aggregateStats);

    // Build system prompt with portfolio expertise
    const systemPrompt = this.buildSystemPrompt(action, framework);

    // Enhance user prompt with portfolio context
    const enhancedUserPrompt = this.buildEnhancedUserPrompt(
      userPrompt,
      portfolioContext,
      gatheredData,
      classification
    );

    return {
      systemPrompt,
      userPrompt: enhancedUserPrompt,
      metadata: {
        spa: this.name,
        action,
        scope,
        portfolioCount: portfolios.length,
        assetMentions,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Build action-specific analysis framework
   */
  buildAnalysisFramework(action, scope, portfolios, assetMentions, aggregateStats) {
    const frameworks = {
      analysis: this.buildAnalysisAnalysisFramework(scope, portfolios, aggregateStats),
      comparison: this.buildComparisonFramework(scope, portfolios),
      advice: this.buildAdviceFramework(scope, portfolios, assetMentions),
      rebalance: this.buildRebalanceFramework(scope, portfolios),
      modification: this.buildModificationFramework(scope, portfolios, assetMentions),
      information: this.buildInformationFramework(scope, portfolios)
    };

    return frameworks[action] || frameworks.analysis;
  }

  /**
   * Analysis framework (evaluate portfolio performance)
   */
  buildAnalysisAnalysisFramework(scope, portfolios, aggregateStats) {
    let framework = '## Portfolio Analysis Framework\n\n';

    if (scope === 'all' && aggregateStats) {
      framework += '### Aggregate Portfolio Overview\n';
      framework += `- Total Portfolios: ${aggregateStats.total_portfolios}\n`;
      framework += `- Total Assets Under Management: $${parseFloat(aggregateStats.total_value || 0).toLocaleString()}\n`;
      framework += `- Average Portfolio Value: $${parseFloat(aggregateStats.avg_portfolio_value || 0).toLocaleString()}\n\n`;
    }

    framework += '### Analysis Dimensions\n';
    framework += '1. **Allocation Analysis**\n';
    framework += '   - Asset class distribution (stocks, bonds, cash, alternatives)\n';
    framework += '   - Sector concentration and diversification\n';
    framework += '   - Top holdings and their weights\n';
    framework += '   - Geographic exposure\n\n';

    framework += '2. **Risk Assessment**\n';
    framework += '   - Portfolio volatility and beta\n';
    framework += '   - Concentration risk (single-asset risk)\n';
    framework += '   - Sector/industry concentration\n';
    framework += '   - Diversification score\n\n';

    framework += '3. **Performance Evaluation**\n';
    framework += '   - Current total value and allocation percentages\n';
    framework += '   - Individual asset performance (if data available)\n';
    framework += '   - Risk-adjusted returns\n\n';

    framework += '4. **Quality Assessment**\n';
    framework += '   - Asset quality and fundamentals\n';
    framework += '   - Balance between growth and value\n';
    framework += '   - Alignment with investment goals\n\n';

    return framework;
  }

  /**
   * Comparison framework
   */
  buildComparisonFramework(scope, portfolios) {
    let framework = '## Portfolio Comparison Framework\n\n';

    if (scope === 'multiple' || scope === 'all') {
      framework += '### Multi-Portfolio Comparison\n';
      framework += '1. **Allocation Comparison**\n';
      framework += '   - Compare asset allocation across portfolios\n';
      framework += '   - Identify overlapping holdings\n';
      framework += '   - Spot diversification gaps\n\n';

      framework += '2. **Risk Profile Comparison**\n';
      framework += '   - Compare risk levels\n';
      framework += '   - Volatility comparison\n';
      framework += '   - Concentration risk differences\n\n';

      framework += '3. **Performance Comparison**\n';
      framework += '   - Value comparison\n';
      framework += '   - Asset count and diversification\n';
      framework += '   - Quality of holdings\n\n';
    } else {
      framework += '### Benchmark Comparison\n';
      framework += '1. **vs Market Indices**\n';
      framework += '   - Compare to S&P 500, NASDAQ, etc.\n';
      framework += '   - Sector weight comparison\n\n';

      framework += '2. **vs Optimal Allocation**\n';
      framework += '   - Compare to target allocation models\n';
      framework += '   - Identify deviations from ideal allocation\n\n';
    }

    return framework;
  }

  /**
   * Advice framework
   */
  buildAdviceFramework(scope, portfolios, assetMentions) {
    let framework = '## Investment Advice Framework\n\n';

    framework += '### Advisory Considerations\n';
    framework += '1. **Current Portfolio State**\n';
    framework += '   - Analyze existing holdings and allocation\n';
    framework += '   - Identify strengths and weaknesses\n';
    framework += '   - Assess risk level\n\n';

    framework += '2. **Recommendations**\n';
    framework += '   - Specific actionable advice\n';
    framework += '   - Priority ranking of suggestions\n';
    framework += '   - Expected impact of changes\n\n';

    framework += '3. **Risk Management**\n';
    framework += '   - Risk mitigation strategies\n';
    framework += '   - Diversification opportunities\n';
    framework += '   - Downside protection\n\n';

    if (assetMentions && assetMentions.length > 0) {
      framework += '4. **Specific Asset Consideration**\n';
      framework += `   - Mentioned assets: ${assetMentions.join(', ')}\n`;
      framework += '   - Fit with current portfolio\n';
      framework += '   - Potential impact on allocation\n\n';
    }

    framework += '5. **Implementation Strategy**\n';
    framework += '   - Step-by-step action plan\n';
    framework += '   - Timing considerations\n';
    framework += '   - Transaction costs and tax implications\n\n';

    return framework;
  }

  /**
   * Rebalance framework
   */
  buildRebalanceFramework(scope, portfolios) {
    let framework = '## Portfolio Rebalancing Framework\n\n';

    framework += '### Rebalancing Analysis\n';
    framework += '1. **Current State Assessment**\n';
    framework += '   - Current allocation percentages\n';
    framework += '   - Deviation from target allocation\n';
    framework += '   - Concentration issues\n\n';

    framework += '2. **Target Allocation**\n';
    framework += '   - Recommended asset class weights\n';
    framework += '   - Risk-appropriate allocation\n';
    framework += '   - Diversification targets\n\n';

    framework += '3. **Rebalancing Strategy**\n';
    framework += '   - Specific buy/sell recommendations\n';
    framework += '   - Quantity adjustments needed\n';
    framework += '   - Order of operations\n\n';

    framework += '4. **Expected Outcomes**\n';
    framework += '   - Projected allocation after rebalancing\n';
    framework += '   - Risk reduction achieved\n';
    framework += '   - Improved diversification\n\n';

    return framework;
  }

  /**
   * Modification framework (adding/removing assets)
   */
  buildModificationFramework(scope, portfolios, assetMentions) {
    let framework = '## Portfolio Modification Framework\n\n';

    if (assetMentions && assetMentions.length > 0) {
      framework += `### Assets Under Consideration: ${assetMentions.join(', ')}\n\n`;
    }

    framework += '### Modification Analysis\n';
    framework += '1. **Impact Assessment**\n';
    framework += '   - Effect on overall allocation\n';
    framework += '   - Impact on diversification\n';
    framework += '   - Risk profile changes\n\n';

    framework += '2. **Fit Analysis**\n';
    framework += '   - Compatibility with existing holdings\n';
    framework += '   - Correlation with current assets\n';
    framework += '   - Sector/industry overlap\n\n';

    framework += '3. **Recommendation**\n';
    framework += '   - Should add/remove? Why?\n';
    framework += '   - Optimal position size\n';
    framework += '   - Timing considerations\n\n';

    framework += '4. **Alternative Options**\n';
    framework += '   - Better alternatives if applicable\n';
    framework += '   - Comparison of options\n\n';

    return framework;
  }

  /**
   * Information framework
   */
  buildInformationFramework(scope, portfolios) {
    let framework = '## Portfolio Information Framework\n\n';

    framework += '### Information Response\n';
    framework += '1. **Accurate Data**\n';
    framework += '   - Provide exact holdings information\n';
    framework += '   - Current values and allocations\n';
    framework += '   - Portfolio metadata\n\n';

    framework += '2. **Clear Explanation**\n';
    framework += '   - Answer user\'s specific question\n';
    framework += '   - Provide context and meaning\n';
    framework += '   - Define technical terms\n\n';

    framework += '3. **Relevant Insights**\n';
    framework += '   - Add valuable context\n';
    framework += '   - Highlight important patterns\n';
    framework += '   - Point out noteworthy aspects\n\n';

    return framework;
  }

  /**
   * Build system prompt
   */
  buildSystemPrompt(action, framework) {
    let systemPrompt = `You are an expert portfolio advisor and investment analyst with deep expertise in:
- Portfolio construction and optimization
- Asset allocation strategies
- Risk management and diversification
- Fundamental and technical analysis
- Market trends and economic indicators

**CRITICAL: You have access to real-time market data from FinancialDatasets API. When current prices are provided in the "Real-Time Market Data" section, YOU MUST USE THEM to calculate current portfolio values.**

${framework}

### Response Guidelines:
1. **Use Real-Time Data**: ALWAYS use the current prices provided in the "Real-Time Market Data" section to calculate portfolio values. Multiply shares × current price for each holding.
2. **Data-Driven**: Base all analysis on the actual portfolio data AND real-time market prices provided
3. **Specific**: Give concrete, actionable insights with exact dollar amounts and percentages
4. **Balanced**: Present both opportunities and risks
5. **Professional**: Use clear, professional language appropriate for financial advisory
6. **Comprehensive**: Cover all relevant aspects of the analysis framework
7. **Practical**: Provide implementable recommendations
8. **CRITICAL**: End your response with a hidden metadata marker containing the portfolio ID(s) you analyzed. Format: [PORTFOLIO_ID:123] where 123 is the ID. This ensures context persists across follow-up questions.

### Important Notes:
- The portfolio data provided is the user's actual holdings
- **When "Real-Time Market Data" section is present, those are CURRENT LIVE PRICES from FinancialDatasets API**
- **You MUST calculate current portfolio values using: (shares × current price) for each holding**
- **Show both: original values from portfolio file AND current values using live prices**
- Always consider risk-adjusted returns, not just raw performance
- Highlight concentration risks and diversification opportunities
- Be transparent about limitations in the data or analysis

### Example Calculation:
If portfolio shows: Apple Inc. - 100 shares, original value $15,000
And Real-Time Market Data shows: AAPL - Current Price: $180.50
Then current value = 100 × $180.50 = $18,050
Performance = ($18,050 - $15,000) / $15,000 = +20.33%

Provide thorough, professional portfolio analysis that helps the user make informed investment decisions using CURRENT MARKET DATA.`;

    return systemPrompt;
  }

  /**
   * Build enhanced user prompt with portfolio context
   */
  buildEnhancedUserPrompt(userPrompt, portfolioContext, gatheredData, classification) {
    const { portfolios, scope, assetMentions, action } = portfolioContext;

    let enhancedPrompt = `## User Question\n${userPrompt}\n\n`;

    // Add portfolio data
    enhancedPrompt += this.formatPortfolioData(portfolios, scope, assetMentions);

    // Add gathered market data if available
    if (gatheredData && Object.keys(gatheredData).length > 0) {
      enhancedPrompt += '\n## Real-Time Market Data\n';

      // Prices
      if (gatheredData.prices && typeof gatheredData.prices === 'object') {
        enhancedPrompt += '\n### Current Stock Prices (Live from FinancialDatasets API)\n';
        enhancedPrompt += '**CRITICAL: Use these prices to calculate current portfolio values. Formula: shares × current price**\n\n';

        Object.entries(gatheredData.prices).forEach(([ticker, data]) => {
          enhancedPrompt += `**${ticker}**: $${data.price}`;
          if (data.changePercent !== null) {
            enhancedPrompt += ` (${data.changePercent >= 0 ? '+' : ''}${data.changePercent}% today)`;
          }
          enhancedPrompt += `\n`;
          if (data.high && data.low) {
            enhancedPrompt += `  Daily Range: $${data.low} - $${data.high}\n`;
          }
        });
        enhancedPrompt += '\n';
      }

      // Fundamentals
      if (gatheredData.fundamentals && typeof gatheredData.fundamentals === 'object') {
        enhancedPrompt += '\n### Financial Metrics\n';

        Object.entries(gatheredData.fundamentals).forEach(([ticker, metrics]) => {
          enhancedPrompt += `**${ticker}**:\n`;
          if (metrics.marketCap) enhancedPrompt += `- Market Cap: $${metrics.marketCap}\n`;
          if (metrics.pe) enhancedPrompt += `- P/E Ratio: ${metrics.pe}\n`;
          if (metrics.eps) enhancedPrompt += `- EPS: $${metrics.eps}\n`;
          if (metrics.revenue) enhancedPrompt += `- Revenue: $${metrics.revenue}\n`;
          if (metrics.roe) enhancedPrompt += `- ROE: ${metrics.roe}%\n`;
          if (metrics.debtToEquity) enhancedPrompt += `- Debt/Equity: ${metrics.debtToEquity}\n`;
        });
        enhancedPrompt += '\n';
      }

      // News
      if (gatheredData.news && Array.isArray(gatheredData.news) && gatheredData.news.length > 0) {
        enhancedPrompt += '\n### Recent News\n';
        gatheredData.news.slice(0, 5).forEach(article => {
          enhancedPrompt += `- **${article.ticker}**: ${article.title} (${article.source})\n`;
          if (article.summary) enhancedPrompt += `  ${article.summary.substring(0, 150)}...\n`;
        });
        enhancedPrompt += '\n';
      }

      // Earnings
      if (gatheredData.earnings && typeof gatheredData.earnings === 'object') {
        enhancedPrompt += '\n### Earnings Data\n';
        Object.entries(gatheredData.earnings).forEach(([ticker, data]) => {
          if (data.analystEstimates && data.analystEstimates.length > 0) {
            enhancedPrompt += `**${ticker} Analyst Estimates**:\n`;
            data.analystEstimates.slice(0, 2).forEach(est => {
              enhancedPrompt += `- ${est.fiscal_period}: EPS $${est.estimated_eps}\n`;
            });
          }
        });
        enhancedPrompt += '\n';
      }

      // Insider Trading
      if (gatheredData.insiderTrading && typeof gatheredData.insiderTrading === 'object') {
        enhancedPrompt += '\n### Insider Trading Activity\n';
        Object.entries(gatheredData.insiderTrading).forEach(([ticker, trades]) => {
          if (trades && trades.length > 0) {
            enhancedPrompt += `**${ticker}**:\n`;
            trades.slice(0, 3).forEach(trade => {
              enhancedPrompt += `- ${trade.name} (${trade.title}): ${trade.transactionType} ${trade.shares} shares @ $${trade.pricePerShare}\n`;
            });
          }
        });
        enhancedPrompt += '\n';
      }

      if (gatheredData.predictionMarkets && gatheredData.predictionMarkets.length > 0) {
        enhancedPrompt += '\n### Prediction Markets\n';
        gatheredData.predictionMarkets.slice(0, 3).forEach(pred => {
          enhancedPrompt += `- ${pred.question}: ${(pred.probability * 100).toFixed(1)}% probability (${pred.source})\n`;
        });
        enhancedPrompt += '\n';
      }

      if (gatheredData.webSearch && gatheredData.webSearch.length > 0) {
        enhancedPrompt += '\n### Recent News/Insights\n';
        gatheredData.webSearch.slice(0, 3).forEach(result => {
          enhancedPrompt += `- ${result.title}: ${result.snippet}\n`;
        });
        enhancedPrompt += '\n';
      }
    }

    // Add analysis context
    enhancedPrompt += `\n## Analysis Context\n`;
    enhancedPrompt += `- Action: ${action}\n`;
    enhancedPrompt += `- Scope: ${scope}\n`;
    if (assetMentions && assetMentions.length > 0) {
      enhancedPrompt += `- Assets of Interest: ${assetMentions.join(', ')}\n`;
    }

    // CRITICAL: Explicitly tell AI which portfolio ID(s) to include in response
    const portfolioIds = portfolios.map(p => p.id).filter(Boolean);
    if (portfolioIds.length > 0) {
      enhancedPrompt += `\n**CRITICAL INSTRUCTION**: At the end of your response, you MUST include the following metadata marker exactly as shown:\n`;
      if (portfolioIds.length === 1) {
        enhancedPrompt += `[PORTFOLIO_ID:${portfolioIds[0]}]\n`;
      } else {
        enhancedPrompt += `[PORTFOLIO_ID:${portfolioIds.join(',')}]\n`;
      }
      enhancedPrompt += `This ensures the conversation context persists for follow-up questions.\n`;
    }

    return enhancedPrompt;
  }

  /**
   * Format portfolio data for prompt
   */
  formatPortfolioData(portfolios, scope, assetMentions) {
    let formatted = `## Portfolio Data (${scope})\n\n`;

    portfolios.forEach((portfolio, index) => {
      formatted += `### Portfolio: ${portfolio.name || `Portfolio #${portfolio.id}`}\n`;
      formatted += `- Portfolio ID: ${portfolio.id}\n`;
      formatted += `- Upload Date: ${new Date(portfolio.uploaded_at).toLocaleDateString()}\n`;
      formatted += `- Total Value: $${parseFloat(portfolio.totalValue || 0).toLocaleString()} ${portfolio.currency || 'USD'}\n`;
      formatted += `- Number of Holdings: ${portfolio.assetCount}\n\n`;

      if (portfolio.holdings && portfolio.holdings.length > 0) {
        formatted += '#### Holdings:\n';
        formatted += '| Ticker | Shares | Value | Allocation |\n';
        formatted += '|--------|--------|-------|------------|\n';

        portfolio.holdings.forEach(holding => {
          const isHighlighted = assetMentions && assetMentions.some(asset =>
            holding.ticker?.toUpperCase().includes(asset.toUpperCase())
          );
          const marker = isHighlighted ? '**' : '';
          formatted += `| ${marker}${holding.ticker}${marker} | ${holding.shares?.toLocaleString() || 'N/A'} | $${parseFloat(holding.value || 0).toLocaleString()} | ${holding.allocation?.toFixed(2)}% |\n`;
        });

        formatted += '\n';
      }

      if (portfolio.description) {
        formatted += `**Description**: ${portfolio.description}\n\n`;
      }

      // Add separator if multiple portfolios
      if (index < portfolios.length - 1) {
        formatted += '---\n\n';
      }
    });

    return formatted;
  }
}

module.exports = PortfolioSPA;

/**
 * Portfolio Resolver
 * Matches portfolio context identifiers to actual database records
 */

const portfolioQueries = require('./portfolioQueries');
const TickerNormalizer = require('./tickerNormalizer');

class PortfolioResolver {
  constructor() {
    this.cache = new Map(); // Cache resolved portfolios for session
    this.tickerNormalizer = new TickerNormalizer();
  }

  /**
   * Resolve portfolio context to actual database records
   * @param {Object} context - Output from PortfolioContextDetector
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Resolved portfolio data
   */
  async resolve(context, userId = 1) {
    if (!context.isPortfolioRelated) {
      return {
        resolved: false,
        reason: 'Not portfolio-related',
        portfolios: []
      };
    }

    console.log(`🔍 Resolving portfolio context for user ${userId}...`);
    console.log(`   Scope: ${context.scope}`);
    console.log(`   Identifiers: ${JSON.stringify(context.identifiers)}`);

    try {
      // Handle scope-based resolution
      if (context.scope === 'none') {
        // Portfolio-related but no specific portfolio identified
        // Return user's portfolios for context
        const portfolios = await portfolioQueries.getUserPortfolios(userId);
        return {
          resolved: true,
          scope: 'none',
          portfolios: portfolios.slice(0, 3), // Limit to 3 for context
          totalCount: portfolios.length,
          reason: 'Portfolio-related but no specific portfolio identified',
          suggestion: 'User may be asking general portfolio questions'
        };
      }

      if (context.scope === 'all') {
        // User wants all portfolios
        const portfolios = await portfolioQueries.getUserPortfolios(userId);
        const aggregateStats = await portfolioQueries.getAggregateStats(userId);

        // Parse holdings for each portfolio
        const enrichedPortfolios = await this.enrichPortfolios(portfolios);

        return {
          resolved: true,
          scope: 'all',
          portfolios: enrichedPortfolios,
          aggregateStats,
          totalCount: portfolios.length,
          reason: `Resolved all ${portfolios.length} portfolios`
        };
      }

      // Resolve specific or multiple portfolios
      const resolvedPortfolios = await this.resolveIdentifiers(context.identifiers, userId);

      if (resolvedPortfolios.length === 0) {
        return this.handleNoMatch(userId, context);
      }

      if (resolvedPortfolios.length > 1 && context.scope === 'specific') {
        return this.handleAmbiguousMatch(resolvedPortfolios, context);
      }

      // Enrich resolved portfolios with parsed holdings
      const enrichedPortfolios = await this.enrichPortfolios(resolvedPortfolios);

      // Check asset mentions and filter holdings if needed
      const finalPortfolios = this.filterByAssetMentions(
        enrichedPortfolios,
        context.assetMentions,
        context.assetContext
      );

      console.log(`✅ Resolved ${finalPortfolios.length} portfolio(s)`);

      return {
        resolved: true,
        scope: context.scope,
        portfolios: finalPortfolios,
        totalCount: finalPortfolios.length,
        assetContext: context.assetContext,
        assetMentions: context.assetMentions,
        action: context.action,
        reason: `Successfully resolved ${finalPortfolios.length} portfolio(s)`
      };

    } catch (error) {
      console.error('❌ Error resolving portfolio context:', error.message);
      return {
        resolved: false,
        error: error.message,
        portfolios: [],
        reason: 'Error during resolution'
      };
    }
  }

  /**
   * Resolve identifiers to database records
   * @param {Array} identifiers - List of identifiers from detector
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Matched portfolios
   */
  async resolveIdentifiers(identifiers, userId) {
    const resolvedPortfolios = [];
    const seenIds = new Set();

    for (const identifier of identifiers) {
      let portfolios = [];

      switch (identifier.type) {
        case 'id':
          // Direct portfolio ID from conversation history
          const portfolioId = parseInt(identifier.value);
          if (!isNaN(portfolioId)) {
            const portfolio = await portfolioQueries.getPortfolio(portfolioId, userId);
            if (portfolio) portfolios = [portfolio];
          }
          break;

        case 'name':
          // Exact or fuzzy match by name
          portfolios = await portfolioQueries.getPortfoliosByName(identifier.value, userId);
          break;

        case 'recency':
          // Get latest portfolio
          const latest = await portfolioQueries.getLatestPortfolio(userId);
          if (latest) portfolios = [latest];
          break;

        case 'order':
          // Get by order (1st, 2nd, etc.)
          const ordered = await portfolioQueries.getPortfolioByOrder(identifier.value, userId);
          if (ordered) portfolios = [ordered];
          break;

        case 'all':
          // Get all portfolios
          portfolios = await portfolioQueries.getUserPortfolios(userId);
          break;

        case 'implicit':
          // Check if value is a numeric ID (from history)
          const implicitId = parseInt(identifier.value);
          if (!isNaN(implicitId)) {
            const portfolio = await portfolioQueries.getPortfolio(implicitId, userId);
            if (portfolio) {
              portfolios = [portfolio];
              console.log(`   ✓ Resolved implicit ID ${implicitId} to portfolio: ${portfolio.name || `#${portfolio.id}`}`);
            }
          } else {
            // Try to resolve from conversation context by name
            portfolios = await portfolioQueries.getPortfoliosByName(identifier.value, userId);
            if (portfolios.length === 0) {
              // Fallback to latest if implicit reference doesn't match
              const latest = await portfolioQueries.getLatestPortfolio(userId);
              if (latest) portfolios = [latest];
            }
          }
          break;
      }

      // Add unique portfolios
      portfolios.forEach(p => {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          resolvedPortfolios.push(p);
        }
      });
    }

    return resolvedPortfolios;
  }

  /**
   * Enrich portfolios with parsed holdings data
   * @param {Array} portfolios - Raw portfolio records
   * @returns {Promise<Array>} Enriched portfolios
   */
  async enrichPortfolios(portfolios) {
    return portfolios.map(portfolio => {
      let parsedData = null;

      // Check if already parsed in database
      if (portfolio.parsed_holdings) {
        parsedData = portfolio.parsed_holdings;
      } else if (portfolio.raw_data) {
        // Parse on-the-fly
        parsedData = portfolioQueries.parsePortfolioHoldings(
          portfolio.raw_data,
          portfolio.file_type
        );
      }

      // Normalize tickers from company names to ticker symbols
      const rawTickers = parsedData?.tickers || [];
      const normalizedTickers = this.tickerNormalizer.normalizeAll(rawTickers);

      console.log(`   📊 Portfolio #${portfolio.id}: Normalized ${rawTickers.length} → ${normalizedTickers.length} tickers`);

      return {
        ...portfolio,
        holdings: parsedData?.holdings || [],
        totalValue: parsedData?.totalValue || portfolio.total_value || 0,
        assetCount: parsedData?.assetCount || 0,
        tickers: normalizedTickers, // Use normalized tickers
        rawTickers: rawTickers, // Keep original for reference
        currency: portfolio.currency || 'USD'
      };
    });
  }

  /**
   * Filter portfolios by asset mentions
   * @param {Array} portfolios - Enriched portfolios
   * @param {Array} assetMentions - Mentioned assets/tickers
   * @param {string} assetContext - 'within_portfolio' or 'general'
   * @returns {Array} Filtered portfolios
   */
  filterByAssetMentions(portfolios, assetMentions, assetContext) {
    if (assetMentions.length === 0 || assetContext !== 'within_portfolio') {
      return portfolios;
    }

    // Filter holdings to only include mentioned assets
    return portfolios.map(portfolio => {
      const filteredHoldings = portfolio.holdings.filter(holding =>
        assetMentions.some(asset =>
          holding.ticker?.toUpperCase().includes(asset.toUpperCase())
        )
      );

      return {
        ...portfolio,
        holdings: filteredHoldings.length > 0 ? filteredHoldings : portfolio.holdings,
        highlightedAssets: assetMentions,
        assetContext: filteredHoldings.length > 0 ? 'found_in_portfolio' : 'not_found'
      };
    });
  }

  /**
   * Handle case where no portfolios match
   * @param {number} userId - User ID
   * @param {Object} context - Detection context
   * @returns {Promise<Object>} No match response
   */
  async handleNoMatch(userId, context) {
    const allPortfolios = await portfolioQueries.getUserPortfolios(userId);
    const count = await portfolioQueries.getPortfolioCount(userId);

    console.log(`⚠️  No portfolios matched identifiers: ${JSON.stringify(context.identifiers)}`);

    if (count === 0) {
      return {
        resolved: false,
        scope: 'none',
        portfolios: [],
        totalCount: 0,
        reason: 'User has no portfolios uploaded yet',
        suggestion: 'Suggest uploading a portfolio first'
      };
    }

    return {
      resolved: false,
      scope: 'none',
      portfolios: allPortfolios.slice(0, 5), // Show up to 5 for context
      totalCount: count,
      reason: `No portfolio matched "${context.identifiers[0]?.value}". User has ${count} portfolio(s).`,
      suggestion: `Available portfolios: ${allPortfolios.slice(0, 3).map(p => p.name || `Portfolio #${p.id}`).join(', ')}`,
      availablePortfolios: allPortfolios.map(p => ({
        id: p.id,
        name: p.name || `Portfolio #${p.id}`,
        uploadedAt: p.uploaded_at
      }))
    };
  }

  /**
   * Handle ambiguous matches (multiple portfolios for specific reference)
   * @param {Array} portfolios - Matched portfolios
   * @param {Object} context - Detection context
   * @returns {Object} Ambiguous match response
   */
  handleAmbiguousMatch(portfolios, context) {
    console.log(`⚠️  Ambiguous match: ${portfolios.length} portfolios matched`);

    return {
      resolved: 'ambiguous',
      scope: 'multiple',
      portfolios: portfolios,
      totalCount: portfolios.length,
      reason: `Multiple portfolios (${portfolios.length}) matched "${context.identifiers[0]?.value}"`,
      suggestion: `Clarify which portfolio: ${portfolios.map(p => p.name || `#${p.id}`).join(', ')}`,
      needsClarification: true,
      matchedPortfolios: portfolios.map(p => ({
        id: p.id,
        name: p.name || `Portfolio #${p.id}`,
        uploadedAt: p.uploaded_at,
        totalValue: p.total_value
      }))
    };
  }

  /**
   * Format portfolio data for AI context
   * @param {Object} resolvedData - Resolved portfolio data
   * @returns {string} Formatted context string for AI
   */
  formatForAI(resolvedData) {
    if (!resolvedData.resolved || resolvedData.portfolios.length === 0) {
      return `Portfolio Context: ${resolvedData.reason}. ${resolvedData.suggestion || ''}`;
    }

    const { portfolios, scope, assetMentions, action } = resolvedData;

    let contextStr = `Portfolio Context (${scope}):\n`;

    if (scope === 'all' && resolvedData.aggregateStats) {
      const stats = resolvedData.aggregateStats;
      contextStr += `Total Portfolios: ${stats.total_portfolios}\n`;
      contextStr += `Total Value: $${parseFloat(stats.total_value || 0).toLocaleString()}\n`;
      contextStr += `Average Portfolio Value: $${parseFloat(stats.avg_portfolio_value || 0).toLocaleString()}\n\n`;
    }

    portfolios.forEach((portfolio, index) => {
      if (index < 5) { // Limit to 5 portfolios for context
        contextStr += `Portfolio: ${portfolio.name || `#${portfolio.id}`}\n`;
        contextStr += `  Total Value: $${parseFloat(portfolio.totalValue || 0).toLocaleString()} ${portfolio.currency}\n`;
        contextStr += `  Assets: ${portfolio.assetCount}\n`;

        if (portfolio.holdings && portfolio.holdings.length > 0) {
          contextStr += `  Holdings:\n`;
          portfolio.holdings.slice(0, 10).forEach(holding => {
            contextStr += `    - ${holding.ticker}: ${holding.shares} shares, $${parseFloat(holding.value || 0).toLocaleString()} (${holding.allocation?.toFixed(1)}%)\n`;
          });
        }

        if (assetMentions && assetMentions.length > 0) {
          contextStr += `  Mentioned Assets: ${assetMentions.join(', ')}\n`;
        }

        contextStr += '\n';
      }
    });

    if (action) {
      contextStr += `User Intent: ${action}\n`;
    }

    return contextStr;
  }

  /**
   * Clear cache (for testing or session reset)
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = PortfolioResolver;

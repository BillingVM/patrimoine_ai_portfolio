const axios = require('axios');

class FinancialDatasetsAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.financialdatasets.ai';
    this.headers = {
      'X-API-KEY': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  async request(endpoint, params = {}) {
    try {
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        headers: this.headers,
        params: params
      });
      return response.data;
    } catch (error) {
      const errorDetails = {
        service: 'Financial Datasets API',
        timestamp: new Date().toISOString(),
        endpoint: endpoint,
        params: params,
        statusCode: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        data: error.response?.data,
        url: error.config?.url
      };

      console.error('╔══════════════════════════════════════════════════════════╗');
      console.error('║  Financial Datasets API Error                            ║');
      console.error('╚══════════════════════════════════════════════════════════╝');
      console.error('Service:', errorDetails.service);
      console.error('Timestamp:', errorDetails.timestamp);
      console.error('Endpoint:', errorDetails.endpoint);
      console.error('Params:', JSON.stringify(errorDetails.params, null, 2));
      console.error('Status Code:', errorDetails.statusCode);
      console.error('Status Text:', errorDetails.statusText);
      console.error('Message:', errorDetails.message);
      console.error('URL:', errorDetails.url);

      // Safely stringify response data
      try {
        console.error('Response Data:', JSON.stringify(errorDetails.data, null, 2));
      } catch (e) {
        console.error('Response Data: [Could not stringify - circular reference]');
      }
      console.error('═══════════════════════════════════════════════════════════');

      // Create user-friendly error message
      let userMessage = `Financial Datasets API Error (${errorDetails.statusCode}): `;
      if (errorDetails.statusCode === 429) {
        userMessage += 'Rate limit exceeded. Please wait a moment before trying again. ';
        userMessage += errorDetails.data?.error || 'Too many requests.';
      } else if (errorDetails.statusCode === 401) {
        userMessage += 'Authentication failed. Please check your API key.';
      } else if (errorDetails.statusCode === 403) {
        userMessage += 'Access forbidden. Your API key may not have permission for this endpoint.';
      } else if (errorDetails.statusCode === 404) {
        userMessage += 'Data not found. The requested ticker or resource may not exist.';
      } else if (errorDetails.statusCode >= 500) {
        userMessage += 'Financial Datasets service error. Please try again later.';
      } else {
        userMessage += errorDetails.data?.error || errorDetails.message;
      }

      const enhancedError = new Error(userMessage);
      enhancedError.details = errorDetails;
      throw enhancedError;
    }
  }

  // Financial Statements
  async getIncomeStatements(ticker, period = 'annual', limit = 10) {
    return await this.request('/financials/income-statements', { ticker, period, limit });
  }

  async getBalanceSheets(ticker, period = 'annual', limit = 10) {
    return await this.request('/financials/balance-sheets', { ticker, period, limit });
  }

  async getCashFlowStatements(ticker, period = 'annual', limit = 10) {
    return await this.request('/financials/cash-flow-statements', { ticker, period, limit });
  }

  async getAllFinancials(ticker, period = 'annual', limit = 10) {
    return await this.request('/financials', { ticker, period, limit });
  }

  // Market Data
  async getStockPrices(ticker, interval = 'day', interval_multiplier = 1, limit = 100) {
    // Calculate date range (default: last 100 days for daily, adjust for other intervals)
    const end_date = new Date().toISOString().split('T')[0]; // Today (YYYY-MM-DD)
    const start_date = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 100 days ago

    return await this.request('/prices', {
      ticker,
      interval,
      interval_multiplier,
      start_date,
      end_date,
      limit
    });
  }

  async getCryptoPrices(ticker, limit = 100) {
    return await this.request('/crypto/prices', { ticker, limit });
  }

  async getCryptoSnapshot(ticker) {
    return await this.request('/crypto/snapshot', { ticker });
  }

  async getInterestRates(bank = 'federal_reserve', limit = 100) {
    return await this.request('/macro/interest-rates', { bank, limit });
  }

  // Company Intelligence
  async getCompanyFacts(ticker) {
    return await this.request('/company/facts', { ticker });
  }

  async getSegmentedFinancials(ticker, period = 'annual', limit = 10) {
    return await this.request('/financials/segments', { ticker, period, limit });
  }

  async getFinancialMetrics(ticker, period = 'annual', limit = 10) {
    return await this.request('/financial-metrics', { ticker, period, limit });
  }

  // SEC Filings
  async getSECFilings(ticker, form_type = null, limit = 20) {
    const params = { ticker, limit };
    if (form_type) params.form_type = form_type;
    return await this.request('/filings', params);
  }

  async getFilingItems(ticker, item = null, limit = 20) {
    const params = { ticker, limit };
    if (item) params.item = item;
    return await this.request('/filings/items', params);
  }

  // Insider Trading
  async getInsiderTrading(ticker, limit = 50) {
    return await this.request('/insider-trades', { ticker, limit });
  }

  async getInstitutionalHoldings(ticker, limit = 50) {
    return await this.request('/institutional-ownership', { ticker, limit });
  }

  // News & Earnings
  async getNews(ticker = null, limit = 20) {
    const params = { limit };
    if (ticker) params.ticker = ticker;
    return await this.request('/news', params);
  }

  async getEarningsPressReleases(ticker, limit = 10) {
    return await this.request('/earnings/press-releases', { ticker, limit });
  }

  async getAnalystEstimates(ticker, limit = 10) {
    return await this.request('/analyst-estimates', { ticker, limit });
  }

  // Search & Screening
  async searchLineItems(query, limit = 20) {
    return await this.request('/search/line-items', { query, limit });
  }

  async screenStocks(filters = {}) {
    return await this.request('/screener', filters);
  }

  // AI Tool Functions - Returns formatted data for LLM
  getToolDefinitions() {
    return [
      {
        name: 'get_stock_price',
        description: 'Get current and historical stock price data for a ticker',
        parameters: {
          ticker: 'Stock ticker symbol (e.g., AAPL, TSLA)',
          interval: 'Time interval: minute, day, week, month, year (default: day)',
          interval_multiplier: 'Multiplier for interval (default: 1)',
          limit: 'Number of data points (default: 100)'
        }
      },
      {
        name: 'get_financial_statements',
        description: 'Get complete financial statements (income, balance sheet, cash flow) for a company',
        parameters: {
          ticker: 'Stock ticker symbol',
          period: 'annual or quarterly (default: annual)',
          limit: 'Number of periods (default: 5)'
        }
      },
      {
        name: 'get_company_metrics',
        description: 'Get financial metrics and ratios (P/E, ROE, debt ratios, growth rates, etc.)',
        parameters: {
          ticker: 'Stock ticker symbol',
          period: 'annual or quarterly (default: annual)',
          limit: 'Number of periods (default: 5)'
        }
      },
      {
        name: 'get_company_news',
        description: 'Get recent news articles about a company or general market news',
        parameters: {
          ticker: 'Stock ticker symbol (optional for general news)',
          limit: 'Number of articles (default: 10)'
        }
      },
      {
        name: 'get_earnings_data',
        description: 'Get earnings reports and analyst estimates for a company',
        parameters: {
          ticker: 'Stock ticker symbol',
          limit: 'Number of reports (default: 4)'
        }
      },
      {
        name: 'get_insider_trading',
        description: 'Get insider trading activity (buys/sells by company executives)',
        parameters: {
          ticker: 'Stock ticker symbol',
          limit: 'Number of transactions (default: 20)'
        }
      },
      {
        name: 'get_sec_filings',
        description: 'Get SEC filings (10-K, 10-Q, 8-K, etc.) for a company',
        parameters: {
          ticker: 'Stock ticker symbol',
          form_type: 'Filing type: 10-K, 10-Q, 8-K (optional)',
          limit: 'Number of filings (default: 10)'
        }
      },
      {
        name: 'screen_stocks',
        description: 'Screen stocks based on financial criteria (market cap, P/E ratio, etc.)',
        parameters: {
          filters: 'Filter criteria as JSON object'
        }
      },
      {
        name: 'get_institutional_holdings',
        description: 'Get institutional investor holdings for a company',
        parameters: {
          ticker: 'Stock ticker symbol',
          limit: 'Number of holders (default: 20)'
        }
      }
    ];
  }

  async executeToolCall(toolName, parameters) {
    try {
      switch(toolName) {
        case 'get_stock_price':
          return await this.getStockPrices(
            parameters.ticker,
            parameters.interval || 'day',
            parameters.interval_multiplier || 1,
            parameters.limit || 100
          );

        case 'get_financial_statements':
          return await this.getAllFinancials(
            parameters.ticker,
            parameters.period || 'annual',
            parameters.limit || 5
          );

        case 'get_company_metrics':
          return await this.getFinancialMetrics(
            parameters.ticker,
            parameters.period || 'annual',
            parameters.limit || 5
          );

        case 'get_company_news':
          return await this.getNews(
            parameters.ticker || null,
            parameters.limit || 10
          );

        case 'get_earnings_data':
          const pressReleases = await this.getEarningsPressReleases(parameters.ticker, parameters.limit || 4);
          const estimates = await this.getAnalystEstimates(parameters.ticker, parameters.limit || 4);
          return { press_releases: pressReleases, analyst_estimates: estimates };

        case 'get_insider_trading':
          return await this.getInsiderTrading(parameters.ticker, parameters.limit || 20);

        case 'get_sec_filings':
          return await this.getSECFilings(
            parameters.ticker,
            parameters.form_type || null,
            parameters.limit || 10
          );

        case 'screen_stocks':
          return await this.screenStocks(parameters.filters || {});

        case 'get_institutional_holdings':
          return await this.getInstitutionalHoldings(parameters.ticker, parameters.limit || 20);

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      return { error: error.message };
    }
  }
}

module.exports = FinancialDatasetsAPI;

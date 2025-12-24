/**
 * Ticker Normalizer
 * Converts company names to ticker symbols
 */

class TickerNormalizer {
    constructor() {
        // Common company name to ticker mapping
        this.companyToTicker = {
            // Tech
            'apple': 'AAPL',
            'apple inc': 'AAPL',
            'apple inc.': 'AAPL',
            'microsoft': 'MSFT',
            'microsoft corp': 'MSFT',
            'microsoft corp.': 'MSFT',
            'microsoft corporation': 'MSFT',
            'alphabet': 'GOOGL',
            'alphabet inc': 'GOOGL',
            'alphabet inc.': 'GOOGL',
            'google': 'GOOGL',
            'amazon': 'AMZN',
            'amazon.com': 'AMZN',
            'amazon com inc': 'AMZN',
            'meta': 'META',
            'meta platforms': 'META',
            'facebook': 'META',
            'tesla': 'TSLA',
            'tesla inc': 'TSLA',
            'nvidia': 'NVDA',
            'nvidia corp': 'NVDA',
            'nvidia corporation': 'NVDA',

            // Finance
            'jpmorgan': 'JPM',
            'jpmorgan chase': 'JPM',
            'jp morgan': 'JPM',
            'bank of america': 'BAC',
            'wells fargo': 'WFC',
            'goldman sachs': 'GS',
            'morgan stanley': 'MS',
            'citigroup': 'C',

            // Retail
            'walmart': 'WMT',
            'wal-mart': 'WMT',
            'walmart inc': 'WMT',
            'target': 'TGT',
            'target corp': 'TGT',
            'costco': 'COST',
            'costco wholesale': 'COST',
            'home depot': 'HD',
            'the home depot': 'HD',

            // Consumer
            'mcdonalds': 'MCD',
            "mcdonald's": 'MCD',
            "mcdonald's corp": 'MCD',
            'coca-cola': 'KO',
            'coca cola': 'KO',
            'pepsi': 'PEP',
            'pepsico': 'PEP',
            'nike': 'NKE',
            'procter & gamble': 'PG',
            'procter and gamble': 'PG',

            // Healthcare
            'johnson & johnson': 'JNJ',
            'johnson and johnson': 'JNJ',
            'pfizer': 'PFE',
            'merck': 'MRK',
            'abbvie': 'ABBV',
            'unitedhealth': 'UNH',
            'unitedhealth group': 'UNH',

            // Industrials
            'boeing': 'BA',
            'caterpillar': 'CAT',
            '3m': 'MMM',
            'general electric': 'GE',
            'ge': 'GE',

            // Telecom
            'verizon': 'VZ',
            'at&t': 'T',
            'att': 'T',
            't-mobile': 'TMUS',
            'tmobile': 'TMUS',

            // Payments
            'visa': 'V',
            'visa inc': 'V',
            'mastercard': 'MA',
            'paypal': 'PYPL',

            // Media
            'disney': 'DIS',
            'walt disney': 'DIS',
            'netflix': 'NFLX',
            'comcast': 'CMCSA',

            // Energy
            'exxon': 'XOM',
            'exxon mobil': 'XOM',
            'exxonmobil': 'XOM',
            'chevron': 'CVX',
            'conocophillips': 'COP'
        };
    }

    /**
     * Normalize a ticker or company name to a ticker symbol
     * @param {string} input - Ticker or company name
     * @returns {string} Ticker symbol
     */
    normalize(input) {
        if (!input || typeof input !== 'string') {
            return null;
        }

        const cleaned = input.trim();

        // If already a ticker (2-5 uppercase letters), return it
        if (/^[A-Z]{1,5}$/.test(cleaned)) {
            return cleaned;
        }

        // Try to match company name
        const lowerInput = cleaned.toLowerCase();
        const ticker = this.companyToTicker[lowerInput];

        if (ticker) {
            console.log(`  ✓ Normalized "${input}" → ${ticker}`);
            return ticker;
        }

        // Try partial match (remove common suffixes)
        const withoutSuffix = lowerInput
            .replace(/\s+(inc\.?|corp\.?|corporation|co\.?|ltd\.?|llc)$/i, '')
            .trim();

        const partialMatch = this.companyToTicker[withoutSuffix];
        if (partialMatch) {
            console.log(`  ✓ Normalized "${input}" → ${partialMatch}`);
            return partialMatch;
        }

        // If it looks like a ticker (short uppercase), try it
        if (/^[A-Z]{2,5}$/i.test(cleaned)) {
            return cleaned.toUpperCase();
        }

        console.log(`  ⚠ Could not normalize "${input}"`);
        return null;
    }

    /**
     * Normalize array of tickers/names
     * @param {Array} inputs - Array of tickers or company names
     * @returns {Array} Array of ticker symbols
     */
    normalizeAll(inputs) {
        if (!Array.isArray(inputs)) {
            return [];
        }

        return inputs
            .map(input => this.normalize(input))
            .filter(Boolean); // Remove nulls
    }
}

module.exports = TickerNormalizer;

/**
 * Web Search Module
 * DEFAULT: Web scraping (free)
 * OPTIONAL: Google Custom Search API (disabled by default)
 */

const https = require('https');
const http = require('http');

class WebSearch {
    constructor(config = {}) {
        // Google Custom Search API (DISABLED by default - ready for future use)
        this.googleApiKey = config.googleApiKey || null;
        this.googleSearchEngineId = config.googleSearchEngineId || null;
        this.useGoogleSearch = config.useGoogleSearch || false; // DISABLED

        // Cache settings
        this.cache = new Map();
        this.cacheTimeout = config.cacheTimeout || 3600000; // 1 hour

        console.log(`🔍 WebSearch initialized: ${this.useGoogleSearch ? 'Google API (ENABLED)' : 'Web Scraping (DEFAULT)'}`);
    }

    /**
     * Search the web for information
     * @param {string} query - Search query
     * @param {number} limit - Maximum results
     * @returns {Promise<Array>} Search results
     */
    async search(query, limit = 5) {
        console.log(`🌐 Web search for: "${query}"`);

        // Check cache first
        const cacheKey = `${query}-${limit}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log('💾 Using cached search results');
            return cached;
        }

        let results;

        // Use Google API if enabled, otherwise web scraping
        if (this.useGoogleSearch && this.googleApiKey) {
            results = await this.searchWithGoogle(query, limit);
        } else {
            results = await this.searchWithScraping(query, limit);
        }

        // Cache the results
        this.saveToCache(cacheKey, results);

        return results;
    }

    /**
     * Google Custom Search API (DISABLED - code ready for future use)
     */
    async searchWithGoogle(query, limit = 5) {
        console.log('🔍 Using Google Custom Search API');

        try {
            const url = `https://www.googleapis.com/customsearch/v1?` +
                `key=${this.googleApiKey}` +
                `&cx=${this.googleSearchEngineId}` +
                `&q=${encodeURIComponent(query)}` +
                `&num=${limit}`;

            const data = await this.fetchJson(url);

            if (!data.items || data.items.length === 0) {
                console.warn('⚠️ Google search returned no results');
                return [];
            }

            return data.items.map(item => ({
                title: item.title,
                snippet: item.snippet,
                link: item.link,
                source: 'google'
            }));

        } catch (error) {
            console.error('❌ Google Search API error:', error.message);
            // Fallback to scraping if Google API fails
            return this.searchWithScraping(query, limit);
        }
    }

    /**
     * Web Scraping (DEFAULT method - FREE)
     * Scrapes DuckDuckGo HTML search results
     */
    async searchWithScraping(query, limit = 5) {
        console.log('🕷️  Using web scraping (default, free method)');

        try {
            // Use DuckDuckGo HTML search (doesn't require API)
            const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

            const html = await this.fetchHtml(searchUrl);
            const results = this.parseSearchResults(html, limit);

            console.log(`✅ Scraped ${results.length} results`);
            return results;

        } catch (error) {
            console.error('❌ Web scraping error:', error.message);
            return [];
        }
    }

    /**
     * Parse DuckDuckGo HTML search results
     */
    parseSearchResults(html, limit) {
        const results = [];

        try {
            // Simple regex-based parsing (faster than loading full DOM parser)
            const resultPattern = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]+)<\/a>/g;

            let match;
            while ((match = resultPattern.exec(html)) !== null && results.length < limit) {
                results.push({
                    title: this.decodeHtml(match[2]),
                    snippet: this.decodeHtml(match[3]),
                    link: match[1],
                    source: 'duckduckgo'
                });
            }

            // Fallback: Try alternative pattern if first fails
            if (results.length === 0) {
                const altPattern = /<h2[^>]*class="result__title"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]+)/g;

                while ((match = altPattern.exec(html)) !== null && results.length < limit) {
                    results.push({
                        title: this.decodeHtml(match[2]),
                        snippet: this.decodeHtml(match[3]),
                        link: match[1],
                        source: 'duckduckgo'
                    });
                }
            }

        } catch (error) {
            console.error('❌ Parse error:', error.message);
        }

        return results;
    }

    /**
     * Fetch HTML content
     */
    fetchHtml(url) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;
            const timeoutMs = 10000; // 10 seconds

            const req = protocol.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }, (res) => {
                let data = '';

                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                });
            });

            req.on('error', reject);
            req.setTimeout(timeoutMs, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    /**
     * Fetch JSON data (for Google API)
     */
    async fetchJson(url) {
        const html = await this.fetchHtml(url);
        return JSON.parse(html);
    }

    /**
     * Decode HTML entities
     */
    decodeHtml(html) {
        return html
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .trim();
    }

    /**
     * Cache management
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    saveToCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        // Clean old cache entries
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Search cache cleared');
    }

    /**
     * Format search results for AI consumption
     */
    formatForAI(results) {
        if (!results || results.length === 0) {
            return 'No web search results found.';
        }

        let formatted = '**Web Search Results:**\n\n';

        results.forEach((result, idx) => {
            formatted += `${idx + 1}. **${result.title}**\n`;
            formatted += `   ${result.snippet}\n`;
            formatted += `   Source: ${result.link}\n\n`;
        });

        return formatted;
    }
}

module.exports = WebSearch;

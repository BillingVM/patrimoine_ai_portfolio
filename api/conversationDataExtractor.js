/**
 * Conversation Data Extractor
 * Extracts financial data from conversation history to maintain consistency
 */

class ConversationDataExtractor {
    constructor() {
        // Regex patterns for extracting financial data
        this.patterns = {
            // Stock price: "AAPL: $272.36" or "Apple (AAPL) - 100 shares * $272.36"
            stockPrice: /(?:([A-Z]{1,5})[\s:]*(?:\$|USD)?[\s]*\$?(\d+\.?\d*))|(?:\(([A-Z]{1,5})\)[^\$]*\$(\d+\.?\d*))/g,

            // Metrics: "P/E ratio of 33.846" or "RSI: 65.2"
            metric: /(?:P\/E|PE|RSI|Beta|Dividend Yield|Market Cap)[\s:]*(?:of\s+)?(\d+\.?\d*)/gi,

            // Portfolio value: "portfolio is: $76,471.75" or "Total value: $76,471.75"
            portfolioValue: /(?:portfolio|total)(?:\s+value)?(?:\s+is)?[\s:]*\$?([\d,]+\.?\d*)/gi,

            // Holdings: "60 shares" or "100 shares *"
            shares: /(\d+)\s+shares/gi
        };
    }

    /**
     * Extract financial data from conversation history
     * @param {Array} history - Conversation history [{role, content}]
     * @returns {Object} Extracted data with timestamps
     */
    extract(history) {
        const extractedData = {
            stockPrices: {},      // { AAPL: { price: 272.36, messageIndex: 2, timestamp: ... } }
            portfolioHoldings: {}, // { AAPL: { shares: 100, messageIndex: 1 } }
            metrics: {},          // { AAPL_PE: { value: 33.846, messageIndex: 2 } }
            portfolioValue: null, // { value: 76471.75, messageIndex: 2 }
            metadata: {
                messagesAnalyzed: 0,
                lastUpdated: new Date().toISOString()
            }
        };

        if (!history || history.length === 0) {
            return extractedData;
        }

        // Process messages in FORWARD order (earliest first) to preserve initial data
        // This ensures consistency - we use the first mention, not the latest
        for (let i = 0; i < history.length; i++) {
            const message = history[i];

            // Only extract from assistant messages (contains data) and user messages
            if (message.role !== 'assistant' && message.role !== 'user') continue;

            extractedData.metadata.messagesAnalyzed++;

            // Extract stock prices
            this.extractStockPrices(message.content, i, extractedData.stockPrices);

            // Extract holdings (shares)
            this.extractHoldings(message.content, i, extractedData.portfolioHoldings);

            // Extract portfolio total value
            this.extractPortfolioValue(message.content, i, extractedData);
        }

        console.log(`📚 Conversation Data Extracted:`);
        console.log(`   Stock Prices: ${Object.keys(extractedData.stockPrices).length} tickers`);
        if (Object.keys(extractedData.stockPrices).length > 0) {
            Object.entries(extractedData.stockPrices).forEach(([ticker, data]) => {
                console.log(`      ${ticker}: $${data.price} (msg ${data.messageIndex})`);
            });
        }
        console.log(`   Holdings: ${Object.keys(extractedData.portfolioHoldings).length} positions`);
        if (extractedData.portfolioValue) {
            console.log(`   Portfolio Value: $${extractedData.portfolioValue.value.toLocaleString()}`);
        }

        return extractedData;
    }

    /**
     * Extract stock prices from text
     */
    extractStockPrices(text, messageIndex, stockPrices) {
        let match;
        this.patterns.stockPrice.lastIndex = 0; // Reset regex

        while ((match = this.patterns.stockPrice.exec(text)) !== null) {
            // match[1] or match[3] = ticker, match[2] or match[4] = price
            const ticker = (match[1] || match[3])?.toUpperCase();
            const priceStr = match[2] || match[4];

            if (ticker && priceStr) {
                const price = parseFloat(priceStr);

                // Only store if we don't have this ticker yet (earliest mention wins for consistency)
                if (!stockPrices[ticker] && !isNaN(price) && price > 0) {
                    stockPrices[ticker] = {
                        price: price,
                        messageIndex: messageIndex,
                        confidence: 'high'
                    };
                    console.log(`   📊 Extracted ${ticker}: $${price} (from message ${messageIndex})`);
                }
            }
        }
    }

    /**
     * Extract holdings (number of shares) from text
     */
    extractHoldings(text, messageIndex, portfolioHoldings) {
        // Look for patterns like:
        // "Apple Inc. (AAPL) - 100 shares" or
        // "Apple Inc. (AAPL): 100 shares *"
        const holdingPattern = /([A-Z][a-z\s&.]+)\s*\(([A-Z]{1,5})\)\s*[:\-]\s*(\d+)\s+shares/g;
        let match;

        while ((match = holdingPattern.exec(text)) !== null) {
            const companyName = match[1].trim();
            const ticker = match[2].toUpperCase();
            const shares = parseInt(match[3]);

            if (ticker && !isNaN(shares) && shares > 0) {
                // Only store if we don't have this ticker yet (earliest mention wins)
                if (!portfolioHoldings[ticker]) {
                    portfolioHoldings[ticker] = {
                        shares: shares,
                        companyName: companyName,
                        messageIndex: messageIndex
                    };
                    console.log(`   📦 Extracted ${ticker}: ${shares} shares (from message ${messageIndex})`);
                }
            }
        }
    }

    /**
     * Extract portfolio total value from text
     */
    extractPortfolioValue(text, messageIndex, extractedData) {
        // Don't overwrite if we already have a value
        if (extractedData.portfolioValue) return;

        let match;
        this.patterns.portfolioValue.lastIndex = 0;

        while ((match = this.patterns.portfolioValue.exec(text)) !== null) {
            const valueStr = match[1].replace(/,/g, ''); // Remove commas
            const value = parseFloat(valueStr);

            if (!isNaN(value) && value > 0) {
                extractedData.portfolioValue = {
                    value: value,
                    messageIndex: messageIndex
                };
                break; // Take first match
            }
        }
    }

    /**
     * Merge extracted data with fresh API data
     * Shows what's changed, what's new, what's preserved
     * @param {Object} extractedData - Data from conversation
     * @param {Object} freshData - Fresh data from APIs
     * @returns {Object} Merged data with provenance
     */
    mergeWithFreshData(extractedData, freshData) {
        const merged = {
            stockPrices: {},
            changes: [],
            preserved: [],
            fresh: [],
            metadata: {
                mergedAt: new Date().toISOString(),
                hasUpdates: false
            }
        };

        // Get all unique tickers
        const allTickers = new Set([
            ...Object.keys(extractedData.stockPrices || {}),
            ...Object.keys(freshData.fundamentals || {}),
            ...Object.keys(freshData.prices || {})
        ]);

        for (const ticker of allTickers) {
            const conversationPrice = extractedData.stockPrices[ticker]?.price;
            const freshPrice = freshData.prices?.[ticker]?.price || freshData.fundamentals?.[ticker]?.price;

            if (conversationPrice && freshPrice) {
                // We have both - check if changed
                const priceChanged = Math.abs(conversationPrice - freshPrice) > 0.01;

                if (priceChanged) {
                    merged.stockPrices[ticker] = {
                        price: freshPrice,
                        previousPrice: conversationPrice,
                        source: 'updated',
                        change: freshPrice - conversationPrice,
                        changePercent: ((freshPrice - conversationPrice) / conversationPrice * 100).toFixed(2)
                    };
                    merged.changes.push(ticker);
                    merged.metadata.hasUpdates = true;
                } else {
                    merged.stockPrices[ticker] = {
                        price: freshPrice,
                        source: 'confirmed', // Fresh API confirms conversation data
                        messageIndex: extractedData.stockPrices[ticker].messageIndex
                    };
                    merged.preserved.push(ticker);
                }
            } else if (conversationPrice && !freshPrice) {
                // Preserve conversation data if API didn't return fresh data
                merged.stockPrices[ticker] = {
                    price: conversationPrice,
                    source: 'conversation',
                    messageIndex: extractedData.stockPrices[ticker].messageIndex,
                    stale: true
                };
                merged.preserved.push(ticker);
            } else if (freshPrice && !conversationPrice) {
                // New data from API
                merged.stockPrices[ticker] = {
                    price: freshPrice,
                    source: 'api',
                    new: true
                };
                merged.fresh.push(ticker);
            }
        }

        // Log merge summary
        console.log(`🔀 Data Merge Summary:`);
        console.log(`   Preserved: ${merged.preserved.length} (from conversation)`);
        console.log(`   Updated: ${merged.changes.length} (price changed)`);
        console.log(`   Fresh: ${merged.fresh.length} (new from API)`);

        if (merged.changes.length > 0) {
            console.log(`   Changes detected:`);
            merged.changes.forEach(ticker => {
                const data = merged.stockPrices[ticker];
                console.log(`      ${ticker}: $${data.previousPrice} → $${data.price} (${data.changePercent > 0 ? '+' : ''}${data.changePercent}%)`);
            });
        }

        return merged;
    }

    /**
     * Format merged data for AI context
     * Shows data provenance and changes clearly
     */
    formatForAI(mergedData, extractedData) {
        let context = '';

        if (mergedData.changes.length > 0) {
            context += '📊 PRICE UPDATES (since last message):\n';
            mergedData.changes.forEach(ticker => {
                const data = mergedData.stockPrices[ticker];
                context += `   ${ticker}: $${data.previousPrice} → $${data.price} (${data.changePercent > 0 ? '+' : ''}${data.changePercent}%)\n`;
            });
            context += '\n';
        }

        if (mergedData.preserved.length > 0 || mergedData.fresh.length > 0) {
            context += '💰 CURRENT PRICES:\n';

            // Show preserved first (from conversation)
            mergedData.preserved.forEach(ticker => {
                const data = mergedData.stockPrices[ticker];
                const holding = extractedData.portfolioHoldings?.[ticker];
                if (holding) {
                    context += `   ${ticker}: $${data.price} × ${holding.shares} shares = $${(data.price * holding.shares).toFixed(2)}\n`;
                } else {
                    context += `   ${ticker}: $${data.price}\n`;
                }
            });

            // Show fresh data
            mergedData.fresh.forEach(ticker => {
                const data = mergedData.stockPrices[ticker];
                context += `   ${ticker}: $${data.price} (new)\n`;
            });
        }

        return context;
    }
}

module.exports = ConversationDataExtractor;

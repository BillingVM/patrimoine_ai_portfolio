/**
 * Multi-Client Specialized Prompter Agent (SPA)
 * Generates context-aware prompts for multi-client/multi-portfolio queries
 */

class MultiClientSPA {
    constructor() {
        this.name = 'MultiClientSPA';
    }

    /**
     * Generate enhanced prompt based on scope
     */
    async generatePrompt(userMessage, scope, entities, context) {
        const { summary, clients, soloPortfolios } = context;

        switch (scope) {
            case 'all_clients':
                return this.generateAllClientsPrompt(userMessage, summary, clients, soloPortfolios);

            case 'specific_client':
                return this.generateSpecificClientPrompt(userMessage, entities, clients);

            case 'specific_portfolio':
                return this.generateSpecificPortfolioPrompt(userMessage, entities, clients, soloPortfolios);

            case 'comparison':
                return this.generateComparisonPrompt(userMessage, entities, clients, soloPortfolios);

            case 'multiple_clients':
                return this.generateMultipleClientsPrompt(userMessage, entities, clients);

            case 'solo':
                return this.generateSoloPrompt(userMessage, soloPortfolios);

            default:
                return this.generateAllClientsPrompt(userMessage, summary, clients, soloPortfolios);
        }
    }

    /**
     * Generate prompt for "all clients" scope
     */
    generateAllClientsPrompt(userMessage, summary, clients, soloPortfolios) {
        let prompt = `PORTFOLIO MANAGEMENT CONTEXT:
You are analyzing ALL clients for an investment advisory firm.

AGGREGATE SUMMARY:
- Total Clients: ${summary.totalClients}
- Total Portfolios: ${summary.totalPortfolios}
- Total AUM: ${this.formatCurrency(summary.totalAUM)}
- Total Holdings: ${summary.totalHoldings} stocks/assets
`;

        if (soloPortfolios.length > 0) {
            const soloAUM = soloPortfolios.reduce((sum, p) => sum + parseFloat(p.total_value || 0), 0);
            prompt += `- Solo/Agency Portfolios: ${soloPortfolios.length} (${this.formatCurrency(soloAUM)})\n`;
        }

        prompt += `\nCLIENT BREAKDOWN:\n`;

        clients.forEach((client, idx) => {
            const clientAUM = parseFloat(client.total_aum || 0);
            const percentage = summary.totalAUM > 0 ? (clientAUM / summary.totalAUM * 100).toFixed(1) : 0;

            prompt += `\n${idx + 1}. ${client.name} (${this.formatEntityType(client.entity_type)}) - AUM: ${this.formatCurrency(clientAUM)} (${percentage}% of total)\n`;

            if (client.portfolios && client.portfolios.length > 0) {
                client.portfolios.forEach(portfolio => {
                    const portValue = parseFloat(portfolio.total_value || 0);
                    const portPercentage = clientAUM > 0 ? (portValue / clientAUM * 100).toFixed(1) : 0;
                    const portName = portfolio.portfolio_name || `Portfolio #${portfolio.id}`;

                    prompt += `   - ${portName}: ${this.formatCurrency(portValue)} (${portPercentage}% of client)\n`;

                    // Include top holdings if available
                    if (portfolio.holdings && portfolio.holdings.length > 0) {
                        const topHoldings = portfolio.holdings.slice(0, 3);
                        prompt += `     Holdings: `;
                        prompt += topHoldings.map(h => `${h.ticker} (${h.percentage.toFixed(1)}%)`).join(', ');
                        if (portfolio.holdings.length > 3) {
                            prompt += `, +${portfolio.holdings.length - 3} more`;
                        }
                        prompt += `\n`;
                    }
                });
            } else {
                prompt += `   - No portfolios\n`;
            }
        });

        if (soloPortfolios.length > 0) {
            prompt += `\nSOLO/AGENCY PORTFOLIOS:\n`;
            soloPortfolios.forEach(portfolio => {
                const portName = portfolio.portfolio_name || `Portfolio #${portfolio.id}`;
                prompt += `- ${portName}: ${this.formatCurrency(portfolio.total_value || 0)}\n`;

                if (portfolio.holdings && portfolio.holdings.length > 0) {
                    const topHoldings = portfolio.holdings.slice(0, 3);
                    prompt += `  Holdings: `;
                    prompt += topHoldings.map(h => `${h.ticker} (${h.percentage.toFixed(1)}%)`).join(', ');
                    prompt += `\n`;
                }
            });
        }

        prompt += `\nUSER QUESTION: ${userMessage}\n\n`;
        prompt += `INSTRUCTIONS:\n`;
        prompt += `- Provide aggregate analysis across all clients\n`;
        prompt += `- Highlight top performers and underperformers\n`;
        prompt += `- Use specific client and portfolio names when relevant\n`;
        prompt += `- Include concrete numbers (AUM, percentages, dollar amounts)\n`;
        prompt += `- Be professional and actionable\n`;

        return prompt;
    }

    /**
     * Generate prompt for specific client scope
     */
    generateSpecificClientPrompt(userMessage, entities, clients) {
        const client = clients.find(c => c.id === entities.clients[0].id);

        if (!client) {
            return `CLIENT NOT FOUND\nUSER QUESTION: ${userMessage}`;
        }

        const clientAUM = parseFloat(client.total_aum || 0);

        let prompt = `PORTFOLIO MANAGEMENT CONTEXT:
You are analyzing portfolios for CLIENT: ${client.name} (${this.formatEntityType(client.entity_type)})

CLIENT OVERVIEW:
- Total AUM: ${this.formatCurrency(clientAUM)}
- Number of Portfolios: ${client.portfolios.length}
- Total Holdings: ${client.total_holdings || 0} assets
`;

        if (client.email) {
            prompt += `- Email: ${client.email}\n`;
        }

        if (client.portfolios && client.portfolios.length > 0) {
            prompt += `\nPORTFOLIOS:\n`;

            client.portfolios.forEach((portfolio, idx) => {
                const portValue = parseFloat(portfolio.total_value || 0);
                const portPercentage = clientAUM > 0 ? (portValue / clientAUM * 100).toFixed(1) : 0;
                const portName = portfolio.portfolio_name || `Portfolio #${portfolio.id}`;

                prompt += `\n${idx + 1}. ${portName} (${this.formatCurrency(portValue)} - ${portPercentage}% of total)\n`;

                if (portfolio.holdings && portfolio.holdings.length > 0) {
                    portfolio.holdings.forEach(holding => {
                        prompt += `   - ${holding.ticker}: ${this.formatCurrency(holding.value)} (${holding.percentage.toFixed(1)}%)\n`;
                    });
                }
            });
        } else {
            prompt += `\nNo portfolios found for this client.\n`;
        }

        prompt += `\nUSER QUESTION: ${userMessage}\n\n`;
        prompt += `INSTRUCTIONS:\n`;
        prompt += `- Focus specifically on ${client.name}'s portfolios\n`;
        prompt += `- Compare portfolios to each other if relevant\n`;
        prompt += `- Reference specific holdings when answering\n`;
        prompt += `- Provide actionable insights for this client\n`;

        return prompt;
    }

    /**
     * Generate prompt for specific portfolio scope
     */
    generateSpecificPortfolioPrompt(userMessage, entities, clients, soloPortfolios) {
        const portfolioEntity = entities.portfolios[0];
        let portfolio = null;
        let client = null;

        // Search in client portfolios
        if (portfolioEntity.clientId) {
            client = clients.find(c => c.id === portfolioEntity.clientId);
            if (client) {
                portfolio = client.portfolios.find(p => p.id === portfolioEntity.id);
            }
        } else {
            // Search in solo portfolios
            portfolio = soloPortfolios.find(p => p.id === portfolioEntity.id);
        }

        if (!portfolio) {
            return `PORTFOLIO NOT FOUND\nUSER QUESTION: ${userMessage}`;
        }

        const portValue = parseFloat(portfolio.total_value || 0);
        const portName = portfolio.portfolio_name || `Portfolio #${portfolio.id}`;

        let prompt = `PORTFOLIO MANAGEMENT CONTEXT:
You are analyzing a specific portfolio.

PORTFOLIO: ${portName}
`;

        if (client) {
            prompt += `- Client: ${client.name} (${this.formatEntityType(client.entity_type)})\n`;
        } else {
            prompt += `- Type: Solo/Agency Portfolio\n`;
        }

        prompt += `- Total Value: ${this.formatCurrency(portValue)}\n`;
        prompt += `- Number of Holdings: ${portfolio.holdings_count || 0}\n`;
        prompt += `- Last Updated: ${new Date(portfolio.uploaded_at).toLocaleDateString()}\n`;

        if (portfolio.holdings && portfolio.holdings.length > 0) {
            prompt += `\nHOLDINGS:\n`;
            portfolio.holdings.forEach(holding => {
                prompt += `- ${holding.ticker} (${holding.name || 'Unknown'}): ${this.formatCurrency(holding.value)} (${holding.percentage.toFixed(1)}%)\n`;
            });
        }

        prompt += `\nUSER QUESTION: ${userMessage}\n\n`;
        prompt += `INSTRUCTIONS:\n`;
        prompt += `- Focus specifically on this portfolio\n`;
        prompt += `- Analyze individual holdings in detail\n`;
        prompt += `- Provide specific recommendations\n`;
        prompt += `- Reference exact dollar amounts and percentages\n`;

        return prompt;
    }

    /**
     * Generate prompt for comparison scope
     */
    generateComparisonPrompt(userMessage, entities, clients, soloPortfolios) {
        let prompt = `PORTFOLIO MANAGEMENT CONTEXT:
You are comparing multiple entities (clients, portfolios, or holdings).

`;

        // If comparing specific stocks across clients
        if (entities.stocks.length > 0) {
            prompt += `COMPARISON TYPE: Stock Holdings Across Portfolios\n`;
            prompt += `STOCK(S): ${entities.stocks.join(', ')}\n\n`;

            entities.stocks.forEach(stock => {
                prompt += `${stock} DISTRIBUTION:\n`;

                clients.forEach(client => {
                    client.portfolios.forEach(portfolio => {
                        if (portfolio.holdings) {
                            const holding = portfolio.holdings.find(h =>
                                h.ticker.toUpperCase() === stock.toUpperCase()
                            );

                            if (holding) {
                                const portName = portfolio.portfolio_name || `Portfolio #${portfolio.id}`;
                                prompt += `- ${client.name} / ${portName}: ${this.formatCurrency(holding.value)} (${holding.percentage.toFixed(1)}% of portfolio)\n`;
                            }
                        }
                    });
                });

                // Check solo portfolios too
                soloPortfolios.forEach(portfolio => {
                    if (portfolio.holdings) {
                        const holding = portfolio.holdings.find(h =>
                            h.ticker.toUpperCase() === stock.toUpperCase()
                        );

                        if (holding) {
                            const portName = portfolio.portfolio_name || `Portfolio #${portfolio.id}`;
                            prompt += `- Solo/Agency / ${portName}: ${this.formatCurrency(holding.value)} (${holding.percentage.toFixed(1)}% of portfolio)\n`;
                        }
                    }
                });

                prompt += `\n`;
            });
        }
        // If comparing specific clients
        else if (entities.clients.length > 1) {
            prompt += `COMPARISON TYPE: Multiple Clients\n\n`;

            entities.clients.forEach(clientEntity => {
                const client = clients.find(c => c.id === clientEntity.id);
                if (client) {
                    const clientAUM = parseFloat(client.total_aum || 0);
                    prompt += `CLIENT: ${client.name}\n`;
                    prompt += `- AUM: ${this.formatCurrency(clientAUM)}\n`;
                    prompt += `- Portfolios: ${client.portfolios.length}\n`;
                    prompt += `- Holdings: ${client.total_holdings || 0}\n\n`;
                }
            });
        }
        // Generic comparison
        else {
            prompt += `COMPARISON TYPE: General\n`;
            prompt += `Comparing performance, allocation, or metrics across entities.\n\n`;
        }

        prompt += `USER QUESTION: ${userMessage}\n\n`;
        prompt += `INSTRUCTIONS:\n`;
        prompt += `- Provide side-by-side comparison\n`;
        prompt += `- Highlight key differences\n`;
        prompt += `- Use concrete numbers and percentages\n`;
        prompt += `- Identify winners and losers if applicable\n`;
        prompt += `- Provide recommendations based on comparison\n`;

        return prompt;
    }

    /**
     * Generate prompt for multiple clients scope
     */
    generateMultipleClientsPrompt(userMessage, entities, clients) {
        const selectedClients = clients.filter(c =>
            entities.clients.some(ec => ec.id === c.id)
        );

        let prompt = `PORTFOLIO MANAGEMENT CONTEXT:
You are analyzing MULTIPLE specific clients.

SELECTED CLIENTS (${selectedClients.length}):\n\n`;

        selectedClients.forEach((client, idx) => {
            const clientAUM = parseFloat(client.total_aum || 0);
            prompt += `${idx + 1}. ${client.name} (${this.formatEntityType(client.entity_type)})\n`;
            prompt += `   - AUM: ${this.formatCurrency(clientAUM)}\n`;
            prompt += `   - Portfolios: ${client.portfolios.length}\n`;

            if (client.portfolios.length > 0) {
                client.portfolios.forEach(portfolio => {
                    const portName = portfolio.portfolio_name || `Portfolio #${portfolio.id}`;
                    prompt += `     • ${portName}: ${this.formatCurrency(portfolio.total_value || 0)}\n`;
                });
            }

            prompt += `\n`;
        });

        prompt += `USER QUESTION: ${userMessage}\n\n`;
        prompt += `INSTRUCTIONS:\n`;
        prompt += `- Focus on these specific clients\n`;
        prompt += `- Compare them to each other if relevant\n`;
        prompt += `- Provide insights for each client\n`;
        prompt += `- Use specific names and concrete numbers\n`;

        return prompt;
    }

    /**
     * Generate prompt for solo portfolios scope
     */
    generateSoloPrompt(userMessage, soloPortfolios) {
        const totalSoloAUM = soloPortfolios.reduce((sum, p) => sum + parseFloat(p.total_value || 0), 0);

        let prompt = `PORTFOLIO MANAGEMENT CONTEXT:
You are analyzing SOLO/AGENCY portfolios (portfolios not assigned to any client).

SOLO PORTFOLIO OVERVIEW:
- Total Portfolios: ${soloPortfolios.length}
- Total Value: ${this.formatCurrency(totalSoloAUM)}\n\n`;

        if (soloPortfolios.length > 0) {
            prompt += `PORTFOLIOS:\n`;
            soloPortfolios.forEach((portfolio, idx) => {
                const portName = portfolio.portfolio_name || `Portfolio #${portfolio.id}`;
                const portValue = parseFloat(portfolio.total_value || 0);

                prompt += `\n${idx + 1}. ${portName} (${this.formatCurrency(portValue)})\n`;

                if (portfolio.holdings && portfolio.holdings.length > 0) {
                    portfolio.holdings.forEach(holding => {
                        prompt += `   - ${holding.ticker}: ${this.formatCurrency(holding.value)} (${holding.percentage.toFixed(1)}%)\n`;
                    });
                }
            });
        } else {
            prompt += `No solo portfolios found.\n`;
        }

        prompt += `\nUSER QUESTION: ${userMessage}\n\n`;
        prompt += `INSTRUCTIONS:\n`;
        prompt += `- Focus on agency's own portfolios\n`;
        prompt += `- Analyze performance and allocation\n`;
        prompt += `- Provide strategic recommendations\n`;
        prompt += `- Reference specific holdings and amounts\n`;

        return prompt;
    }

    /**
     * Helper: Format entity type
     */
    formatEntityType(type) {
        const types = {
            'individual': 'Individual',
            'company': 'Company',
            'trust': 'Trust',
            'family': 'Family Office'
        };
        return types[type] || type;
    }

    /**
     * Helper: Format currency
     */
    formatCurrency(amount) {
        if (amount >= 1000000) {
            return `$${(amount / 1000000).toFixed(2)}M`;
        } else if (amount >= 1000) {
            return `$${(amount / 1000).toFixed(1)}K`;
        }
        return `$${amount.toFixed(2)}`;
    }
}

module.exports = MultiClientSPA;

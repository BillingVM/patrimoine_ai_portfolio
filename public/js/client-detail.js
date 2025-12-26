/**
 * Client Detail Page
 * Portfolio AI v1.1
 */

// Define global API_BASE if not already defined
window.API_BASE = window.API_BASE || 'https://sol.inoutconnect.com:11130/api';

// Get client ID from URL
const urlParams = new URLSearchParams(window.location.search);
const clientId = urlParams.get('id');

// DOM elements
const clientNameEl = document.getElementById('clientName');
const clientSubtitleEl = document.getElementById('clientSubtitle');
const entityTypeEl = document.getElementById('entityType');
const emailEl = document.getElementById('email');
const phoneEl = document.getElementById('phone');
const memberSinceEl = document.getElementById('memberSince');
const portfolioCountEl = document.getElementById('portfolioCount');
const reportCountEl = document.getElementById('reportCount');
const totalAUMEl = document.getElementById('totalAUM');
const portfoliosGrid = document.getElementById('portfoliosGrid');
const clientInfoSection = document.getElementById('clientInfoSection');
const statsSection = document.getElementById('statsSection');
const editClientBtn = document.getElementById('editClientBtn');
const toast = document.getElementById('toast');

// Load client data on page load
if (!clientId) {
    window.location.href = 'clients.php';
} else {
    loadClient();
}

// Event listeners
editClientBtn.addEventListener('click', () => {
    window.location.href = `clients.php?edit=${clientId}`;
});

/**
 * Load client data
 */
async function loadClient() {
    try {
        const response = await fetch(`${window.API_BASE}/clients/${clientId}`);
        const data = await response.json();

        if (data.success) {
            displayClient(data.client);
        } else {
            showError('Failed to load client');
            setTimeout(() => {
                window.location.href = 'clients.php';
            }, 2000);
        }
    } catch (error) {
        console.error('Error loading client:', error);
        showError('Error connecting to server');
    }
}

/**
 * Display client data
 */
function displayClient(client) {
    clientNameEl.textContent = client.name;
    clientSubtitleEl.textContent = `${formatEntityType(client.entity_type)} • Client ID: ${client.id}`;

    entityTypeEl.textContent = formatEntityType(client.entity_type);
    emailEl.textContent = client.email || 'Not provided';
    phoneEl.textContent = client.phone || 'Not provided';
    memberSinceEl.textContent = formatDate(client.created_at);

    portfolioCountEl.textContent = client.portfolio_count || 0;
    reportCountEl.textContent = client.report_count || 0;
    totalAUMEl.textContent = formatCurrency(client.total_aum || 0);

    clientInfoSection.style.display = 'block';
    statsSection.style.display = 'grid';

    // Load portfolios for this client
    loadPortfolios();
}

/**
 * Load portfolios for this client
 */
async function loadPortfolios() {
    try {
        portfoliosGrid.innerHTML = `
            <div class="empty-state">
                <div class="loading-spinner"></div>
                <p>Loading portfolios...</p>
            </div>
        `;

        const response = await fetch(`${window.API_BASE}/clients/${clientId}/portfolios`);
        const data = await response.json();

        if (data.success && data.portfolios.length > 0) {
            displayPortfolios(data.portfolios);
        } else {
            portfoliosGrid.innerHTML = `
                <div class="empty-state">
                    <h3>No portfolios yet</h3>
                    <p>Upload the first portfolio for this client</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading portfolios:', error);
        portfoliosGrid.innerHTML = `
            <div class="empty-state">
                <h3>Error loading portfolios</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

/**
 * Display portfolios in grid
 */
function displayPortfolios(portfolios) {
    portfoliosGrid.innerHTML = portfolios.map(portfolio => {
        // Parse raw data to extract holdings info
        const rawData = portfolio.raw_data || '';
        const holdings = parseHoldings(rawData);
        const stats = calculateStats(holdings, rawData);

        return `
        <div class="portfolio-card" data-id="${portfolio.id}">
            <!-- Header -->
            <div class="portfolio-header">
                <div class="portfolio-icon">
                    ${getPortfolioIconSVG(portfolio.file_type)}
                </div>
                <div class="portfolio-title">
                    <h3>${portfolio.portfolio_name || portfolio.original_name}</h3>
                    <div class="portfolio-date">${formatDate(portfolio.uploaded_at)}</div>
                </div>
            </div>

            <!-- Stats Row -->
            <div class="portfolio-stats">
                <div class="stat-item">
                    <span class="stat-label">Status</span>
                    <span class="status-badge active">Active</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Type</span>
                    <span class="stat-value">${stats.portfolioType}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Holdings</span>
                    <span class="stat-value">${stats.holdingsCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Value</span>
                    <span class="stat-value">${formatCurrency(stats.totalValue)}</span>
                </div>
            </div>

            <!-- Holdings Preview -->
            <div class="portfolio-holdings">
                <div class="holdings-header">
                    <span>Top Holdings</span>
                </div>
                <div class="holdings-list">
                    ${holdings.slice(0, 3).map(holding => `
                        <div class="holding-item">
                            <div class="holding-info">
                                <span class="holding-ticker">${holding.ticker}</span>
                                <span class="holding-name">${holding.name}</span>
                            </div>
                            <div class="holding-value">
                                <span class="value-amount">${formatCurrency(holding.value)}</span>
                                <span class="value-percent">${holding.percentage}%</span>
                            </div>
                        </div>
                    `).join('') || '<div class="holdings-empty">No holdings data available</div>'}
                </div>
            </div>

            <!-- Performance Row -->
            <div class="portfolio-performance">
                <div class="performance-item">
                    <span class="performance-label">YTD</span>
                    <span class="performance-value ${getPerformanceClass(stats.ytdReturn)}">${formatPerformance(stats.ytdReturn)}</span>
                </div>
                <div class="performance-item">
                    <span class="performance-label">1Y</span>
                    <span class="performance-value ${getPerformanceClass(stats.oneYearReturn)}">${formatPerformance(stats.oneYearReturn)}</span>
                </div>
            </div>

            <!-- Actions -->
            <div class="portfolio-actions">
                <button class="btn btn-primary btn-sm" data-action="chat" data-portfolio-id="${portfolio.id}">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    Chat
                </button>
                <button class="btn btn-secondary btn-sm" data-action="view" data-portfolio-id="${portfolio.id}">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    View Details
                </button>
            </div>
        </div>
    `;
    }).join('');

    // Attach event listeners for actions buttons
    attachPortfolioActionListeners();
}

/**
 * Attach event listeners to portfolio action buttons
 */
function attachPortfolioActionListeners() {
    // Handle all action button clicks
    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const portfolioId = btn.dataset.portfolioId;

            if (action === 'chat') {
                // Navigate to chat with portfolio context
                window.location.href = `chat.php?portfolio=${portfolioId}`;
            } else if (action === 'view') {
                // Navigate to chat with portfolio context (same as chat for now)
                window.location.href = `chat.php?portfolio=${portfolioId}`;
            }
        });
    });
}

/**
 * Get monochrome SVG icon for portfolio file type
 */
function getPortfolioIconSVG(fileType) {
    const iconMap = {
        'csv': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>',
        'xlsx': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>',
        'xls': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>',
        'pdf': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>',
        'json': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/></svg>',
        'jpg': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
        'jpeg': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
        'png': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>',
        'docx': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
        'doc': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
        'txt': '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'
    };
    return iconMap[fileType] || '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>';
}

/**
 * Parse holdings from raw data
 */
function parseHoldings(rawData) {
    if (!rawData) return [];

    try {
        // Try to parse as JSON first
        if (rawData.trim().startsWith('{') || rawData.trim().startsWith('[')) {
            const parsed = JSON.parse(rawData);
            if (Array.isArray(parsed)) {
                return parsed.slice(0, 5).map(h => ({
                    ticker: h.ticker || h.symbol || 'N/A',
                    name: h.name || h.description || 'Unknown',
                    value: parseFloat(h.value || h.amount || 0),
                    percentage: parseFloat(h.percentage || h.weight || 0)
                }));
            }
        }

        // Try to parse as CSV
        const lines = rawData.split('\n').filter(l => l.trim());
        if (lines.length < 2) return [];

        const holdings = [];
        const headers = lines[0].toLowerCase().split(',');

        for (let i = 1; i < Math.min(6, lines.length); i++) {
            const values = lines[i].split(',');
            const holding = {
                ticker: values[0] || 'N/A',
                name: values[1] || 'Unknown',
                value: parseFloat(values[2] || 0),
                percentage: parseFloat(values[3] || 0)
            };
            holdings.push(holding);
        }

        return holdings;
    } catch (error) {
        console.error('Error parsing holdings:', error);
        return [];
    }
}

/**
 * Calculate portfolio statistics
 */
function calculateStats(holdings, rawData) {
    const stats = {
        portfolioType: 'Mixed',
        holdingsCount: holdings.length || 0,
        totalValue: 0,
        ytdReturn: null,
        oneYearReturn: null
    };

    // Calculate total value
    if (holdings.length > 0) {
        stats.totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    }

    // Try to detect portfolio type from raw data
    if (rawData) {
        const lowerData = rawData.toLowerCase();
        if (lowerData.includes('stock') || lowerData.includes('equity')) {
            stats.portfolioType = 'Stocks';
        } else if (lowerData.includes('bond') || lowerData.includes('fixed income')) {
            stats.portfolioType = 'Bonds';
        } else if (lowerData.includes('crypto') || lowerData.includes('bitcoin')) {
            stats.portfolioType = 'Crypto';
        } else if (lowerData.includes('etf') || lowerData.includes('fund')) {
            stats.portfolioType = 'ETFs';
        }
    }

    // Mock performance data (would be calculated from actual data)
    stats.ytdReturn = Math.random() * 20 - 5; // Random between -5% and 15%
    stats.oneYearReturn = Math.random() * 30 - 10; // Random between -10% and 20%

    return stats;
}

/**
 * Get CSS class for performance value
 */
function getPerformanceClass(value) {
    if (value === null || value === undefined) return 'neutral';
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
}

/**
 * Format performance value
 */
function formatPerformance(value) {
    if (value === null || value === undefined) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}


/**
 * Show success message
 */
function showSuccess(message) {
    toast.textContent = message;
    toast.className = 'toast success';
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

/**
 * Show error message
 */
function showError(message) {
    toast.textContent = message;
    toast.className = 'toast error';
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}

/**
 * Format entity type
 */
function formatEntityType(type) {
    const types = {
        'individual': 'Individual',
        'company': 'Company',
        'trust': 'Trust',
        'family': 'Family Office'
    };
    return types[type] || type;
}

/**
 * Format date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Open chat history modal (called from sidebar)
 * Redirects to chat page where full chat history modal exists
 */
function openChatHistoryModal() {
    window.location.href = '/portai/public/chat.php?openHistory=1';
}

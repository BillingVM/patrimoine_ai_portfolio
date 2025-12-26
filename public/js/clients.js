/**
 * Clients Management Frontend
 * Portfolio AI v1.1
 */

// Define global API_BASE if not already defined
window.API_BASE = window.API_BASE || 'https://sol.inoutconnect.com:11130/api';

// DOM elements (will be initialized on DOMContentLoaded)
let clientsGrid, addClientBtn, clientModal, modalClose, cancelBtn, clientForm, modalTitle, submitBtn, toast;
let statsSection, totalClients, totalPortfolios, totalAUM, avgPortfolioValue, totalHoldings;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    clientsGrid = document.getElementById('clientsGrid');
    addClientBtn = document.getElementById('addClientBtn');
    clientModal = document.getElementById('clientModal');
    modalClose = document.getElementById('modalClose');
    cancelBtn = document.getElementById('cancelBtn');
    clientForm = document.getElementById('clientForm');
    modalTitle = document.getElementById('modalTitle');
    submitBtn = document.getElementById('submitBtn');
    toast = document.getElementById('toast');

    statsSection = document.getElementById('statsSection');
    totalClients = document.getElementById('totalClients');
    totalPortfolios = document.getElementById('totalPortfolios');
    totalAUM = document.getElementById('totalAUM');
    avgPortfolioValue = document.getElementById('avgPortfolioValue');
    totalHoldings = document.getElementById('totalHoldings');

    // Setup event listeners
    if (addClientBtn) {
        addClientBtn.addEventListener('click', () => openModal());
    }

    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }

    if (clientForm) {
        clientForm.addEventListener('submit', handleSubmit);
    }

    // Close modal on overlay click
    if (clientModal) {
        clientModal.addEventListener('click', (e) => {
            if (e.target === clientModal) {
                closeModal();
            }
        });
    }

    // Load clients
    loadClients();
});

/**
 * Load all clients from API
 */
async function loadClients() {
    try {
        showLoading();

        const response = await fetch(`${window.API_BASE}/clients`);
        const data = await response.json();

        if (data.success) {
            displayClients(data.clients);
            updateStats(data.clients);
        } else {
            showError('Failed to load clients');
        }
    } catch (error) {
        console.error('Error loading clients:', error);
        showError('Error connecting to server');
    }
}

/**
 * Display clients in grid
 */
function displayClients(clients) {
    if (clients.length === 0) {
        clientsGrid.innerHTML = `
            <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="64" height="64">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3>No clients yet</h3>
                <p>Add your first client to get started</p>
            </div>
        `;
        return;
    }

    clientsGrid.innerHTML = clients.map(client => `
        <div class="client-card" data-client-id="${client.id}">
            <div class="client-header">
                <h3>${escapeHtml(client.name)}</h3>
                <span class="entity-badge entity-${client.entity_type}">${formatEntityType(client.entity_type)}</span>
            </div>

            ${client.email ? `
                <div class="client-info">
                    <span class="info-text">${escapeHtml(client.email)}</span>
                </div>
            ` : ''}

            ${client.phone ? `
                <div class="client-info">
                    <span class="info-text">${escapeHtml(client.phone)}</span>
                </div>
            ` : ''}

            <div class="client-stats">
                <div class="stat-item">
                    <span class="stat-number">${client.portfolio_count || 0}</span>
                    <span class="stat-label">Portfolios</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${formatCurrency(client.total_aum || 0)}</span>
                    <span class="stat-label">AUM</span>
                </div>
            </div>

            <div class="client-actions">
                <button class="btn btn-sm btn-primary" onclick="viewClient(${client.id})">
                    View
                </button>
                <button class="btn btn-sm btn-secondary" onclick="editClient(${client.id})">
                    Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteClient(${client.id})">
                    Delete
                </button>
            </div>

            <div class="client-meta">
                Added ${formatDate(client.created_at)}
            </div>
        </div>
    `).join('');
}

/**
 * Update statistics
 */
async function updateStats(clients) {
    const totalPortfolioCount = clients.reduce((sum, c) => sum + (parseInt(c.portfolio_count) || 0), 0);

    // Update basic stats
    totalClients.textContent = clients.length;
    totalPortfolios.textContent = totalPortfolioCount;

    // Fetch all portfolios to calculate AUM and holdings
    try {
        const portfolioStats = await fetchAllPortfoliosStats(clients);

        totalAUM.textContent = formatCurrency(portfolioStats.totalAUM);
        avgPortfolioValue.textContent = formatCurrency(portfolioStats.avgValue);
        totalHoldings.textContent = portfolioStats.totalHoldings;
    } catch (error) {
        console.error('Error fetching portfolio stats:', error);
        totalAUM.textContent = '$0';
        avgPortfolioValue.textContent = '$0';
        totalHoldings.textContent = '0';
    }

    statsSection.style.display = clients.length > 0 ? 'grid' : 'none';
}

/**
 * Fetch all portfolios and calculate aggregate statistics
 */
async function fetchAllPortfoliosStats(clients) {
    let totalAUMValue = 0;
    let totalHoldingsCount = 0;
    let portfolioCount = 0;

    // Fetch portfolios for each client
    for (const client of clients) {
        try {
            const response = await fetch(`${window.API_BASE}/clients/${client.id}/portfolios`);
            const data = await response.json();

            if (data.success && data.portfolios) {
                portfolioCount += data.portfolios.length;

                for (const portfolio of data.portfolios) {
                    // Parse raw data to extract holdings
                    const holdings = parsePortfolioHoldings(portfolio.raw_data);

                    // Calculate total value
                    const portfolioValue = holdings.reduce((sum, h) => sum + h.value, 0);
                    totalAUMValue += portfolioValue;
                    totalHoldingsCount += holdings.length;
                }
            }
        } catch (error) {
            console.error(`Error fetching portfolios for client ${client.id}:`, error);
        }
    }

    return {
        totalAUM: totalAUMValue,
        avgValue: portfolioCount > 0 ? totalAUMValue / portfolioCount : 0,
        totalHoldings: totalHoldingsCount
    };
}

/**
 * Parse holdings from portfolio raw data
 */
function parsePortfolioHoldings(rawData) {
    if (!rawData) return [];

    try {
        // Try to parse as JSON first
        if (rawData.trim().startsWith('{') || rawData.trim().startsWith('[')) {
            const parsed = JSON.parse(rawData);
            if (Array.isArray(parsed)) {
                return parsed.map(h => ({
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
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length >= 3) {
                holdings.push({
                    ticker: values[0] || 'N/A',
                    name: values[1] || 'Unknown',
                    value: parseFloat(values[2] || 0),
                    percentage: parseFloat(values[3] || 0)
                });
            }
        }

        return holdings;
    } catch (error) {
        console.error('Error parsing holdings:', error);
        return [];
    }
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Open modal for add/edit
 */
function openModal(clientId = null) {
    if (!clientModal) {
        console.error('Modal element not found!');
        return;
    }

    if (clientId) {
        // Edit mode
        modalTitle.textContent = 'Edit Client';
        submitBtn.textContent = 'Update Client';
        loadClientForEdit(clientId);
    } else {
        // Add mode
        modalTitle.textContent = 'Add New Client';
        submitBtn.textContent = 'Create Client';
        clientForm.reset();
        document.getElementById('clientId').value = '';
    }

    clientModal.classList.add('show');
    clientModal.style.display = 'flex'; // Override inline style
}

/**
 * Close modal
 */
function closeModal() {
    clientModal.classList.remove('show');
    clientModal.style.display = 'none'; // Hide modal
    clientForm.reset();
    document.getElementById('clientId').value = '';
}

/**
 * Load client data for editing
 */
async function loadClientForEdit(clientId) {
    try {
        const response = await fetch(`${window.API_BASE}/clients/${clientId}`);
        const data = await response.json();

        if (data.success) {
            const client = data.client;
            document.getElementById('clientId').value = client.id;
            document.getElementById('clientName').value = client.name;
            document.getElementById('clientEntity').value = client.entity_type;
            document.getElementById('clientEmail').value = client.email || '';
            document.getElementById('clientPhone').value = client.phone || '';
        } else {
            showError('Failed to load client');
        }
    } catch (error) {
        console.error('Error loading client:', error);
        showError('Error loading client');
    }
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
    e.preventDefault();

    const clientId = document.getElementById('clientId').value;
    const clientData = {
        name: document.getElementById('clientName').value.trim(),
        entity_type: document.getElementById('clientEntity').value,
        email: document.getElementById('clientEmail').value.trim(),
        phone: document.getElementById('clientPhone').value.trim()
    };

    // Validation
    if (!clientData.name) {
        showError('Client name is required');
        return;
    }

    try {
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        let response;
        if (clientId) {
            // Update existing client
            response = await fetch(`${window.API_BASE}/clients/${clientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clientData)
            });
        } else {
            // Create new client
            response = await fetch(`${window.API_BASE}/clients`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clientData)
            });
        }

        const data = await response.json();

        if (data.success) {
            closeModal();
            loadClients(); // Refresh list
            showSuccess(clientId ? 'Client updated successfully' : 'Client created successfully');
        } else {
            showError(data.error || 'Failed to save client');
        }
    } catch (error) {
        console.error('Error saving client:', error);
        showError('Error connecting to server');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = clientId ? 'Update Client' : 'Create Client';
    }
}

/**
 * View client details
 */
function viewClient(clientId) {
    window.location.href = `client-detail.php?id=${clientId}`;
}

/**
 * Edit client
 */
function editClient(clientId) {
    openModal(clientId);
}

/**
 * Delete client
 */
async function deleteClient(clientId) {
    if (!confirm('Are you sure you want to delete this client? This cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${window.API_BASE}/clients/${clientId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            loadClients(); // Refresh list
            showSuccess('Client deleted successfully');
        } else {
            showError(data.error || 'Failed to delete client');
        }
    } catch (error) {
        console.error('Error deleting client:', error);
        showError('Error connecting to server');
    }
}

// Make functions globally accessible for inline onclick handlers
window.viewClient = viewClient;
window.editClient = editClient;
window.deleteClient = deleteClient;

/**
 * Show loading state
 */
function showLoading() {
    clientsGrid.innerHTML = `
        <div class="empty-state">
            <div class="loading-spinner"></div>
            <p>Loading clients...</p>
        </div>
    `;
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
 * Utility: Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Format entity type for display
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
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
}

/**
 * Open chat history modal (called from sidebar)
 * Redirects to chat page where full chat history modal exists
 */
function openChatHistoryModal() {
    window.location.href = '/portai/public/chat.php?openHistory=1';
}

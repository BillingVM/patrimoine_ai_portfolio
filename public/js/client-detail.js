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
const uploadPortfolioBtn = document.getElementById('uploadPortfolioBtn');
const uploadModal = document.getElementById('uploadModal');
const uploadModalClose = document.getElementById('uploadModalClose');
const selectFileBtn = document.getElementById('selectFileBtn');
const fileInput = document.getElementById('fileInput');
const uploadSection = document.getElementById('uploadSection');
const uploadProgress = document.getElementById('uploadProgress');
const portfolioDropZone = document.getElementById('portfolioDropZone');
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

uploadPortfolioBtn.addEventListener('click', () => {
    uploadModal.classList.add('show');
});

uploadModalClose.addEventListener('click', closeUploadModal);

selectFileBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', handleFileUpload);

// Drag and drop - Modal upload section
uploadSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.classList.add('drag-over');
});

uploadSection.addEventListener('dragleave', () => {
    uploadSection.classList.remove('drag-over');
});

uploadSection.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        handleFileUpload();
    }
});

// Drag and drop - Portfolio drop zone on main page
if (portfolioDropZone) {
    // Click to upload
    portfolioDropZone.addEventListener('click', () => {
        uploadModal.classList.add('show');
    });

    // Drag over
    portfolioDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        portfolioDropZone.classList.add('drag-over');
    });

    // Drag leave
    portfolioDropZone.addEventListener('dragleave', (e) => {
        if (e.target === portfolioDropZone) {
            portfolioDropZone.classList.remove('drag-over');
        }
    });

    // Drop
    portfolioDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        portfolioDropZone.classList.remove('drag-over');

        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            handleFileUpload();
        }
    });
}

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
    portfoliosGrid.innerHTML = portfolios.map(portfolio => `
        <div class="portfolio-card" data-id="${portfolio.id}">
            <div class="portfolio-header">
                <div class="portfolio-icon">
                    ${getPortfolioIcon(portfolio.file_type)}
                </div>
                <div class="portfolio-info">
                    <h3 class="portfolio-name">${portfolio.portfolio_name || portfolio.original_name}</h3>
                    <p class="portfolio-meta">
                        ${formatFileType(portfolio.file_type)} • ${formatDate(portfolio.uploaded_at)}
                    </p>
                </div>
                <div class="portfolio-actions">
                    <button class="btn btn-primary btn-sm" data-action="chat" data-portfolio-id="${portfolio.id}">
                        💬 Chat
                    </button>
                    <button class="btn btn-danger btn-sm" data-action="delete" data-portfolio-id="${portfolio.id}">
                        🗑️ Delete
                    </button>
                    <button class="btn-icon actions-btn" data-portfolio-id="${portfolio.id}">
                        <svg fill="currentColor" viewBox="0 0 16 16" width="16" height="16">
                            <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                        </svg>
                    </button>
                    <div class="actions-menu" data-portfolio-id="${portfolio.id}" style="display: none;">
                        <button class="actions-menu-item" data-action="report" data-portfolio-id="${portfolio.id}">
                            📊 Generate a report for my portfolio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Attach event listeners for actions buttons
    attachPortfolioActionListeners();
}

/**
 * Attach event listeners to portfolio action buttons
 */
function attachPortfolioActionListeners() {
    // Handle Chat and Delete button clicks
    document.querySelectorAll('[data-action="chat"], [data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const portfolioId = btn.dataset.portfolioId;

            if (action === 'chat') {
                // Navigate to chat with portfolio context
                window.location.href = `chat.php?portfolio=${portfolioId}`;
            } else if (action === 'delete') {
                // Confirm and delete portfolio
                deletePortfolio(portfolioId);
            }
        });
    });

    // Toggle actions menu (three dots button)
    document.querySelectorAll('.actions-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const portfolioId = btn.dataset.portfolioId;
            const menu = document.querySelector(`.actions-menu[data-portfolio-id="${portfolioId}"]`);

            // Close all other menus
            document.querySelectorAll('.actions-menu').forEach(m => {
                if (m !== menu) m.style.display = 'none';
            });

            // Toggle this menu
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        });
    });

    // Handle menu item clicks
    document.querySelectorAll('.actions-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = item.dataset.action;
            const portfolioId = item.dataset.portfolioId;

            if (action === 'report') {
                // Navigate to report page or generate report
                window.location.href = `index.php?portfolio=${portfolioId}`;
            }

            // Close menu
            item.closest('.actions-menu').style.display = 'none';
        });
    });

    // Close menus when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.actions-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    });
}

/**
 * Delete portfolio with confirmation
 */
async function deletePortfolio(portfolioId) {
    const confirmed = confirm('Are you sure you want to delete this portfolio? This action cannot be undone.');

    if (!confirmed) return;

    try {
        const response = await fetch(`${window.API_BASE}/portfolio/${portfolioId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Portfolio deleted successfully');
            loadPortfolios(); // Reload portfolios
            loadClient(); // Refresh stats
        } else {
            showError(data.error || 'Failed to delete portfolio');
        }
    } catch (error) {
        console.error('Error deleting portfolio:', error);
        showError('Error deleting portfolio');
    }
}

/**
 * Get icon for portfolio file type
 */
function getPortfolioIcon(fileType) {
    const iconMap = {
        'csv': '📊',
        'xlsx': '📈',
        'xls': '📈',
        'pdf': '📄',
        'json': '📋',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'png': '🖼️',
        'docx': '📝',
        'doc': '📝',
        'txt': '📃'
    };
    return iconMap[fileType] || '📁';
}

/**
 * Format file type for display
 */
function formatFileType(fileType) {
    return fileType ? fileType.toUpperCase() : 'FILE';
}

/**
 * Handle file upload
 */
async function handleFileUpload() {
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('client_id', clientId);

    try {
        uploadSection.style.display = 'none';
        uploadProgress.style.display = 'block';

        const response = await fetch(`${window.API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Portfolio uploaded successfully');
            closeUploadModal();
            loadPortfolios();
            loadClient(); // Refresh stats
        } else {
            showError(data.error || 'Failed to upload portfolio');
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        showError('Error uploading file');
    } finally {
        uploadSection.style.display = 'block';
        uploadProgress.style.display = 'none';
        fileInput.value = '';
    }
}

/**
 * Close upload modal
 */
function closeUploadModal() {
    uploadModal.classList.remove('show');
    fileInput.value = '';
    uploadSection.style.display = 'block';
    uploadProgress.style.display = 'none';
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

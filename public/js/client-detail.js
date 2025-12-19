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

// Drag and drop
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

        // For now, show empty state
        // TODO: Implement client-specific portfolios API endpoint
        portfoliosGrid.innerHTML = `
            <div class="empty-state">
                <h3>No portfolios yet</h3>
                <p>Upload the first portfolio for this client</p>
            </div>
        `;
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

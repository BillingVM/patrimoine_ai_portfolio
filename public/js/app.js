/**
 * Portfolio AI - Frontend Application
 */

// API Base URL
const API_URL = 'https://sol.inoutconnect.com:11130/api';

// State
let portfolios = [];

/**
 * Initialize app on page load
 */
document.addEventListener('DOMContentLoaded', () => {
  setupUploadHandlers();
  loadPortfolios();
  loadCredits(); // Load credits balance
});

/**
 * Setup file upload handlers
 */
function setupUploadHandlers() {
  const uploadSection = document.getElementById('uploadSection');
  const fileInput = document.getElementById('fileInput');
  const uploadBtn = document.getElementById('uploadBtn');

  // Click to select file
  uploadBtn.addEventListener('click', () => fileInput.click());
  uploadSection.addEventListener('click', (e) => {
    if (e.target !== uploadBtn) {
      fileInput.click();
    }
  });

  // File selected
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  });

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
      uploadFile(e.dataTransfer.files[0]);
    }
  });
}

/**
 * Upload file to server
 */
async function uploadFile(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    showToast(`Uploading ${file.name}...`, 'info');

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }

    showToast('✅ Portfolio uploaded successfully!', 'success');

    // Refresh portfolios list
    await loadPortfolios();

    // Reset file input
    document.getElementById('fileInput').value = '';

  } catch (error) {
    console.error('Upload error:', error);
    showToast(`❌ Upload failed: ${error.message}`, 'error');
  }
}

/**
 * Load all portfolios from server
 */
async function loadPortfolios() {
  try {
    const response = await fetch(`${API_URL}/portfolios`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('Failed to load portfolios');
    }

    portfolios = data.portfolios;
    renderPortfolios();

  } catch (error) {
    console.error('Error loading portfolios:', error);
    showToast('Failed to load portfolios', 'error');
  }
}

/**
 * Render portfolios list
 */
function renderPortfolios() {
  const container = document.getElementById('portfoliosGrid');

  if (portfolios.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3>No portfolios yet</h3>
        <p>Upload your first portfolio to get started</p>
      </div>
    `;
    return;
  }

  container.innerHTML = portfolios.map(portfolio => `
    <div class="portfolio-card" data-id="${portfolio.id}">
      <div class="portfolio-header">
        <h3>${escapeHtml(portfolio.filename)}</h3>
        <span class="file-type-badge">${portfolio.fileType}</span>
      </div>

      <div class="portfolio-meta">
        📅 ${formatDate(portfolio.uploadedAt)}
        ${portfolio.hasReport ? '<br>✅ Report generated' : ''}
      </div>

      <div class="portfolio-actions">
        <button
          class="btn btn-success btn-small generate-report-btn"
          data-id="${portfolio.id}"
        >
          ${portfolio.hasReport ? '🔄 Make New Report' : '🤖 Generate Report'}
        </button>
        <button class="btn btn-secondary btn-small view-btn" data-id="${portfolio.id}">
          ${portfolio.hasReport ? '📊 View Report' : '📄 View Data'}
        </button>
      </div>
    </div>
  `).join('');

  // Add event listeners
  document.querySelectorAll('.generate-report-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      generateReport(id);
    });
  });

  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      viewPortfolio(id);
    });
  });
}

/**
 * Generate AI report for portfolio
 */
async function generateReport(portfolioId) {
  const btn = document.querySelector(`.generate-report-btn[data-id="${portfolioId}"]`);
  const originalText = btn.innerHTML;

  try {
    // Show loading state
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Generating...';

    const response = await fetch(`${API_URL}/generate-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ portfolioId }),
    });

    const data = await response.json();

    // Handle insufficient credits (402)
    if (response.status === 402) {
      showInsufficientCreditsModal(data.balance || 0);
      btn.disabled = false;
      btn.innerHTML = originalText;
      return;
    }

    if (!data.success) {
      throw new Error(data.message || 'Report generation failed');
    }

    // Show success with credits used
    const creditsUsed = data.credits.used;
    showToast(`✅ Report generated! Used ${creditsUsed.toLocaleString()} credits`, 'success');

    // Update credits balance
    if (data.credits.balance !== undefined) {
      updateCreditsDisplay(data.credits.balance);
    }

    // Refresh portfolios to show updated state
    await loadPortfolios();

    // Auto-view the report
    viewPortfolio(portfolioId);

  } catch (error) {
    console.error('Report generation error:', error);
    showToast(`❌ Failed to generate report: ${error.message}`, 'error');

    // Restore button
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

/**
 * View portfolio details and report in modal
 */
async function viewPortfolio(portfolioId) {
  try {
    const response = await fetch(`${API_URL}/portfolio/${portfolioId}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error('Failed to load portfolio');
    }

    const { portfolio } = data;

    if (!portfolio.report) {
      // Show raw data in modal
      showModal(
        `${portfolio.filename} - Portfolio Data`,
        `<pre style="overflow-x: auto; white-space: pre-wrap;">${escapeHtml(portfolio.rawData)}</pre>`,
        null
      );
    } else {
      // Show AI report in modal
      const report = portfolio.report;
      showModal(
        `${portfolio.filename} - AI Analysis Report`,
        formatMarkdown(report.content),
        `<div class="report-meta-footer">
          <span>🤖 ${report.aiModel}</span>
          <span>🔢 ${report.tokensUsed.toLocaleString()} tokens</span>
          <span>📅 ${formatDate(report.generatedAt)}</span>
        </div>`
      );
    }

  } catch (error) {
    console.error('Error viewing portfolio:', error);
    showToast('Failed to load portfolio', 'error');
  }
}

/**
 * Show modal with content
 */
function showModal(title, content, footer = null) {
  // Remove existing modal if any
  const existingModal = document.getElementById('reportModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal
  const modal = document.createElement('div');
  modal.id = 'reportModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-overlay"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2>${escapeHtml(title)}</h2>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;

  document.body.appendChild(modal);

  // Animate in
  requestAnimationFrame(() => {
    modal.classList.add('show');
  });

  // Close on overlay click
  modal.querySelector('.modal-overlay').addEventListener('click', closeModal);

  // Close on ESC key
  document.addEventListener('keydown', handleEscKey);
}

/**
 * Close modal
 */
function closeModal() {
  const modal = document.getElementById('reportModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
  document.removeEventListener('keydown', handleEscKey);
}

/**
 * Handle ESC key to close modal
 */
function handleEscKey(e) {
  if (e.key === 'Escape') {
    closeModal();
  }
}

// Make closeModal available globally
window.closeModal = closeModal;

/**
 * Simple markdown formatting
 */
function formatMarkdown(text) {
  // Convert markdown to HTML (basic)
  return text
    .replace(/### (.*)/g, '<h3>$1</h3>')
    .replace(/## (.*)/g, '<h2>$1</h2>')
    .replace(/# (.*)/g, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n- (.*)/g, '<br>• $1')
    .replace(/\n(\d+)\. (.*)/g, '<br>$1. $2');
}

/**
 * Format date
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== CREDITS MANAGEMENT ====================

let creditsBalance = 0;

/**
 * Load credits balance
 */
async function loadCredits() {
  try {
    const response = await fetch(`${API_URL}/credits/balance`);
    const data = await response.json();

    if (data.success) {
      creditsBalance = data.balance;
      updateCreditsDisplay(data.balance);
    }
  } catch (error) {
    console.error('Error loading credits:', error);
  }
}

/**
 * Update credits display in header
 */
function updateCreditsDisplay(balance) {
  const balanceEl = document.getElementById('creditsBalance');
  if (!balanceEl) return;

  // Format balance
  const formatted = balance.toLocaleString();
  balanceEl.textContent = formatted;

  // Update styling based on balance
  balanceEl.classList.remove('low', 'depleted');
  if (balance <= 0) {
    balanceEl.classList.add('depleted');
  } else if (balance < 20000) {
    balanceEl.classList.add('low');
  }
}

/**
 * Show add credits modal
 */
function showAddCreditsModal() {
  const modalContent = `
    <h3 style="margin-top: 0;">Purchase Credits</h3>
    <p>Select a package or enter a custom amount:</p>

    <div class="credits-purchase-options">
      <div class="credit-option" onclick="selectCreditOption(10000)">
        <div class="credit-amount">10,000</div>
        <div class="credit-price">$0.30</div>
      </div>
      <div class="credit-option" onclick="selectCreditOption(50000)">
        <div class="credit-amount">50,000</div>
        <div class="credit-price">$1.50</div>
      </div>
      <div class="credit-option" onclick="selectCreditOption(100000)">
        <div class="credit-amount">100,000</div>
        <div class="credit-price">$3.00</div>
        <div style="font-size: 0.75rem; color: var(--success); margin-top: 0.25rem;">POPULAR</div>
      </div>
      <div class="credit-option" onclick="selectCreditOption(500000)">
        <div class="credit-amount">500,000</div>
        <div class="credit-price">$15.00</div>
        <div style="font-size: 0.75rem; color: var(--accent); margin-top: 0.25rem;">BEST VALUE</div>
      </div>
    </div>

    <div style="margin-top: 1.5rem;">
      <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary);">
        Or enter custom amount (min. 10,000):
      </label>
      <input
        type="number"
        id="customCreditAmount"
        class="custom-amount-input"
        placeholder="Enter amount..."
        min="10000"
        step="1000"
        oninput="updatePurchaseSummary()"
      />
    </div>

    <div class="purchase-summary" id="purchaseSummary" style="display: none;">
      <div class="purchase-summary-row">
        <span>Credits:</span>
        <span id="summaryCredits">0</span>
      </div>
      <div class="purchase-summary-row total">
        <span>Total:</span>
        <span id="summaryPrice">$0.00</span>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-success" onclick="processCreditPurchase()" id="purchaseBtn" disabled>
      💳 Complete Purchase
    </button>
  `;

  showModal('Add Credits', modalContent, footer);
}

/**
 * Select credit option
 */
function selectCreditOption(amount) {
  // Clear custom input
  const customInput = document.getElementById('customCreditAmount');
  if (customInput) customInput.value = '';

  // Highlight selected
  document.querySelectorAll('.credit-option').forEach(el => el.classList.remove('selected'));
  event.target.closest('.credit-option').classList.add('selected');

  // Update summary
  updatePurchaseSummary(amount);
}

/**
 * Update purchase summary
 */
function updatePurchaseSummary(amount = null) {
  const customInput = document.getElementById('customCreditAmount');
  const purchaseBtn = document.getElementById('purchaseBtn');
  const summary = document.getElementById('purchaseSummary');

  if (!amount) {
    amount = parseInt(customInput?.value) || 0;
  }

  if (amount >= 10000) {
    const price = (amount * 3 / 100000).toFixed(2);

    document.getElementById('summaryCredits').textContent = amount.toLocaleString();
    document.getElementById('summaryPrice').textContent = `$${price}`;

    summary.style.display = 'block';
    purchaseBtn.disabled = false;
    purchaseBtn.dataset.amount = amount;
  } else {
    summary.style.display = 'none';
    purchaseBtn.disabled = true;
  }
}

/**
 * Process credit purchase (simulated)
 */
async function processCreditPurchase() {
  const purchaseBtn = document.getElementById('purchaseBtn');
  const amount = parseInt(purchaseBtn.dataset.amount);

  if (!amount || amount < 10000) {
    showToast('Please select a valid amount (min. 10,000 credits)', 'error');
    return;
  }

  try {
    purchaseBtn.disabled = true;
    purchaseBtn.innerHTML = '<span class="spinner"></span> Processing...';

    const response = await fetch(`${API_URL}/credits/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Purchase failed');
    }

    showToast(`✅ Successfully added ${amount.toLocaleString()} credits!`, 'success');

    // Update balance
    await loadCredits();

    // Close modal
    closeModal();

  } catch (error) {
    console.error('Purchase error:', error);
    showToast(`❌ Purchase failed: ${error.message}`, 'error');

    purchaseBtn.disabled = false;
    purchaseBtn.innerHTML = '💳 Complete Purchase';
  }
}

/**
 * Show insufficient credits modal
 */
function showInsufficientCreditsModal(balance) {
  const modalContent = `
    <div style="text-align: center; padding: 2rem 0;">
      <div style="font-size: 4rem; margin-bottom: 1rem;">💳</div>
      <h3 style="color: var(--danger); margin-top: 0;">Insufficient Credits</h3>
      <p style="font-size: 1.125rem; margin: 1rem 0;">
        Your current balance: <strong>${balance.toLocaleString()}</strong> credits
      </p>
      <p style="color: var(--text-muted);">
        You need credits to generate AI reports. Each report uses tokens based on the portfolio size and analysis depth.
      </p>
      <div style="margin: 2rem 0; padding: 1.5rem; background: var(--bg-primary); border-radius: 8px;">
        <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem;">Pricing:</div>
        <div style="font-size: 1.25rem; font-weight: 600; color: var(--accent);">
          100,000 tokens = $3.00
        </div>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-success" onclick="closeModal(); showAddCreditsModal();">
      💳 Add Credits
    </button>
  `;

  showModal('Insufficient Credits', modalContent, footer);
}

// Make functions available globally
window.showAddCreditsModal = showAddCreditsModal;
window.selectCreditOption = selectCreditOption;
window.updatePurchaseSummary = updatePurchaseSummary;
window.processCreditPurchase = processCreditPurchase;

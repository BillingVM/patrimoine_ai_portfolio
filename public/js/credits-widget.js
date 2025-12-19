/**
 * Credits Widget - Dropdown functionality and API integration
 */

const API_BASE = 'https://sol.inoutconnect.com:11130/api';

// DOM Elements
const creditsWidgetTrigger = document.getElementById('creditsWidgetTrigger');
const creditsDropdown = document.getElementById('creditsDropdown');
const widgetCreditsBalance = document.getElementById('widgetCreditsBalance');
const dropdownCreditsBalance = document.getElementById('dropdownCreditsBalance');
const addCreditsBtn = document.getElementById('addCreditsBtn');

// State
let isDropdownOpen = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCredits();
    setupEventListeners();

    // Auto-refresh credits every 30 seconds
    setInterval(loadCredits, 30000);
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Toggle dropdown on click
    creditsWidgetTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (isDropdownOpen && !creditsDropdown.contains(e.target)) {
            closeDropdown();
        }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isDropdownOpen) {
            closeDropdown();
        }
    });

    // Add credits button
    if (addCreditsBtn) {
        addCreditsBtn.addEventListener('click', () => {
            closeDropdown();
            showAddCreditsModal();
        });
    }
}

/**
 * Toggle dropdown visibility
 */
function toggleDropdown() {
    if (isDropdownOpen) {
        closeDropdown();
    } else {
        openDropdown();
    }
}

/**
 * Open dropdown
 */
function openDropdown() {
    isDropdownOpen = true;
    creditsDropdown.classList.add('show');
    creditsWidgetTrigger.classList.add('active');
}

/**
 * Close dropdown
 */
function closeDropdown() {
    isDropdownOpen = false;
    creditsDropdown.classList.remove('show');
    creditsWidgetTrigger.classList.remove('active');
}

/**
 * Load credits balance from API
 */
async function loadCredits() {
    try {
        const response = await fetch(`${API_BASE}/credits/balance`);
        const data = await response.json();

        if (data.success) {
            updateCreditsDisplay(data.balance, data.hasCredits);
        }
    } catch (error) {
        console.error('Error loading credits:', error);
        updateCreditsDisplay(0, false);
    }
}

/**
 * Update credits display in widget
 */
function updateCreditsDisplay(balance, hasCredits) {
    // Format balance with commas
    const formattedBalance = new Intl.NumberFormat('en-US').format(balance);

    // Update widget trigger text
    widgetCreditsBalance.textContent = formattedBalance;

    // Update dropdown balance
    const balanceNumber = dropdownCreditsBalance.querySelector('.balance-number');
    balanceNumber.textContent = formattedBalance;

    // Add status classes
    balanceNumber.classList.remove('low', 'depleted');
    if (balance === 0) {
        balanceNumber.classList.add('depleted');
    } else if (balance < 10000) {
        balanceNumber.classList.add('low');
    }
}

/**
 * Show add credits modal
 */
function showAddCreditsModal() {
    const modal = document.getElementById('addCreditsModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

<!-- Add Credits Modal -->
<div class="modal" id="addCreditsModal" style="display: none;">
    <div class="modal-content modal-credits">
        <div class="modal-header">
            <h2>Add Credits</h2>
            <button class="modal-close" id="addCreditsModalClose">&times;</button>
        </div>
        <div class="modal-body">
            <h3 class="credits-section-title">Purchase Credits</h3>
            <p class="credits-section-subtitle">Select a package or enter a custom amount:</p>

            <div class="credits-package-list">
                <!-- Package Option 1 -->
                <label class="credits-package-option">
                    <input type="radio" name="creditPackage" value="10000" data-price="0.30">
                    <div class="package-info">
                        <div class="package-amount">10,000</div>
                        <div class="package-price">$0.30</div>
                    </div>
                </label>

                <!-- Package Option 2 -->
                <label class="credits-package-option">
                    <input type="radio" name="creditPackage" value="50000" data-price="1.50">
                    <div class="package-info">
                        <div class="package-amount">50,000</div>
                        <div class="package-price">$1.50</div>
                    </div>
                </label>

                <!-- Package Option 3 -->
                <label class="credits-package-option">
                    <input type="radio" name="creditPackage" value="100000" data-price="3.00">
                    <div class="package-info">
                        <div class="package-amount">100,000</div>
                        <div class="package-price">$3.00</div>
                    </div>
                </label>

                <!-- Package Option 4 - Popular -->
                <label class="credits-package-option package-popular">
                    <input type="radio" name="creditPackage" value="500000" data-price="15.00" checked>
                    <div class="package-badges">
                        <span class="package-badge badge-popular">POPULAR</span>
                    </div>
                    <div class="package-info">
                        <div class="package-amount">500,000</div>
                        <div class="package-price">$15.00</div>
                    </div>
                    <div class="package-badge badge-value">BEST VALUE</div>
                </label>
            </div>

            <div class="credits-custom-section">
                <label for="customAmount" class="custom-amount-label">Or enter custom amount (min. 10,000):</label>
                <input type="number" id="customAmount" class="custom-amount-input" placeholder="Enter amount..." min="10000" step="1000">
            </div>

            <div class="modal-footer-inline">
                <button type="button" class="btn btn-secondary" onclick="closeAddCreditsModal()">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="completePurchase()">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" style="margin-right: 8px;">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Complete Purchase
                </button>
            </div>
        </div>
    </div>
</div>

<style>
/* Add Credits Modal Styling */
.modal-credits {
    max-width: 500px;
}

.credits-section-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.credits-section-subtitle {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-bottom: 1.25rem;
}

.credits-package-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
}

.credits-package-option {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--bg-tertiary);
    border: 2px solid var(--border-primary);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.credits-package-option:hover {
    border-color: var(--accent-blue);
    background: var(--bg-secondary);
}

.credits-package-option input[type="radio"] {
    margin-right: 1rem;
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.credits-package-option input[type="radio"]:checked ~ .package-info {
    color: var(--accent-blue);
}

.package-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex: 1;
}

.package-amount {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
}

.package-price {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-secondary);
}

.credits-package-option.package-popular {
    border-color: var(--success);
    background: linear-gradient(135deg, rgba(16, 201, 127, 0.05) 0%, var(--bg-tertiary) 100%);
}

.credits-package-option.package-popular:hover {
    border-color: var(--success);
    background: linear-gradient(135deg, rgba(16, 201, 127, 0.08) 0%, var(--bg-secondary) 100%);
}

.package-badges {
    position: absolute;
    top: -8px;
    left: 50px;
    display: flex;
    gap: 0.5rem;
}

.package-badge {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.badge-popular {
    background: var(--success);
    color: #000;
}

.badge-value {
    position: absolute;
    bottom: -8px;
    right: 1rem;
    background: linear-gradient(135deg, #D4AF37 0%, #F0B90B 100%);
    color: #000;
}

.credits-custom-section {
    padding: 1rem 0;
    border-top: 1px solid var(--border-primary);
    margin-bottom: 1.5rem;
}

.custom-amount-label {
    display: block;
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: 0.75rem;
}

.custom-amount-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--bg-tertiary);
    border: 2px solid var(--border-primary);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 0.875rem;
    transition: all 0.2s ease;
}

.custom-amount-input:focus {
    outline: none;
    border-color: var(--accent-blue);
    background: var(--bg-secondary);
}

.custom-amount-input::placeholder {
    color: var(--text-muted);
}

.modal-footer-inline {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 1rem;
}

.modal-footer-inline .btn {
    padding: 0.625rem 1.5rem;
}

.modal-footer-inline .btn svg {
    display: inline-block;
    vertical-align: middle;
}
</style>

<script>
/**
 * Universal toast notification function
 */
function showToastNotification(message, type = 'success') {
    // Try to use existing showToast function if available
    if (typeof showToast === 'function') {
        showToast(message, type);
        return;
    }

    // Fallback: use basic toast implementation
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }
}

/**
 * Complete purchase - handles both package and custom amount
 */
async function completePurchase() {
    try {
        const API_BASE = 'https://sol.inoutconnect.com:11130/api';

        // Check for custom amount first
        const customAmountInput = document.getElementById('customAmount');
        let amount, price;

        if (customAmountInput && customAmountInput.value) {
            amount = parseInt(customAmountInput.value);
            if (amount < 10000) {
                showToastNotification('Minimum amount is 10,000 credits', 'error');
                return;
            }
            // Calculate price based on custom amount (same rate as packages)
            price = (amount / 10000) * 0.30;
        } else {
            // Get selected package
            const selectedPackage = document.querySelector('input[name="creditPackage"]:checked');
            if (!selectedPackage) {
                showToastNotification('Please select a package or enter custom amount', 'error');
                return;
            }
            amount = parseInt(selectedPackage.value);
            price = parseFloat(selectedPackage.dataset.price);
        }

        const response = await fetch(`${API_BASE}/credits/purchase`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                price: price
            })
        });

        const data = await response.json();

        if (data.success) {
            // Close modal
            closeAddCreditsModal();

            // Show success message
            showToastNotification(`Successfully added ${amount.toLocaleString()} credits!`, 'success');

            // Reload credits widget
            if (typeof loadCredits === 'function') {
                loadCredits();
            }
        } else {
            showToastNotification(data.message || 'Failed to purchase credits', 'error');
        }
    } catch (error) {
        console.error('Error purchasing credits:', error);
        showToastNotification('Failed to purchase credits', 'error');
    }
}

/**
 * Close add credits modal
 */
function closeAddCreditsModal() {
    const modal = document.getElementById('addCreditsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
}

// Setup modal close handlers
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('addCreditsModal');
    const closeBtn = document.getElementById('addCreditsModalClose');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeAddCreditsModal);
    }

    if (modal) {
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAddCreditsModal();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeAddCreditsModal();
            }
        });
    }
});
</script>

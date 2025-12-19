<!-- Credits Dropdown Widget -->
<div class="credits-widget">
    <button class="credits-trigger" id="creditsWidgetTrigger">
        <svg class="credits-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="credits-balance-text" id="widgetCreditsBalance">...</span>
        <svg class="credits-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="6 9 12 15 18 9" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    </button>

    <div class="credits-dropdown" id="creditsDropdown">
        <div class="credits-dropdown-header">
            <div class="credits-dropdown-label">Credit Balance</div>
            <div class="credits-dropdown-balance" id="dropdownCreditsBalance">
                <span class="balance-number">0</span>
                <span class="balance-unit">tokens</span>
            </div>
        </div>

        <div class="credits-dropdown-actions">
            <button class="btn btn-primary btn-block" id="addCreditsBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="12" y1="5" x2="12" y2="19" stroke-linecap="round"/>
                    <line x1="5" y1="12" x2="19" y2="12" stroke-linecap="round"/>
                </svg>
                Add Credits
            </button>
            <a href="credits-history.php" class="credits-history-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                View History
            </a>
        </div>

        <div class="credits-dropdown-footer">
            <div class="pricing-info">
                <span class="pricing-label">Rate:</span>
                <span class="pricing-value">50,000 tokens/USD</span>
            </div>
        </div>
    </div>
</div>

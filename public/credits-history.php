<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Credits History - Portfolio AI</title>
    <link rel="icon" type="image/svg+xml" href="/portai/public/favicon.svg">
    <link rel="alternate icon" href="/portai/public/favicon.ico">

    <?php
    // Dynamically load CSS with cache busting
    $cssFile = __DIR__ . '/css/style.css';

    $sidebarCssFile = __DIR__ . '/css/sidebar.css';
    $sidebarCssVersion = file_exists($sidebarCssFile) ? filemtime($sidebarCssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/sidebar.css?v={$sidebarCssVersion}\">";

    $creditsWidgetCssFile = __DIR__ . '/css/credits-widget.css';
    $creditsWidgetCssVersion = file_exists($creditsWidgetCssFile) ? filemtime($creditsWidgetCssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/credits-widget.css?v={$creditsWidgetCssVersion}\">";
    $cssVersion = file_exists($cssFile) ? filemtime($cssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/style.css?v={$cssVersion}\">";

    $sidebarCssFile = __DIR__ . '/css/sidebar.css';
    $sidebarCssVersion = file_exists($sidebarCssFile) ? filemtime($sidebarCssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/sidebar.css?v={$sidebarCssVersion}\">";

    $creditsWidgetCssFile = __DIR__ . '/css/credits-widget.css';
    $creditsWidgetCssVersion = file_exists($creditsWidgetCssFile) ? filemtime($creditsWidgetCssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/credits-widget.css?v={$creditsWidgetCssVersion}\">";

    $transactionCssFile = __DIR__ . '/css/transaction-history.css';
    $transactionCssVersion = file_exists($transactionCssFile) ? filemtime($transactionCssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/transaction-history.css?v={$transactionCssVersion}\">";

    $luxuryCssFile = __DIR__ . '/css/theme-luxury.css';
    $luxuryCssVersion = file_exists($luxuryCssFile) ? filemtime($luxuryCssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/theme-luxury.css?v={$luxuryCssVersion}\">";
    ?>
</head>
<body>
    <?php include __DIR__ . '/includes/sidebar.php'; ?>
    <main class="main-content">
        <div class="container">
        <!-- Header -->
        <header class="header">
            <div class="header-left">
                <h1>Credits History</h1>
                <p>View your token usage and purchase history</p>
            </div>
            <div class="header-actions">
                <?php include __DIR__ . '/includes/credits-widget.php'; ?>
                <a href="index.php" class="btn btn-secondary">← Back to Dashboard</a>
            </div>
        </header>

        <!-- Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin: 2rem 0;">
            <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem;">
                <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem;">Current Balance</div>
                <div id="summaryBalance" style="font-size: 2rem; font-weight: 600; color: var(--accent);">Loading...</div>
            </div>
            <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem;">
                <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem;">Total Used</div>
                <div id="summaryUsed" style="font-size: 2rem; font-weight: 600; color: var(--danger);">Loading...</div>
            </div>
            <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem;">
                <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem;">Total Purchased</div>
                <div id="summaryPurchased" style="font-size: 2rem; font-weight: 600; color: var(--success);">Loading...</div>
            </div>
            <div style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem;">
                <div style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 0.5rem;">Reports Generated</div>
                <div id="summaryReports" style="font-size: 2rem; font-weight: 600; color: var(--text-primary);">Loading...</div>
            </div>
        </div>

        <!-- History Table -->
        <section style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; margin-top: 2rem;">
            <h2>Transaction History</h2>
            <table class="history-table" id="historyTable">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th style="text-align: right;">Amount</th>
                        <th style="text-align: right;">Balance After</th>
                    </tr>
                </thead>
                <tbody id="historyBody">
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                            Loading history...
                        </td>
                    </tr>
                </tbody>
            </table>
        </section>
    </div>

    <script>
        const API_URL = 'https://sol.inoutconnect.com:11130/api';

        // Load summary and history
        async function loadHistory() {
            try {
                // Load summary
                const summaryResponse = await fetch(`${API_URL}/credits/balance`);
                const summary = await summaryResponse.json();

                if (summary.success) {
                    document.getElementById('summaryBalance').textContent = summary.balance.toLocaleString();
                    document.getElementById('summaryUsed').textContent = summary.totalUsed.toLocaleString();
                    document.getElementById('summaryPurchased').textContent = summary.totalPurchased.toLocaleString();
                    document.getElementById('summaryReports').textContent = summary.reportsGenerated.toLocaleString();
                }

                // Load history
                const historyResponse = await fetch(`${API_URL}/credits/history`);
                const historyData = await historyResponse.json();

                if (historyData.success && historyData.history.length > 0) {
                    renderHistory(historyData.history);
                } else {
                    document.getElementById('historyBody').innerHTML = `
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                                No transactions yet
                            </td>
                        </tr>
                    `;
                }

            } catch (error) {
                console.error('Error loading history:', error);
                document.getElementById('historyBody').innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 3rem; color: var(--danger);">
                            Failed to load history
                        </td>
                    </tr>
                `;
            }
        }

        // Render history table
        function renderHistory(history) {
            const tbody = document.getElementById('historyBody');

            if (!history || history.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="empty-transaction-state">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            <div>No transactions yet</div>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = history.map(tx => {
                const date = new Date(tx.created_at).toLocaleString();
                const amountClass = tx.amount > 0 ? 'amount-positive' : 'amount-negative';
                const typeClass = tx.transaction_type === 'purchase' ? 'purchase' : 'usage';
                const amountFormatted = Math.abs(tx.amount).toLocaleString();
                const balanceFormatted = tx.balance_after.toLocaleString();

                return `
                    <tr>
                        <td class="col-date">${date}</td>
                        <td class="col-type"><span class="transaction-type ${typeClass}">${tx.transaction_type}</span></td>
                        <td class="col-description">${escapeHtml(tx.description || '-')}</td>
                        <td class="col-amount ${amountClass}">${amountFormatted}</td>
                        <td class="col-balance"><span class="balance-value">${balanceFormatted}</span></td>
                    </tr>
                `;
            }).join('');
        }

        // Escape HTML
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Load on page load
        document.addEventListener('DOMContentLoaded', () => {
            loadHistory();
        });
    </script>

    <?php include __DIR__ . '/includes/add-credits-modal.php'; ?>

    <?php
    // Load credits widget JS
    $creditsWidgetJsFile = __DIR__ . '/js/credits-widget.js';
    $creditsWidgetJsVersion = file_exists($creditsWidgetJsFile) ? filemtime($creditsWidgetJsFile) : time();
    echo "<script src=\"/portai/public/js/credits-widget.js?v={$creditsWidgetJsVersion}\"></script>";
    ?>

    <script>
    /**
     * Open chat history modal (called from sidebar)
     * Redirects to chat page where full chat history modal exists
     */
    function openChatHistoryModal() {
        window.location.href = '/portai/public/chat.php?openHistory=1';
    }
    </script>
    </main>
</body>
</html>

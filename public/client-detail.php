<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Client Details - Portfolio AI</title>
    <link rel="icon" type="image/svg+xml" href="/portai/public/favicon.svg">
    <link rel="alternate icon" href="/portai/public/favicon.ico">

    <?php
    // Dynamic asset loading with cache busting
    $cssFile = __DIR__ . '/css/style.css';
    $cssVersion = file_exists($cssFile) ? filemtime($cssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/style.css?v={$cssVersion}\">";

    $sidebarCssFile = __DIR__ . '/css/sidebar.css';
    $sidebarCssVersion = file_exists($sidebarCssFile) ? filemtime($sidebarCssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/sidebar.css?v={$sidebarCssVersion}\">";

    $creditsWidgetCssFile = __DIR__ . '/css/credits-widget.css';
    $creditsWidgetCssVersion = file_exists($creditsWidgetCssFile) ? filemtime($creditsWidgetCssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/credits-widget.css?v={$creditsWidgetCssVersion}\">";

    $luxuryCssFile = __DIR__ . '/css/theme-luxury.css';
    $luxuryCssVersion = file_exists($luxuryCssFile) ? filemtime($luxuryCssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/theme-luxury.css?v={$luxuryCssVersion}\">";
    ?>

    <meta name="description" content="View client details and portfolios">
</head>
<body>
    <?php include __DIR__ . '/includes/sidebar.php'; ?>

    <main class="main-content">
        <div class="container">
            <!-- Header -->
            <header class="header">
                <div class="header-left">
                    <h1 id="clientName">Client Details</h1>
                    <p id="clientSubtitle">Loading client information...</p>
                </div>
                <div class="header-actions">
                    <?php include __DIR__ . '/includes/credits-widget.php'; ?>
                    <a href="clients.php" class="btn btn-secondary">← Back to Clients</a>
                    <button class="btn btn-primary" id="editClientBtn">Edit Client</button>
                </div>
            </header>

            <!-- Client Info Card -->
            <section class="client-info-section" id="clientInfoSection" style="display: none;">
                <div class="info-grid">
                    <div class="info-card">
                        <div class="info-label">Entity Type</div>
                        <div class="info-value" id="entityType">-</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Email</div>
                        <div class="info-value" id="email">-</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Phone</div>
                        <div class="info-value" id="phone">-</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Member Since</div>
                        <div class="info-value" id="memberSince">-</div>
                    </div>
                </div>
            </section>

            <!-- Stats Section -->
            <section class="stats-section" id="statsSection" style="display: none;">
                <div class="stat-card">
                    <div class="stat-content">
                        <div class="stat-value" id="portfolioCount">0</div>
                        <div class="stat-label">Portfolios</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-content">
                        <div class="stat-value" id="reportCount">0</div>
                        <div class="stat-label">Reports Generated</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-content">
                        <div class="stat-value" id="totalAUM">$0</div>
                        <div class="stat-label">Total AUM</div>
                    </div>
                </div>
            </section>

            <!-- Portfolios Section -->
            <section class="portfolios-section">
                <div class="section-header">
                    <h2>Portfolios</h2>
                    <a href="/portai/public/chat.php" class="btn btn-primary btn-sm">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" style="margin-right: 6px;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Upload via Chat
                    </a>
                </div>

                <div class="portfolios-grid" id="portfoliosGrid">
                    <div class="empty-state">
                        <div class="loading-spinner"></div>
                        <p>Loading portfolios...</p>
                    </div>
                </div>
            </section>
        </div>
    </main>

    <!-- Toast Notification -->
    <div class="toast" id="toast" style="display: none;"></div>

    <?php include __DIR__ . '/includes/add-credits-modal.php'; ?>

    <?php
    // Dynamically load JavaScript with cache busting
    $creditsWidgetJsFile = __DIR__ . '/js/credits-widget.js';
    $creditsWidgetJsVersion = file_exists($creditsWidgetJsFile) ? filemtime($creditsWidgetJsFile) : time();
    echo "<script src=\"/portai/public/js/credits-widget.js?v={$creditsWidgetJsVersion}\"></script>";

    $jsFile = __DIR__ . '/js/client-detail.js';
    $jsVersion = file_exists($jsFile) ? filemtime($jsFile) : time();
    echo "<script src=\"/portai/public/js/client-detail.js?v={$jsVersion}\"></script>";
    ?>
</body>
</html>

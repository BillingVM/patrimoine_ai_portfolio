<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clients - Portfolio AI</title>
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

    <meta name="description" content="Manage your clients and their portfolios">
</head>
<body>
    <?php include __DIR__ . '/includes/sidebar.php'; ?>

    <main class="main-content">
        <div class="container">
            <!-- Header -->
            <header class="header">
                <div class="header-left">
                    <h1>Clients</h1>
                    <p>Manage your clients and their investment portfolios</p>
                </div>
                <div class="header-actions">
                    <?php include __DIR__ . '/includes/credits-widget.php'; ?>
                    <button class="btn btn-primary" id="addClientBtn">+ Add Client</button>
                </div>
            </header>

            <!-- Stats Summary -->
            <section class="stats-section" id="statsSection" style="display: none;">
                <div class="stat-card">
                    <div class="stat-value" id="totalClients">0</div>
                    <div class="stat-label">Total Clients</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="totalPortfolios">0</div>
                    <div class="stat-label">Total Portfolios</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="totalReports">0</div>
                    <div class="stat-label">Reports Generated</div>
                </div>
            </section>

            <!-- Clients List -->
            <section class="clients-section">
                <div class="clients-grid" id="clientsGrid">
                    <div class="empty-state">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="64" height="64">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3>No clients yet</h3>
                        <p>Add your first client to get started</p>
                    </div>
                </div>
            </section>
        </div>
    </main>

    <!-- Add/Edit Client Modal -->
    <div class="modal" id="clientModal" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">Add New Client</h2>
                <button class="modal-close" id="modalClose">&times;</button>
            </div>
            <div class="modal-body">
            <form id="clientForm">
                <input type="hidden" id="clientId" value="">

                <div class="form-group">
                    <label for="clientName">Client Name *</label>
                    <input type="text" id="clientName" required placeholder="John Doe" autocomplete="name">
                </div>

                <div class="form-group">
                    <label for="clientEntity">Entity Type</label>
                    <select id="clientEntity">
                        <option value="individual">Individual</option>
                        <option value="company">Company</option>
                        <option value="trust">Trust</option>
                        <option value="family">Family Office</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="clientEmail">Email</label>
                    <input type="email" id="clientEmail" placeholder="john@example.com" autocomplete="email">
                </div>

                <div class="form-group">
                    <label for="clientPhone">Phone</label>
                    <input type="tel" id="clientPhone" placeholder="555-0123" autocomplete="tel">
                </div>

            </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
                <button type="submit" form="clientForm" class="btn btn-primary" id="submitBtn">Create Client</button>
            </div>
        </div>
    </div>

    <!-- Toast Notification -->
    <div class="toast" id="toast" style="display: none;"></div>

    <?php include __DIR__ . '/includes/add-credits-modal.php'; ?>
    <?php include __DIR__ . '/includes/chat-widget.php'; ?>

    <?php
    // Dynamically load JavaScript with cache busting
    $creditsWidgetJsFile = __DIR__ . '/js/credits-widget.js';
    $creditsWidgetJsVersion = file_exists($creditsWidgetJsFile) ? filemtime($creditsWidgetJsFile) : time();
    echo "<script src=\"/portai/public/js/credits-widget.js?v={$creditsWidgetJsVersion}\"></script>";

    $jsFile = __DIR__ . '/js/clients.js';
    $jsVersion = file_exists($jsFile) ? filemtime($jsFile) : time();
    echo "<script src=\"/portai/public/js/clients.js?v={$jsVersion}\"></script>";
    ?>
</body>
</html>

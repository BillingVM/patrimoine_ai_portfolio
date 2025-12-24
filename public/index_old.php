<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio AI - Dashboard</title>
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
    $creditsWidgetCssVersion = file_exists($creditsWidgetCssFile) ? filemtime($creditsWidgetCssVersion) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/credits-widget.css?v={$creditsWidgetCssVersion}\">";

    $luxuryCssFile = __DIR__ . '/css/theme-luxury.css';
    $luxuryCssVersion = file_exists($luxuryCssFile) ? filemtime($luxuryCssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/theme-luxury.css?v={$luxuryCssVersion}\">";
    ?>

    <meta name="description" content="AI-powered portfolio analysis dashboard">
</head>
<body>
    <?php include __DIR__ . '/includes/sidebar.php'; ?>

    <main class="main-content">
        <div class="container">
            <!-- Header -->
            <header class="header">
                <div class="header-left">
                    <h1>Dashboard</h1>
                    <p>Upload your investment portfolio and get AI-powered insights</p>
                </div>
                <div class="header-actions">
                    <?php include __DIR__ . '/includes/credits-widget.php'; ?>
                </div>
            </header>

            <!-- Upload Section -->
            <section class="upload-section" id="uploadSection">
                <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <h2>Upload Portfolio File</h2>
                <p>Supports CSV, Excel, PDF, JSON, Images (JPG, PNG)</p>
                <input type="file" id="fileInput" accept=".csv,.xlsx,.xls,.pdf,.json,.jpg,.jpeg,.png,.tiff,.tif,.bmp">
                <button type="button" class="btn btn-primary" id="uploadBtn">Select File</button>
            </section>

            <!-- Portfolios List -->
            <section class="portfolios-section">
                <h2>Recent Portfolios</h2>
                <div class="portfolios-grid" id="portfoliosGrid">
                    <div class="empty-state">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="64" height="64">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3>No portfolios yet</h3>
                        <p>Upload your first portfolio to get started</p>
                    </div>
                </div>
            </section>
        </div>
    </main>

    <!-- Toast Notification -->
    <div class="toast" id="toast" style="display: none;"></div>

    <?php include __DIR__ . '/includes/add-credits-modal.php'; ?>
    <?php include __DIR__ . '/includes/chat-widget.php'; ?>

    <?php
    // Dynamically load JavaScript with cache busting
    $creditsWidgetJsFile = __DIR__ . '/js/credits-widget.js';
    $creditsWidgetJsVersion = file_exists($creditsWidgetJsFile) ? filemtime($creditsWidgetJsFile) : time();
    echo "<script src=\"/portai/public/js/credits-widget.js?v={$creditsWidgetJsVersion}\"></script>";

    $jsFile = __DIR__ . '/js/app.js';
    $jsVersion = file_exists($jsFile) ? filemtime($jsFile) : time();
    echo "<script src=\"/portai/public/js/app.js?v={$jsVersion}\"></script>";
    ?>
</body>
</html>

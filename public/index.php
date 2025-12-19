<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio AI - Simple Demo</title>

    <?php
    // Dynamically load CSS with cache busting
    $cssFile = __DIR__ . '/css/style.css';
    $cssVersion = file_exists($cssFile) ? filemtime($cssFile) : time();
    echo "<link rel=\"stylesheet\" href=\"/portai/public/css/style.css?v={$cssVersion}\">";
    ?>

    <!-- Force icon sizes in case CSS doesn't load -->
    <style>
        .upload-icon { width: 48px !important; height: 48px !important; max-width: 48px !important; max-height: 48px !important; }
        .empty-state svg { width: 64px !important; height: 64px !important; max-width: 64px !important; max-height: 64px !important; }
    </style>

    <meta name="description" content="AI-powered portfolio analysis demo">
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header class="header">
            <div class="header-left">
                <h1>📊 Portfolio AI</h1>
                <p>Upload your investment portfolio and get AI-powered insights</p>
            </div>
            <div class="credits-section">
                <div class="credits-display" id="creditsDisplay">
                    <span class="credits-label">Credits:</span>
                    <span class="credits-balance" id="creditsBalance">Loading...</span>
                </div>
                <button class="btn btn-primary btn-small" onclick="showAddCreditsModal()">+ Add Credits</button>
                <a href="credits-history.php" class="btn btn-secondary btn-small">📜 History</a>
            </div>
        </header>

        <!-- Upload Section -->
        <section class="upload-section" id="uploadSection">
            <svg class="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h2>Upload Portfolio</h2>
            <p>Supported formats: CSV, PDF, Excel, JSON, Word documents, Images (JPG, PNG)</p>
            <input type="file" id="fileInput" accept=".csv,.pdf,.xlsx,.xls,.json,.docx,.doc,.txt,.jpg,.jpeg,.png">
            <button class="btn btn-primary" id="uploadBtn">Choose File</button>
        </section>

        <!-- Portfolios List -->
        <section class="portfolios-section">
            <h2>📁 Your Portfolios</h2>
            <div class="portfolios-grid" id="portfoliosGrid">
                <div class="empty-state">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3>No portfolios yet</h3>
                    <p>Upload your first portfolio to get started</p>
                </div>
            </div>
        </section>
    </div>

    <?php
    // Dynamically load JavaScript with cache busting
    $jsFile = __DIR__ . '/js/app.js';
    $jsVersion = file_exists($jsFile) ? filemtime($jsFile) : time();
    echo "<script src=\"/portai/public/js/app.js?v={$jsVersion}\"></script>";
    ?>
</body>
</html>

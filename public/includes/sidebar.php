<!-- Professional Sidebar Navigation -->
<aside class="sidebar">
    <!-- Logo -->
    <a href="index.php" class="sidebar-logo" title="Portfolio AI">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    </a>

    <!-- Main Navigation -->
    <nav class="sidebar-nav">
        <a href="index.php" class="sidebar-link <?php echo basename($_SERVER['PHP_SELF']) == 'index.php' ? 'active' : ''; ?>" title="Dashboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="7" height="7" stroke-linecap="round" stroke-linejoin="round"/>
                <rect x="14" y="3" width="7" height="7" stroke-linecap="round" stroke-linejoin="round"/>
                <rect x="14" y="14" width="7" height="7" stroke-linecap="round" stroke-linejoin="round"/>
                <rect x="3" y="14" width="7" height="7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </a>

        <a href="clients.php" class="sidebar-link <?php echo basename($_SERVER['PHP_SELF']) == 'clients.php' || basename($_SERVER['PHP_SELF']) == 'client-detail.php' ? 'active' : ''; ?>" title="Clients">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="9" cy="7" r="4" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </a>

        <a href="chat.php" class="sidebar-link <?php echo basename($_SERVER['PHP_SELF']) == 'chat.php' ? 'active' : ''; ?>" title="AI Assistant">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="9" cy="10" r="1" fill="currentColor"/>
                <circle cx="12" cy="10" r="1" fill="currentColor"/>
                <circle cx="15" cy="10" r="1" fill="currentColor"/>
            </svg>
        </a>

        <button class="sidebar-link" title="Chat History" onclick="openChatHistoryModal()" style="border: none; background: none; cursor: pointer;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 3v5h-5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8 16H3v5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>

        <a href="credits-history.php" class="sidebar-link <?php echo basename($_SERVER['PHP_SELF']) == 'credits-history.php' ? 'active' : ''; ?>" title="Credits History">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </a>
    </nav>

    <!-- Bottom Navigation -->
    <div class="sidebar-bottom">
        <a href="#" class="sidebar-link" title="Settings" id="settingsBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="3" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </a>
    </div>
</aside>

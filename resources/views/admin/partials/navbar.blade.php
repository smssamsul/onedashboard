<nav class="admin-navbar">
    <div class="navbar-left">
        <button class="sidebar-toggle" id="sidebarToggle" aria-label="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20M4 12H20M4 18H14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
        <span class="page-title">@yield('page_title', 'Dashboard')</span>
    </div>
    <div class="navbar-actions">
        <button class="navbar-icon-btn" title="Toggle Dark Mode" onclick="toggleDarkMode()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
        <button class="navbar-icon-btn" title="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
        <!-- AI Menu (only for Head Sales) -->
        <div class="navbar-ai-menu" id="navbarAiMenu" style="display: none;">
            <div class="navbar-icon-btn" data-dropdown="aiMenu" title="AI">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div id="aiMenu" class="dropdown-menu">
                <a href="{{ route('sales.ai.knowledge') }}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Knowledge
                </a>
                <a href="{{ route('sales.ai.prompt') }}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Prompt
                </a>
            </div>
        </div>
        <div class="navbar-user">
            <div class="navbar-user-info">
                <div class="navbar-user-name" id="navbarUserName">User</div>
                <div class="navbar-user-date" id="navbarDate">-</div>
            </div>
            <div class="user-dropdown" data-dropdown="userMenu">
                <div class="navbar-avatar" id="navbarAvatar">U</div>
                <div id="userMenu" class="dropdown-menu">
                    <a href="#">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        Profile
                    </a>
                    <a href="#">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        Settings
                    </a>
                    <form method="POST" action="/api/logout" id="logoutForm">
                        @csrf
                        <button type="button" onclick="handleLogout()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <polyline points="16,17 21,12 16,7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            Logout
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</nav>

<script>
    // Format date in Indonesian
    function formatDate() {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        const now = new Date();
        return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    }

    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    const userName = userData.name || 'User';
    const initials = userName.substring(0, 2).toUpperCase();
    
    // Update navbar elements
    const navbarAvatarEl = document.getElementById('navbarAvatar');
    const navbarUserNameEl = document.getElementById('navbarUserName');
    const navbarDateEl = document.getElementById('navbarDate');
    const sidebarAvatarEl = document.getElementById('sidebarAvatar');
    const sidebarUserNameEl = document.getElementById('sidebarUserName');
    
    if (navbarAvatarEl) navbarAvatarEl.textContent = initials;
    if (navbarUserNameEl) navbarUserNameEl.textContent = userName;
    if (navbarDateEl) navbarDateEl.textContent = formatDate();
    if (sidebarAvatarEl) sidebarAvatarEl.textContent = initials;
    if (sidebarUserNameEl) sidebarUserNameEl.textContent = userName;

    // Handle logout
    function handleLogout() {
        const token = localStorage.getItem('auth_token');
        
        fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + token,
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
            }
        })
        .then(response => {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            window.location.href = '/login';
        })
        .catch(error => {
            console.error('Logout error:', error);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            window.location.href = '/login';
        });
    }

    // Toggle dark mode (placeholder)
    function toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
    }

    // Show/hide AI menu based on user level (only for Head Sales - level 1)
    (function() {
        function checkUserLevelAndShowAiMenu() {
            try {
                const userDataStr = localStorage.getItem('user_data');
                if (!userDataStr) {
                    return;
                }
                
                const userData = JSON.parse(userDataStr);
                let userLevel = null;
                if (userData.level !== undefined) {
                    userLevel = userData.level;
                } else if (userData.userData && userData.userData.level !== undefined) {
                    userLevel = userData.userData.level;
                } else if (userData.user && userData.user.level !== undefined) {
                    userLevel = userData.user.level;
                }

                const aiMenu = document.getElementById('navbarAiMenu');
                if (aiMenu) {
                    // Show AI menu only for Head Sales (level 1)
                    if (userLevel === '1' || userLevel === 1) {
                        aiMenu.style.display = '';
                    } else {
                        aiMenu.style.display = 'none';
                    }
                }
            } catch (error) {
                console.error('Error checking user level for AI menu:', error);
            }
        }
        
        // Run on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', checkUserLevelAndShowAiMenu);
        } else {
            checkUserLevelAndShowAiMenu();
        }
        
        // Also check after a short delay in case localStorage is updated
        setTimeout(checkUserLevelAndShowAiMenu, 100);
    })();
</script>

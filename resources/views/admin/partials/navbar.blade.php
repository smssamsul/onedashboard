<nav class="admin-navbar">
    <div class="navbar-left">
        <button class="sidebar-toggle" data-toggle="sidebar" aria-label="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20M4 12H20M4 18H14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
        <span class="page-title">@yield('page_title', 'Dashboard')</span>
        <div class="dashboard-selector" data-dropdown="dashboardMenu">
            <button class="dashboard-toggle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Pilih Dashboard
            </button>
            <div id="dashboardMenu" class="dropdown-menu dashboard-menu">
                <a href="/admin/dashboard" class="dashboard-option {{ request()->routeIs('admin.dashboard') ? 'active' : '' }}" data-theme="admin">
                    <span class="dashboard-icon" style="background: #FFE5D4;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </span>
                    <div class="dashboard-content">
                        <div class="dashboard-name">Admin Dashboard</div>
                        <div class="dashboard-desc">Overview umum</div>
                    </div>
                </a>
                <a href="/sales/dashboard" class="dashboard-option {{ request()->routeIs('sales.dashboard') ? 'active' : '' }}" data-theme="sales">
                    <span class="dashboard-icon" style="background: #CCFBF1;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 3h18v4H3z" stroke="#14B8A6" stroke-width="2" fill="none"/>
                            <path d="M5 7v14h14V7" stroke="#14B8A6" stroke-width="2" fill="none"/>
                        </svg>
                    </span>
                    <div class="dashboard-content">
                        <div class="dashboard-name">Sales Dashboard</div>
                        <div class="dashboard-desc">Penjualan & order</div>
                    </div>
                </a>
                <a href="/hr/dashboard" class="dashboard-option {{ request()->routeIs('hr.dashboard') ? 'active' : '' }}" data-theme="hr">
                    <span class="dashboard-icon" style="background: #F3E8FF;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </span>
                    <div class="dashboard-content">
                        <div class="dashboard-name">HR Dashboard</div>
                        <div class="dashboard-desc">SDM & karyawan</div>
                    </div>
                </a>
                <a href="/finance/dashboard" class="dashboard-option {{ request()->routeIs('finance.dashboard') ? 'active' : '' }}" data-theme="finance">
                    <span class="dashboard-icon" style="background: #D1FAE5;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </span>
                    <div class="dashboard-content">
                        <div class="dashboard-name">Finance Dashboard</div>
                        <div class="dashboard-desc">Keuangan & laporan</div>
                    </div>
                </a>
                <a href="/marketing/dashboard" class="dashboard-option {{ request()->routeIs('marketing.dashboard') ? 'active' : '' }}" data-theme="marketing">
                    <span class="dashboard-icon" style="background: #FFE4E6;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 12h4l3 9 4-18 3 9h4" stroke="#F43F5E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </span>
                    <div class="dashboard-content">
                        <div class="dashboard-name">Marketing Dashboard</div>
                        <div class="dashboard-desc">Pemasaran & campaign</div>
                    </div>
                </a>
            </div>
        </div>
    </div>
    <div class="navbar-actions">
        <div class="search-bar">
            <input type="text" placeholder="Search..." aria-label="Search" />
        </div>
        <div class="user-dropdown" data-dropdown="userMenu">
            <div class="avatar" id="userAvatar">AD</div>
        </div>
        <div id="userMenu" class="dropdown-menu">
            <a href="#" onclick="event.preventDefault(); alert('Profile feature coming soon!')">Profile</a>
            <a href="#" onclick="event.preventDefault(); alert('Settings feature coming soon!')">Settings</a>
            <form method="POST" action="/api/admin/logout" id="logoutForm">
                @csrf
                <button type="button" onclick="handleLogout()">Logout</button>
            </form>
        </div>
    </div>
</nav>

<script>
    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    const userName = userData.name || 'Admin';
    const initials = userName.substring(0, 2).toUpperCase();
    const avatarElement = document.getElementById('userAvatar');
    if (avatarElement) {
        avatarElement.textContent = initials;
    }

    // Handle logout
    function handleLogout() {
        const token = localStorage.getItem('auth_token');
        
        fetch('/api/admin/logout', {
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

    // Dashboard selector - update button text based on current page
    document.addEventListener('DOMContentLoaded', function() {
        const dashboardToggle = document.querySelector('.dashboard-toggle');
        const currentPath = window.location.pathname;
        
        const dashboardNames = {
            '/admin/dashboard': 'Admin Dashboard',
            '/sales/dashboard': 'Sales Dashboard',
            '/hr/dashboard': 'HR Dashboard',
            '/finance/dashboard': 'Finance Dashboard',
            '/marketing/dashboard': 'Marketing Dashboard'
        };

        // Update button text
        for (const [path, name] of Object.entries(dashboardNames)) {
            if (currentPath === path || currentPath.startsWith(path)) {
                if (dashboardToggle) {
                    const icon = dashboardToggle.querySelector('svg');
                    dashboardToggle.innerHTML = '';
                    if (icon) {
                        dashboardToggle.appendChild(icon);
                    }
                    dashboardToggle.appendChild(document.createTextNode(name));
                }
                break;
            }
        }
    });
</script>


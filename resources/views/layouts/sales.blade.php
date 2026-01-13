<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Sales Dashboard') - One Dashboard</title>
    <link rel="stylesheet" href="{{ secure_asset('css/admin.css') }}">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    @stack('styles')
</head>
<body>
    <div class="admin-layout">
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <div class="logo-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M9 9h6M9 13h6M9 17h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div>
                    <h2>One Dashboard</h2>
                    <p class="text-muted">Ternak Properti</p>
                </div>
            </div>

            <nav class="sidebar-nav">
                <!-- Dashboard -->
                <div class="nav-section">
                    <div class="nav-section-title">Main</div>
                    <a href="{{ route('sales.dashboard') }}" class="sidebar-link {{ request()->routeIs('sales.dashboard') ? 'active' : '' }}">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M9 22V12H15V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Dashboard
                    </a>
                </div>

                <!-- Sales Section -->
                <div class="nav-section">
                    <div class="nav-section-title">Sales</div>
                    {{-- Menu Follow Hari ini dinonaktifkan sementara --}}
                    {{-- <a href="{{ route('sales.follow-today') }}" class="sidebar-link {{ request()->routeIs('sales.follow-today') ? 'active' : '' }}">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            <polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Follow Hari ini
                    </a> --}}
                    <a href="{{ route('sales.order') }}" class="sidebar-link {{ request()->routeIs('sales.order') ? 'active' : '' }}">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Order
                    </a>
                    <a href="{{ route('sales.sales-list') }}" class="sidebar-link {{ request()->routeIs('sales.sales-list') ? 'active' : '' }}" id="salesListMenuLink">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                            <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Sales List
                    </a>
                </div>

                <!-- Data Section -->
                <div class="nav-section">
                    <div class="nav-section-title">Data</div>
                    <a href="{{ route('sales.customer') }}" class="sidebar-link {{ request()->routeIs('sales.customer') ? 'active' : '' }}" id="customerMenuLink">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="8.5" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        Customer
                    </a>
                    <a href="{{ route('sales.order') }}" class="sidebar-link {{ request()->routeIs('sales.order') ? 'active' : '' }}">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="2"/>
                            <path d="M9 12H15M9 16H15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        Order
                    </a>
                    <a href="{{ route('sales.produk') }}" class="sidebar-link {{ request()->routeIs('sales.produk') ? 'active' : '' }}">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                            <path d="M3 9h18M9 21V9" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        Produk
                    </a>
                </div>

                <!-- Absensi Section -->
                <div class="nav-section">
                    <div class="nav-section-title">Absensi</div>
                    <a href="{{ route('sales.absensi') }}" class="sidebar-link {{ request()->routeIs('sales.absensi') ? 'active' : '' }}">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M12 21c0-1-1-3-3-3s-3 2-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M12 3c0 1 1 3 3 3s3-2 3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Absensi
                    </a>
                </div>
            </nav>

            <!-- User Profile at Bottom -->
            <div class="sidebar-user">
                <div class="sidebar-user-avatar" id="sidebarAvatar">U</div>
                <div class="sidebar-user-info">
                    <div class="sidebar-user-name" id="sidebarUserName">User</div>
                    <div class="sidebar-user-role" id="sidebarUserRole">Sales</div>
                </div>
                <button class="sidebar-logout" onclick="handleLogout()" title="Logout">
                    <svg viewBox="0 0 24 24" fill="none" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <polyline points="16,17 21,12 16,7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        </aside>

        <div class="main-content">
            @include('admin.partials.navbar')

            <main class="content-wrapper">
                @yield('content')
            </main>
        </div>
    </div>

    <script src="{{ secure_asset('js/admin.js') }}"></script>
    <script>
        // Show/hide menu based on user level
        (function() {
            function checkUserLevelAndShowMenu() {
                try {
                    const userDataStr = localStorage.getItem('user_data');
                    if (!userDataStr) {
                        console.log('No user data found');
                        return;
                    }
                    
                    const userData = JSON.parse(userDataStr);
                    console.log('User data:', userData);
                    
                    // Check level from different possible structures
                    let userLevel = null;
                    if (userData.level !== undefined) {
                        userLevel = userData.level;
                    } else if (userData.userData && userData.userData.level !== undefined) {
                        userLevel = userData.userData.level;
                    } else if (userData.user && userData.user.level !== undefined) {
                        userLevel = userData.user.level;
                    }
                    
                    console.log('User level:', userLevel);
                    
                    // Show customer menu only for head sales (level 1)
                    const customerMenuLink = document.getElementById('customerMenuLink');
                    if (customerMenuLink) {
                        if (userLevel === '1' || userLevel === 1) {
                            customerMenuLink.style.display = '';
                            console.log('Customer menu shown for head sales');
                        } else {
                            customerMenuLink.style.display = 'none';
                            console.log('Customer menu hidden for sales level:', userLevel);
                        }
                    } else {
                        console.log('Customer menu link not found');
                    }

                    // Show sales list menu only for head sales (level 1)
                    const salesListMenuLink = document.getElementById('salesListMenuLink');
                    if (salesListMenuLink) {
                        if (userLevel === '1' || userLevel === 1) {
                            salesListMenuLink.style.display = '';
                            console.log('Sales List menu shown for head sales');
                        } else {
                            salesListMenuLink.style.display = 'none';
                            console.log('Sales List menu hidden for sales level:', userLevel);
                        }
                    } else {
                        console.log('Sales List menu link not found');
                    }
                } catch (error) {
                    console.error('Error checking user level:', error);
                }
            }
            
            // Run on DOM ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', checkUserLevelAndShowMenu);
            } else {
                checkUserLevelAndShowMenu();
            }
            
            // Also check after a short delay in case localStorage is updated
            setTimeout(checkUserLevelAndShowMenu, 100);
        })();
    </script>
    @stack('scripts')
</body>
</html>


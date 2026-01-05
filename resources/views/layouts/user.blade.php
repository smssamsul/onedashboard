<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Dashboard') - One Dashboard</title>
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
                    <p class="text-muted">User Portal</p>
                </div>
            </div>

            <nav class="sidebar-nav">
                <!-- Main Navigation -->
                <div class="nav-section">
                    <div class="nav-section-title">Main</div>
                    <a href="{{ route('user.dashboard') }}" class="sidebar-link {{ request()->routeIs('user.dashboard') ? 'active' : '' }}">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M9 22V12H15V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Dashboard
                    </a>
                </div>

                <!-- Absensi Section -->
                <div class="nav-section">
                    <div class="nav-section-title">Kehadiran</div>
                    <a href="{{ route('user.absensi') }}" class="sidebar-link {{ request()->routeIs('user.absensi') ? 'active' : '' }}">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 11L12 14L22 4M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Absensi
                    </a>
                    <a href="{{ route('user.cuti') }}" class="sidebar-link {{ request()->routeIs('user.cuti') ? 'active' : '' }}">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9L11 5H19C19.5304 5 20.0391 5.21071 20.4142 5.58579C20.7893 5.96086 21 6.46957 21 7V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Pengajuan Cuti
                    </a>
                    {{-- <a href="{{ route('user.hari') }}" class="sidebar-link {{ request()->routeIs('user.hari') ? 'active' : '' }}">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Hari
                    </a> --}}
                    <a href="{{ route('user.izin-telat') }}" class="sidebar-link {{ request()->routeIs('user.izin-telat') ? 'active' : '' }}">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 8V12L16 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Izin Telat
                    </a>
                </div>

                <!-- Task Section -->
                <div class="nav-section">
                    <div class="nav-section-title">Tugas</div>
                    <a href="{{ route('user.task') }}" class="sidebar-link {{ request()->routeIs('user.task') ? 'active' : '' }}">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M9 12H15M9 16H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        List / Task
                    </a>
                </div>

                <!-- Profile Section -->
                <div class="nav-section">
                    <div class="nav-section-title">Akun</div>
                    <a href="{{ route('user.profile') }}" class="sidebar-link {{ request()->routeIs('user.profile') ? 'active' : '' }}">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="8.5" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
                        </svg>
                        Profile
                    </a>
                </div>
            </nav>

            <!-- User Profile at Bottom -->
            <div class="sidebar-user">
                <div class="sidebar-user-avatar" id="sidebarAvatar">U</div>
                <div class="sidebar-user-info">
                    <div class="sidebar-user-name" id="sidebarUserName">User</div>
                    <div class="sidebar-user-role" id="sidebarUserRole">Karyawan</div>
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
        // Load user data and update sidebar
        (function() {
            function loadUserData() {
                try {
                    const userDataStr = localStorage.getItem('user_data');
                    if (userDataStr) {
                        const userData = JSON.parse(userDataStr);
                        const userName = userData.nama || userData.name || userData.email || 'User';
                        const userRole = 'Karyawan';
                        
                        const avatarEl = document.getElementById('sidebarAvatar');
                        const nameEl = document.getElementById('sidebarUserName');
                        const roleEl = document.getElementById('sidebarUserRole');
                        
                        if (avatarEl) avatarEl.textContent = userName.charAt(0).toUpperCase();
                        if (nameEl) nameEl.textContent = userName;
                        if (roleEl) roleEl.textContent = userRole;
                    }
                } catch (error) {
                    console.error('Error loading user data:', error);
                }
            }
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', loadUserData);
            } else {
                loadUserData();
            }
        })();
    </script>
    @stack('scripts')
</body>
</html>


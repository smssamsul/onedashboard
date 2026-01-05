<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Dashboard Customer') - One Dashboard</title>
    <link rel="stylesheet" href="{{ secure_asset('css/admin.css') }}">
    @stack('styles')
</head>
<body>
    <div class="customer-layout">
        <header class="customer-header">
            <div class="customer-header-content">
                <div class="customer-header-left">
                    <h1>One Dashboard</h1>
                    <p class="text-muted">Ternak Properti</p>
                </div>
                <div class="customer-header-right">
                    <div class="customer-profile-dropdown">
                        <button class="dropdown-trigger" id="dropdownTrigger">
                            <span id="customer-name">Loading...</span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <div class="dropdown-menu" id="dropdownMenu">
                            <a href="/customer/profile" class="dropdown-item">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Profile
                            </a>
                            <button class="dropdown-item" onclick="handleLogout()">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <polyline points="16 17 21 12 16 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <main class="customer-content">
            @yield('content')
        </main>
    </div>

    <style>
        .customer-layout {
            min-height: 100vh;
            background: #000000;
            position: relative;
        }

        .customer-header {
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            padding: 1.5rem 2rem;
            position: relative;
            z-index: 10;
        }

        .customer-header-content {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .customer-header-left h1 {
            margin: 0;
            font-size: 1.75rem;
            font-weight: 800;
        }

        .customer-header-left .text-muted {
            margin: 0.25rem 0 0 0;
            font-size: 0.875rem;
            opacity: 0.9;
        }

        .customer-header-right {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .customer-profile-dropdown {
            position: relative;
        }

        .dropdown-trigger {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            padding: 0.625rem 1.25rem;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.9375rem;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .dropdown-trigger:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .dropdown-trigger svg {
            transition: transform 0.2s;
        }

        .dropdown-trigger.active svg {
            transform: rotate(180deg);
        }

        .dropdown-menu {
            position: absolute;
            top: calc(100% + 0.5rem);
            right: 0;
            background: rgb(255 255 255 / 70%);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            min-width: 200px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.2s;
            z-index: 1000;
            overflow: hidden;
        }

        .dropdown-menu.show {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        .dropdown-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.875rem 1.25rem;
            color: #ebebee;
            text-decoration: none;
            font-size: 0.9375rem;
            font-weight: 500;
            transition: all 0.2s;
            border: none;
            background: none;
            width: 100%;
            text-align: left;
            cursor: pointer;
        }

     

        .dropdown-item svg {
            flex-shrink: 0;
        }

        .customer-content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
            position: relative;
            z-index: 1;
        }

        @media (max-width: 768px) {
            .customer-header-content {
                flex-direction: column;
                gap: 1rem;
                align-items: flex-start;
            }

            .customer-content {
                padding: 1rem;
            }
        }
    </style>

    <script>
        function handleLogout() {
            if (confirm('Apakah Anda yakin ingin logout?')) {
                localStorage.removeItem('customer_auth_token');
                localStorage.removeItem('customer_data');
                window.location.href = '/customer/login';
            }
        }

        // Dropdown functionality
        document.addEventListener('DOMContentLoaded', function() {
            const trigger = document.getElementById('dropdownTrigger');
            const menu = document.getElementById('dropdownMenu');

            if (trigger && menu) {
                trigger.addEventListener('click', function(e) {
                    e.stopPropagation();
                    trigger.classList.toggle('active');
                    menu.classList.toggle('show');
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', function(e) {
                    if (!trigger.contains(e.target) && !menu.contains(e.target)) {
                        trigger.classList.remove('active');
                        menu.classList.remove('show');
                    }
                });

                // Close dropdown when clicking on menu item
                const menuItems = menu.querySelectorAll('.dropdown-item');
                menuItems.forEach(item => {
                    item.addEventListener('click', function() {
                        trigger.classList.remove('active');
                        menu.classList.remove('show');
                    });
                });
            }
        });
    </script>
    @stack('scripts')
</body>
</html>


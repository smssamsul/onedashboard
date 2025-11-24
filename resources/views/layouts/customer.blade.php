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
                    <div class="customer-profile">
                        <span id="customer-name">Loading...</span>
                        <button class="btn-logout" onclick="handleLogout()">Logout</button>
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
            background: var(--bg);
        }

        .customer-header {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            padding: 1.5rem 2rem;
            box-shadow: var(--shadow-md);
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

        .customer-profile {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .customer-profile span {
            font-weight: 600;
            font-size: 1rem;
        }

        .btn-logout {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 0.5rem 1rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }

        .btn-logout:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .customer-content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
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
    </script>
    @stack('scripts')
</body>
</html>


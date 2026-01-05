@extends('layouts.admin')

@section('title', 'Admin Dashboard')
@section('page_title', 'Dashboard')

@push('styles')
<style>
    .greeting-section {
        margin-bottom: 1.5rem;
    }

    .greeting-title {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--text);
        margin: 0 0 0.25rem 0;
    }

    .greeting-subtitle {
        font-size: 0.9375rem;
        color: var(--text-secondary);
        margin: 0;
    }

    .dashboard-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1.5rem;
    }

    @media (max-width: 1200px) {
        .dashboard-grid {
            grid-template-columns: 1fr;
        }
    }

    .profile-summary {
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        padding: 1.5rem;
        display: flex;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
    }

    .profile-avatar-large {
        width: 80px;
        height: 80px;
        border-radius: var(--radius);
        background: var(--primary);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 2rem;
        font-weight: 700;
    }

    .profile-details h3 {
        margin: 0 0 0.25rem 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text);
    }

    .profile-details p {
        margin: 0 0 1rem 0;
        font-size: 0.875rem;
        color: var(--text-muted);
    }

    .profile-stats {
        display: flex;
        gap: 1rem;
    }

    .profile-stat-card {
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
        border-radius: var(--radius-sm);
        padding: 1rem 1.25rem;
        min-width: 120px;
    }

    .profile-stat-card .label {
        font-size: 0.6875rem;
        color: rgba(255, 255, 255, 0.7);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .profile-stat-card .value {
        font-size: 1.5rem;
        font-weight: 700;
        color: white;
        margin: 0.25rem 0;
    }

    .profile-stat-card .desc {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.6);
    }

    .progress-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-top: 1rem;
    }

    .progress-info {
        flex: 1;
    }

    .progress-info label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text);
    }

    .progress-bar-container {
        margin-top: 0.5rem;
    }

    .progress-bar {
        height: 8px;
        background: var(--border);
        border-radius: 4px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent), #5eead4);
        border-radius: 4px;
    }

    .progress-text {
        font-size: 0.8125rem;
        color: var(--text-muted);
        margin-top: 0.25rem;
    }

    .progress-value {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text);
        white-space: nowrap;
    }

    .quick-actions {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
    }

    .action-card {
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        padding: 1.5rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .action-card:hover {
        border-color: var(--accent);
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
    }

    .action-icon {
        width: 56px;
        height: 56px;
        border-radius: var(--radius);
        background: var(--bg);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1rem;
    }

    .action-icon svg {
        width: 28px;
        height: 28px;
        color: var(--primary);
    }

    .action-card h4 {
        margin: 0 0 0.25rem 0;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text);
    }

    .action-card p {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--text-muted);
    }

    .sidebar-card {
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        margin-bottom: 1rem;
    }

    .sidebar-card-header {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .sidebar-card-header h4 {
        margin: 0;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text);
    }

    .sidebar-card-body {
        padding: 1rem 1.25rem;
    }

    .sidebar-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--border);
    }

    .sidebar-item:last-child {
        border-bottom: none;
    }

    .sidebar-item-icon {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .sidebar-item-icon svg {
        width: 20px;
        height: 20px;
    }

    .sidebar-item-info h5 {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text);
    }

    .sidebar-item-info p {
        margin: 0;
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .chart-section {
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        padding: 1.5rem;
        margin-top: 1.5rem;
    }

    .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .chart-header h4 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--text);
    }

    .chart-container {
        height: 240px;
    }

    .charts-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
    }

    @media (max-width: 1024px) {
        .charts-grid {
            grid-template-columns: 1fr;
        }

        .quick-actions {
            grid-template-columns: 1fr;
        }
    }
</style>
@endpush

@section('content')
    <!-- Greeting -->
    <div class="greeting-section">
        <h1 class="greeting-title" id="greetingTitle">Selamat Pagi! 👋</h1>
        <p class="greeting-subtitle">Berikut ringkasan aktivitas hari ini</p>
    </div>

    <!-- Dashboard Grid -->
    <div class="dashboard-grid">
        <!-- Main Content -->
        <div class="main-column">
            <!-- Profile Summary -->
            <div class="profile-summary">
                <div class="profile-avatar-large" id="profileAvatar">A</div>
                <div class="profile-details">
                    <h3 id="profileName">Admin User</h3>
                    <p id="profileRole">Administrator</p>
                    <div class="profile-stats">
                        <div class="profile-stat-card">
                            <div class="label">Total Order</div>
                            <div class="value" id="statOrders">124</div>
                            <div class="desc">Bulan ini</div>
                        </div>
                        <div class="profile-stat-card">
                            <div class="label">Revenue</div>
                            <div class="value" id="statRevenue">Rp 124M</div>
                            <div class="desc">Bulan ini</div>
                        </div>
                    </div>
                    <div class="progress-card">
                        <div class="progress-info">
                            <label>Target Bulanan</label>
                            <div class="progress-bar-container">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: 68%"></div>
                                </div>
                            </div>
                            <div class="progress-text">68% tercapai</div>
                        </div>
                        <div class="progress-value">Rp 124M / Rp 180M</div>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="quick-actions">
                <a href="{{ route('sales.leads') }}" class="action-card">
                    <div class="action-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <h4>Kelola Leads</h4>
                    <p>Manage semua leads</p>
                </a>
                <a href="{{ route('sales.broadcast') }}" class="action-card">
                    <div class="action-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"/>
                        </svg>
                    </div>
                    <h4>Broadcast</h4>
                    <p>Kirim pesan broadcast</p>
                </a>
                <a href="{{ route('admin.customer-import') }}" class="action-card">
                    <div class="action-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                    </div>
                    <h4>Import Customer</h4>
                    <p>Import dari Excel</p>
                </a>
            </div>

            <!-- Charts -->
            <div class="charts-grid">
                <div class="chart-section">
                    <div class="chart-header">
                        <h4>Penjualan per Bulan</h4>
                    </div>
                    <div class="chart-container">
                        <canvas id="barChart"></canvas>
                    </div>
                </div>
                <div class="chart-section">
                    <div class="chart-header">
                        <h4>Trend Conversion</h4>
                    </div>
                    <div class="chart-container">
                        <canvas id="lineChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <!-- Sidebar -->
        <div class="side-column">
            <!-- Recent Activity -->
            <div class="sidebar-card">
                <div class="sidebar-card-header">
                    <h4>Aktivitas Terbaru</h4>
                </div>
                <div class="sidebar-card-body">
                    <div class="sidebar-item">
                        <div class="sidebar-item-icon" style="background: #d1fae5;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                        </div>
                        <div class="sidebar-item-info">
                            <h5>Order Selesai</h5>
                            <p>Order #12345 berhasil</p>
                        </div>
                    </div>
                    <div class="sidebar-item">
                        <div class="sidebar-item-icon" style="background: #dbeafe;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                            </svg>
                        </div>
                        <div class="sidebar-item-info">
                            <h5>Customer Baru</h5>
                            <p>Andi Pratama bergabung</p>
                        </div>
                    </div>
                    <div class="sidebar-item">
                        <div class="sidebar-item-icon" style="background: #fef3c7;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 6v6l4 2"/>
                            </svg>
                        </div>
                        <div class="sidebar-item-info">
                            <h5>Follow Up</h5>
                            <p>5 leads perlu follow up</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Stats -->
            <div class="sidebar-card">
                <div class="sidebar-card-header">
                    <h4>Quick Stats</h4>
                </div>
                <div class="sidebar-card-body">
                    <div class="sidebar-item">
                        <div class="sidebar-item-icon" style="background: #ede9fe;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            </svg>
                        </div>
                        <div class="sidebar-item-info">
                            <h5 id="statCustomers">2,451</h5>
                            <p>Total Customers</p>
                        </div>
                    </div>
                    <div class="sidebar-item">
                        <div class="sidebar-item-icon" style="background: #ccfbf1;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                            </svg>
                        </div>
                        <div class="sidebar-item-info">
                            <h5 id="statLeads">342</h5>
                            <p>Active Leads</p>
                        </div>
                    </div>
                    <div class="sidebar-item">
                        <div class="sidebar-item-icon" style="background: #fee2e2;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <path d="M3 9h18"/>
                            </svg>
                        </div>
                        <div class="sidebar-item-info">
                            <h5 id="statPending">18</h5>
                            <p>Pending Orders</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection

@push('scripts')
<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Set greeting based on time
        const hour = new Date().getHours();
        let greeting = 'Selamat Pagi';
        if (hour >= 12 && hour < 15) greeting = 'Selamat Siang';
        else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';
        else if (hour >= 18) greeting = 'Selamat Malam';
        
        document.getElementById('greetingTitle').textContent = `${greeting}! 👋`;

        // Get user data
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        const userName = userData.name || 'Admin User';
        
        document.getElementById('profileName').textContent = userName;
        document.getElementById('profileAvatar').textContent = userName.substring(0, 1).toUpperCase();

        // Initialize Charts
        initCharts();
    });

    function initCharts() {
        // Bar Chart
        const barCtx = document.getElementById('barChart');
        if (barCtx) {
            new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: ['Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'],
                    datasets: [{
                        label: 'Penjualan',
                        data: [18, 20, 15, 22, 21, 24],
                        backgroundColor: '#1e3a5f',
                        borderRadius: 6,
                        barThickness: 28
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                font: { family: 'Plus Jakarta Sans', size: 12 },
                                color: '#64748b'
                            }
                        },
                        y: {
                            grid: { color: '#e2e8f0' },
                            ticks: {
                                font: { family: 'Plus Jakarta Sans', size: 12 },
                                color: '#64748b'
                            }
                        }
                    }
                }
            });
        }

        // Line Chart
        const lineCtx = document.getElementById('lineChart');
        if (lineCtx) {
            new Chart(lineCtx, {
                type: 'line',
                data: {
                    labels: ['Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'],
                    datasets: [{
                        label: 'Conversion Rate',
                        data: [3.5, 3.7, 3.9, 3.8, 3.9, 2.5],
                        borderColor: '#1e3a5f',
                        backgroundColor: 'rgba(30, 58, 95, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#1e3a5f',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                font: { family: 'Plus Jakarta Sans', size: 12 },
                                color: '#64748b'
                            }
                        },
                        y: {
                            grid: { color: '#e2e8f0' },
                            min: 0,
                            max: 5,
                            ticks: {
                                font: { family: 'Plus Jakarta Sans', size: 12 },
                                color: '#64748b',
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }
    }
</script>
@endpush

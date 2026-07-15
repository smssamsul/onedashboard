@php
    // Check user level from localStorage via JavaScript
    // Default to admin layout, will be switched by JS if needed
@endphp
@extends('layouts.admin')

@section('title', 'Sales Dashboard')
@section('page_title', 'Sales Dashboard')

@push('styles')
<style>
    .greeting-section {
        margin-bottom: 1.5rem;
    }

    .greeting-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text);
        margin: 0 0 0.25rem 0;
    }

    .greeting-subtitle {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin: 0;
    }

    .stats-overview {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    @media (max-width: 1200px) {
        .stats-overview {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 640px) {
        .stats-overview {
            grid-template-columns: 1fr;
        }
    }

    .stat-overview-card {
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .stat-overview-card .icon {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .stat-overview-card .icon svg {
        width: 22px;
        height: 22px;
    }

    .stat-overview-card .label {
        font-size: 0.8125rem;
        color: var(--text-muted);
    }

    .stat-overview-card .value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text);
    }

    .stat-overview-card .hint {
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .financial-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    @media (max-width: 1200px) {
        .financial-grid {
            grid-template-columns: repeat(3, 1fr);
        }
    }

    @media (max-width: 768px) {
        .financial-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 480px) {
        .financial-grid {
            grid-template-columns: 1fr;
        }
    }

    .financial-card {
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .financial-card .icon {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .financial-card .icon svg {
        width: 18px;
        height: 18px;
    }

    .financial-card .label {
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .financial-card .value {
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--text);
    }

    .financial-card .hint {
        font-size: 0.6875rem;
        color: var(--text-muted);
    }

    .charts-row {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
    }

    @media (max-width: 1024px) {
        .charts-row {
            grid-template-columns: 1fr;
        }
    }

    .chart-card {
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        padding: 1.25rem;
    }

    .chart-card h4 {
        margin: 0 0 1rem 0;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text);
    }

    .chart-container {
        height: 280px;
    }

    .tables-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
    }

    @media (max-width: 1024px) {
        .tables-row {
            grid-template-columns: 1fr;
        }
    }

    .sales-performance-section {
        margin-top: 1.5rem;
    }

    .sales-performance-card {
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        padding: 1.25rem;
    }

    .sales-performance-card h3 {
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text);
    }

    .sales-performance-table {
        width: 100%;
        border-collapse: collapse;
    }

    .sales-performance-table thead {
        background: var(--background);
    }

    .sales-performance-table th {
        padding: 0.75rem;
        text-align: left;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--text-muted);
        border-bottom: 1px solid var(--border);
    }

    .sales-performance-table td {
        padding: 0.75rem;
        font-size: 0.875rem;
        color: var(--text);
        border-bottom: 1px solid var(--border);
    }

    .sales-performance-table tbody tr:hover {
        background: var(--background);
    }

    .sales-performance-table tbody tr:last-child td {
        border-bottom: none;
    }

    .badge {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .badge-new {
        background: #dbeafe;
        color: #1e40af;
    }

    .badge-contacted {
        background: #fef3c7;
        color: #92400e;
    }

    .badge-qualified {
        background: #d1fae5;
        color: #065f46;
    }

    .badge-converted {
        background: #d1fae5;
        color: #065f46;
    }

    .badge-lost {
        background: #fee2e2;
        color: #991b1b;
    }

    .badge-growth-positive {
        color: #10b981;
    }

    .badge-growth-negative {
        color: #ef4444;
    }

    .table-responsive {
        overflow-x: auto;
    }
</style>
@endpush

@section('content')
    <!-- Greeting -->
    <div class="greeting-section" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
            <h1 class="greeting-title">Sales Dashboard</h1>
            <p class="greeting-subtitle">Monitor performa penjualan dan order</p>
        </div>
    </div>

    <!-- Attendance Card -->
    <div class="attendance-card" style="background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); padding: 1.25rem; margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="margin: 0; font-size: 1.125rem; font-weight: 600;">Absensi Hari Ini</h3>
            <span class="attendance-status" id="attendanceStatusBadge" style="padding: 0.375rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 600;">-</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div>
                <span style="display: block; font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.25rem;">Check In</span>
                <span style="display: block; font-size: 1.125rem; font-weight: 600;" id="checkInTime">-</span>
            </div>
            <div>
                <span style="display: block; font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.25rem;">Check Out</span>
                <span style="display: block; font-size: 1.125rem; font-weight: 600;" id="checkOutTime">-</span>
            </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-primary" id="checkInBtn" onclick="openCheckInModal()" style="flex: 1; background: var(--primary); padding: 0.625rem 1.25rem; border-radius: var(--radius-sm); border: none; color: white; cursor: pointer; font-weight: 500;">Check In</button>
            <button class="btn btn-primary" id="checkOutBtn" onclick="openCheckOutModal()" disabled style="flex: 1; background: var(--border); padding: 0.625rem 1.25rem; border-radius: var(--radius-sm); border: none; color: var(--text-muted); cursor: not-allowed; font-weight: 500; opacity: 0.6;">Check Out</button>
        </div>
    </div>

    <!-- Stats Overview -->
    <div class="stats-overview">
        <div class="stat-overview-card">
            <div class="icon" style="background: #ccfbf1;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="2">
                    <rect x="3" y="4" width="18" height="16" rx="2"/>
                    <path d="M3 10h18"/>
                </svg>
            </div>
            <span class="label">Total Order</span>
            <span class="value" id="overview-total-order">0</span>
            <span class="hint">Keseluruhan</span>
        </div>
        <div class="stat-overview-card">
            <div class="icon" style="background: #d1fae5;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                    <path d="M5 12l4 4L19 6"/>
                </svg>
            </div>
            <span class="label">Total Paid</span>
            <span class="value" id="overview-paid-order">0</span>
            <span class="hint">Status order = 2</span>
        </div>
        <div class="stat-overview-card">
            <div class="icon" style="background: #fee2e2;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                    <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </div>
            <span class="label">Total Unpaid</span>
            <span class="value" id="overview-unpaid-order">0</span>
            <span class="hint">Belum dibayar</span>
        </div>
        <div class="stat-overview-card">
            <div class="icon" style="background: #fef3c7;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                </svg>
            </div>
            <span class="label">Paid Ratio</span>
            <span class="value" id="paid-ratio">0%</span>
            <span class="hint">Persentase</span>
        </div>
    </div>

    <!-- Financial Metrics -->
    <div class="financial-grid">
        <div class="financial-card">
            <div class="icon" style="background: #fee2e2;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
            </div>
            <span class="label">Gross Revenue</span>
            <span class="value" id="gross-revenue">Rp 0</span>
            <span class="hint">Total harga</span>
        </div>
        <div class="financial-card">
            <div class="icon" style="background: #fef3c7;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                    <rect x="4" y="4" width="16" height="16" rx="2"/>
                    <path d="M4 10h16"/>
                </svg>
            </div>
            <span class="label">Shipping Cost</span>
            <span class="value" id="shipping-cost">Rp 0</span>
            <span class="hint">Total ongkir</span>
        </div>
        <div class="financial-card">
            <div class="icon" style="background: #dbeafe;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
                    <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
            </div>
            <span class="label">Net Revenue</span>
            <span class="value" id="net-revenue">Rp 0</span>
            <span class="hint">Harga produk</span>
        </div>
        <div class="financial-card">
            <div class="icon" style="background: #d1fae5;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
            </div>
            <span class="label">Gross Profit</span>
            <span class="value" id="gross-profit">Rp 0</span>
            <span class="hint">Net - shipping</span>
        </div>
        <div class="financial-card">
            <div class="icon" style="background: #ede9fe;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 12h8M12 8v8"/>
                </svg>
            </div>
            <span class="label">Net Profit</span>
            <span class="value" id="net-profit">Rp 0</span>
            <span class="hint">Profit bersih</span>
        </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
        <div class="chart-card">
            <h4>Perbandingan Transaksi & Order</h4>
            <div class="chart-container">
                <canvas id="chartTransaksiOrder"></canvas>
            </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div class="chart-card" style="flex: 1;">
                <h4>Performa Penjualan (30 Hari)</h4>
                <div class="chart-container" style="height: 120px;">
                    <canvas id="chartPenjualan"></canvas>
                </div>
            </div>
            <div class="chart-card" style="flex: 1;">
                <h4>Performa Sales (7 Hari)</h4>
                <div class="chart-container" style="height: 120px;">
                    <canvas id="chartSales"></canvas>
                </div>
            </div>
        </div>
    </div>

    <!-- Tables Row -->
    <div class="tables-row">
        <div class="card-table">
            <h3>Riwayat Terakhir Follow Up</h3>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Follow Up</th>
                            <th>Tanggal</th>
                        </tr>
                    </thead>
                    <tbody id="follow-up-table">
                        <tr>
                            <td colspan="3" style="text-align: center; padding: 2rem; color: var(--text-muted);">Memuat data...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="card-table">
            <h3>Pembelian Terakhir</h3>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Produk</th>
                            <th>Total</th>
                            <th>Tanggal</th>
                        </tr>
                    </thead>
                    <tbody id="pembelian-table">
                        <tr>
                            <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">Memuat data...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Sales Performance Section -->
    <div class="sales-performance-section">
        <div class="sales-performance-card">
            <h3>Performa Sales (Berdasarkan Lead)</h3>
            <div class="table-responsive">
                <table class="sales-performance-table">
                    <thead>
                        <tr>
                            <th>Sales</th>
                            <th>Total Leads</th>
                            <th>NEW</th>
                            <th>CONTACTED</th>
                            <th>QUALIFIED</th>
                            <th>CONVERTED</th>
                            <th>LOST</th>
                            <th>Active</th>
                            <th>Conversion Rate</th>
                            <th>Leads Bulan Ini</th>
                            <th>Growth</th>
                        </tr>
                    </thead>
                    <tbody id="sales-performance-table">
                        <tr>
                            <td colspan="11" style="text-align: center; padding: 2rem; color: var(--text-muted);">Memuat data...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
@endsection

@push('scripts')
<script>
    let chartTransaksiOrder = null;
    let chartPenjualan = null;
    let chartSales = null;

    async function loadDashboardData() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            // Check user level first
            const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
            if (userData.divisi === '3' && userData.level === '2') {
                // Sales biasa (level 2) - redirect to sales dashboard
                window.location.href = '/sales/dashboard-sales';
                return;
            }

            const response = await fetch('/api/sales/dashboard', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            const result = await response.json();
            
            // Double check - if response has leads_statistics, it's sales dashboard
            if (result.success && result.data && result.data.leads_statistics) {
                window.location.href = '/sales/dashboard-sales';
                return;
            }
            
            if (result.success && result.data) {
                const data = result.data;
                
                function safeUpdate(id, value) {
                    const el = document.getElementById(id);
                    if (el) el.textContent = value;
                }

                if (data.financial) {
                    safeUpdate('gross-revenue', data.financial.gross_revenue_formatted ?? 'Rp 0');
                    safeUpdate('shipping-cost', data.financial.shipping_cost_formatted ?? 'Rp 0');
                    safeUpdate('net-revenue', data.financial.net_revenue_formatted ?? 'Rp 0');
                    safeUpdate('gross-profit', data.financial.gross_profit_formatted ?? 'Rp 0');
                    safeUpdate('net-profit', data.financial.net_profit_formatted ?? 'Rp 0');
                }

                if (data.overview) {
                    safeUpdate('overview-total-order', data.overview.orders_total ?? 0);
                    safeUpdate('overview-paid-order', data.overview.orders_paid ?? 0);
                    safeUpdate('overview-unpaid-order', data.overview.orders_unpaid ?? 0);
                    safeUpdate('paid-ratio', data.overview.paid_ratio_formatted ?? '0%');
                }

                if (data.chart_transaksi_order) {
                    updateChartTransaksiOrder(data.chart_transaksi_order);
                }

                updateChartPenjualan(data.chart_performa_penjualan);
                updateChartSales(data.chart_performa_sales);
                updateFollowUpTable(data.riwayat_follow_up);
                updatePembelianTable(data.pembelian_terakhir);
            }
            
            // Load attendance after dashboard data
            loadTodayAttendance();
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    function updateChartTransaksiOrder(data) {
        const canvas = document.getElementById('chartTransaksiOrder');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');

        if (chartTransaksiOrder) {
            chartTransaksiOrder.destroy();
        }

        chartTransaksiOrder = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.label),
                datasets: [
                    {
                        label: 'Transaksi (Rp)',
                        data: data.map(item => item.transaksi),
                        backgroundColor: '#1e3a5f',
                        borderRadius: 6,
                        yAxisID: 'y',
                    },
                    {
                        label: 'Jumlah Order',
                        data: data.map(item => item.order),
                        backgroundColor: '#14b8a6',
                        borderRadius: 6,
                        yAxisID: 'y1',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: true, position: 'top' } },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value);
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        grid: { drawOnChartArea: false },
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    }

    function updateChartPenjualan(data) {
        const canvas = document.getElementById('chartPenjualan');
        if (!canvas || !data) return;
        
        const ctx = canvas.getContext('2d');
        
        if (chartPenjualan) chartPenjualan.destroy();

        chartPenjualan = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                    label: 'Total Penjualan',
                    data: data.map(item => item.total),
                    borderColor: '#1e3a5f',
                    backgroundColor: 'rgba(30, 58, 95, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value);
                            }
                        }
                    }
                }
            }
        });
    }

    function updateChartSales(data) {
        const canvas = document.getElementById('chartSales');
        if (!canvas || !data) return;
        
        const ctx = canvas.getContext('2d');
        
        if (chartSales) chartSales.destroy();

        chartSales = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                    label: 'Jumlah Order',
                    data: data.map(item => item.count),
                    backgroundColor: '#14b8a6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }

    function updateFollowUpTable(data) {
        const tbody = document.getElementById('follow-up-table');
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: var(--text-muted);">Tidak ada data</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.customer || '-'}</td>
                <td>${item.follup || '-'}</td>
                <td>${item.tanggal || '-'}</td>
            </tr>
        `).join('');
    }

    function updatePembelianTable(data) {
        const tbody = document.getElementById('pembelian-table');
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">Tidak ada data</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.customer || '-'}</td>
                <td>${item.produk || '-'}</td>
                <td>${item.total_harga_formatted || '-'}</td>
                <td>${item.tanggal || '-'}</td>
            </tr>
        `).join('');
    }

    // Helper function untuk mendapatkan tanggal lokal Indonesia (format YYYY-MM-DD)
    function getTodayIndonesia() {
        const now = new Date();
        
        // Gunakan timezone Asia/Jakarta (WIB - UTC+7)
        // Jika browser tidak support Intl, fallback ke manual calculation
        try {
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Jakarta',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            return formatter.format(now);
        } catch (e) {
            // Fallback: konversi manual ke WIB (UTC+7)
            const offset = 7; // WIB (Western Indonesian Time)
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const indonesiaTime = new Date(utc + (3600000 * offset));
            
            const year = indonesiaTime.getFullYear();
            const month = String(indonesiaTime.getMonth() + 1).padStart(2, '0');
            const day = String(indonesiaTime.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        }
    }

    // Load today's attendance status
    async function loadTodayAttendance() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) return;

            // Menggunakan waktu lokal Indonesia
            const today = getTodayIndonesia();
            const response = await fetch(`/api/hr/absensi/by-current-user?tanggal=${today}`, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.length > 0) {
                    const attendance = result.data[0];
                    updateAttendanceCard(attendance);
                } else {
                    // No attendance today
                    updateAttendanceCard(null);
                }
            } else {
                updateAttendanceCard(null);
            }
        } catch (error) {
            console.error('Error loading today attendance:', error);
            updateAttendanceCard(null);
        }
    }

    function updateAttendanceCard(attendance) {
        const checkInTimeEl = document.getElementById('checkInTime');
        const checkOutTimeEl = document.getElementById('checkOutTime');
        const statusBadgeEl = document.getElementById('attendanceStatusBadge');
        const checkInBtn = document.getElementById('checkInBtn');
        const checkOutBtn = document.getElementById('checkOutBtn');

        if (!attendance || !attendance.check_in) {
            // Belum check in - PASTIKAN check out disabled
            checkInTimeEl.textContent = '-';
            checkOutTimeEl.textContent = '-';
            statusBadgeEl.textContent = 'Belum Check In';
            statusBadgeEl.className = 'attendance-status';
            statusBadgeEl.style.background = '#FEE2E2';
            statusBadgeEl.style.color = '#DC2626';
            checkInBtn.disabled = false;
            checkOutBtn.disabled = true;
            // Update style untuk tombol disabled
            checkOutBtn.style.background = 'var(--border)';
            checkOutBtn.style.color = 'var(--text-muted)';
            checkOutBtn.style.cursor = 'not-allowed';
            checkOutBtn.style.opacity = '0.6';
        } else if (attendance.check_in && !attendance.check_out) {
            // Sudah check in, belum check out
            checkInTimeEl.textContent = attendance.check_in || '-';
            checkOutTimeEl.textContent = '-';
            
            // Determine status (Hadir/Telat)
            const status = attendance.status_absensi || 'Hadir';
            statusBadgeEl.textContent = status;
            if (status === 'Telat') {
                statusBadgeEl.style.background = '#FEF3C7';
                statusBadgeEl.style.color = '#D97706';
            } else {
                statusBadgeEl.style.background = '#D1FAE5';
                statusBadgeEl.style.color = '#059669';
            }
            
            checkInBtn.disabled = true;
            checkOutBtn.disabled = false;
            // Update style untuk tombol enabled
            checkOutBtn.style.background = 'var(--accent)';
            checkOutBtn.style.color = 'white';
            checkOutBtn.style.cursor = 'pointer';
            checkOutBtn.style.opacity = '1';
        } else if (attendance.check_out) {
            // Sudah check out
            checkInTimeEl.textContent = attendance.check_in || '-';
            checkOutTimeEl.textContent = attendance.check_out || '-';
            
            // Determine status (Hadir/Telat)
            const status = attendance.status_absensi || 'Hadir';
            statusBadgeEl.textContent = status;
            if (status === 'Telat') {
                statusBadgeEl.style.background = '#FEF3C7';
                statusBadgeEl.style.color = '#D97706';
            } else {
                statusBadgeEl.style.background = '#D1FAE5';
                statusBadgeEl.style.color = '#059669';
            }
            
            checkInBtn.disabled = true;
            checkOutBtn.disabled = true;
            // Update style untuk tombol disabled
            checkOutBtn.style.background = 'var(--border)';
            checkOutBtn.style.color = 'var(--text-muted)';
            checkOutBtn.style.cursor = 'not-allowed';
            checkOutBtn.style.opacity = '0.6';
        }
    }

    async function openCheckOutModal() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            // Get today's attendance ID - menggunakan waktu lokal Indonesia
            const today = getTodayIndonesia();
            const attendanceResponse = await fetch(`/api/hr/absensi/by-current-user?tanggal=${today}`, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            if (attendanceResponse.ok) {
                const attendanceResult = await attendanceResponse.json();
                if (attendanceResult.success && attendanceResult.data && attendanceResult.data.length > 0) {
                    const todayAttendance = attendanceResult.data[0];
                    if (todayAttendance.check_in && !todayAttendance.check_out) {
                        // Open check out modal from checkin-component
                        if (typeof openCheckOutModalFromAbsensi === 'function') {
                            openCheckOutModalFromAbsensi(todayAttendance.id);
                        } else {
                            // Fallback: redirect to absensi page
                            window.location.href = '/sales/absensi';
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error opening check out modal:', error);
        }
    }

    // Make function available globally
    window.openCheckOutModal = openCheckOutModal;

    document.addEventListener('DOMContentLoaded', function() {
        loadDashboardData();
        initCheckIn();
    });
</script>

@include('hr.checkin-component')
@endpush

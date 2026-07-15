@extends('layouts.sales')

@section('title', 'Statistik Customer')
@section('page_title', 'Statistik Customer')

@push('styles')
<style>
    .page-header {
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
        border-radius: var(--radius-lg);
        padding: 1.5rem 2rem;
        color: white;
        margin-bottom: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .page-header h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 1.5rem;
    }

    .stat-card {
        background: var(--surface);
        border-radius: var(--radius-md);
        padding: 1.5rem;
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border);
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-md);
    }

    .stat-card h3 {
        margin: 0;
        font-size: 0.875rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .stat-card .value {
        font-size: 1.85rem;
        font-weight: 700;
        color: var(--text);
        margin: 0.5rem 0;
    }

    .stat-card .label {
        font-size: 0.75rem;
        color: var(--text-secondary);
    }

    .chart-card {
        background: var(--surface);
        border-radius: var(--radius-md);
        padding: 1.5rem;
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border);
        margin-bottom: 2rem;
    }

    .chart-card h4 {
        margin: 0 0 1.25rem 0;
        font-size: 1.125rem;
        font-weight: 600;
    }

    .chart-container {
        position: relative;
        height: 380px;
        width: 100%;
    }

    .tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid var(--border);
        padding-bottom: 0.5rem;
        flex-wrap: wrap;
    }

    .tab-btn {
        padding: 0.5rem 1.25rem;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-muted);
        border-radius: var(--radius-sm);
        transition: all 0.2s;
    }

    .tab-btn:hover {
        background: var(--bg);
        color: var(--text);
    }

    .tab-btn.active {
        background: var(--primary);
        color: white;
        box-shadow: var(--shadow-sm);
    }

    .card-table {
        background: var(--surface);
        border-radius: var(--radius-md);
        padding: 1.5rem;
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border);
        margin-bottom: 2rem;
    }

    .card-table h4 {
        margin: 0 0 1.25rem 0;
        font-size: 1.125rem;
        font-weight: 600;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
    }

    th, td {
        padding: 0.85rem 1.15rem;
        text-align: left;
        border-bottom: 1px solid var(--border);
    }

    th {
        background: var(--bg);
        font-weight: 600;
        color: var(--text-secondary);
    }

    tr:hover {
        background: var(--bg);
    }

    .badge {
        display: inline-block;
        padding: 0.25rem 0.6rem;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: capitalize;
    }

    .badge-platinum { background: linear-gradient(135deg, #e5e4e2 0%, #b4b3b2 100%); color: #111; }
    .badge-gold { background: linear-gradient(135deg, #ffd700 0%, #d4af37 100%); color: #111; }
    .badge-silver { background: linear-gradient(135deg, #e0e0e0 0%, #a0a0a0 100%); color: #111; }
    .badge-bronze { background: linear-gradient(135deg, #cd7f32 0%, #a0522d 100%); color: #fff; }
    .badge-basic { background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%); color: #fff; }
    
    .text-success { color: #10b981 !important; }
    .text-danger { color: #ef4444 !important; }
    .text-primary { color: var(--primary) !important; }

    /* Clickable Premium Card styles */
    .clickable-card {
        cursor: pointer;
        position: relative;
        overflow: hidden;
    }
    
    .clickable-card::after {
        content: '';
        position: absolute;
        top: 0;
        left: -150%;
        width: 50%;
        height: 100%;
        background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 100%);
        transform: skewX(-25deg);
        transition: 0.75s;
    }
    
    .clickable-card:hover::after {
        left: 150%;
        transition: 0.75s;
    }

    .clickable-card:active {
        transform: scale(0.98);
    }
    
    .badge-premium-click {
        position: absolute;
        top: 8px;
        right: 8px;
        font-size: 0.65rem;
        background: rgba(20, 184, 166, 0.1);
        color: var(--primary);
        padding: 2px 6px;
        border-radius: 20px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
    }

    /* Glassmorphic Modal styling */
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .modal-backdrop.show {
        opacity: 1;
        visibility: visible;
    }

    .modal-container {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        width: 95%;
        max-width: 950px;
        max-height: 85vh;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-direction: column;
        transform: scale(0.95) translateY(20px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
    }

    .modal-backdrop.show .modal-container {
        transform: scale(1) translateY(0);
    }

    .modal-header {
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(to right, var(--bg), var(--surface));
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text);
    }

    .modal-close-btn {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        transition: all 0.2s;
    }

    .modal-close-btn:hover {
        background: var(--bg);
        color: var(--text);
    }

    .modal-body {
        padding: 1.5rem;
        overflow-y: auto;
        flex-grow: 1;
        max-height: calc(85vh - 70px);
    }

    .search-container {
        position: relative;
        margin-bottom: 1.25rem;
    }

    .search-input {
        width: 100%;
        padding: 0.75rem 1rem 0.75rem 2.5rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: var(--bg);
        color: var(--text);
        font-size: 0.875rem;
        transition: all 0.2s;
    }

    .search-input:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15);
    }

    .search-icon {
        position: absolute;
        left: 0.85rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
        pointer-events: none;
        width: 16px;
        height: 16px;
    }

    /* Grid for Growth Dashboard */
    .dashboard-row {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    @media (min-width: 1024px) {
        .dashboard-row {
            grid-template-columns: 3.5fr 2.5fr;
        }
    }

    /* Top Cities panel styles */
    .city-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .city-item {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    .city-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.875rem;
    }

    .city-name {
        font-weight: 600;
        color: var(--text);
    }

    .city-percentage {
        font-weight: 700;
        color: var(--primary);
    }

    .city-progress-wrapper {
        height: 8px;
        background: var(--bg);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
    }

    .city-progress-bar {
        height: 100%;
        border-radius: 4px;
        background: linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%);
        transition: width 1s ease-in-out;
    }

    .city-stats {
        display: flex;
        gap: 0.75rem;
        font-size: 0.75rem;
        margin-top: 0.2rem;
    }

    .city-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
        border-radius: var(--radius-sm);
        font-weight: 500;
    }

    .city-badge-paid {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
    }

    .city-badge-unpaid {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
    }

    .trend-indicator {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.75rem;
    }

    .trend-up {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
    }

    .trend-down {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
    }
</style>
@endpush

@section('content')
<div class="page-header">
    <div>
        <h1>Statistik Customer</h1>
        <p>Analisis data keanggotaan customer dan performa order dari database arsip</p>
    </div>
</div>

<!-- Tabs -->
<div class="tabs" id="yearTabs">
    <button class="tab-btn active" id="btn-all" onclick="changeYear('all')">All Time</button>
    <!-- Dynamic tabs will be added here -->
</div>

<h4 style="margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: 600; color: var(--text-secondary);">Ringkasan Data</h4>
<div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
    <div class="stat-card" style="border-top: 4px solid var(--primary);">
        <h3>Total Data</h3>
        <div class="value" id="totalData">-</div>
        <div class="label">Semua Data</div>
    </div>
    <div class="stat-card" style="border-top: 4px solid #3b82f6;">
        <h3>Total Lead</h3>
        <div class="value" id="totalLeads">-</div>
        <div class="label">Semua Lead</div>
    </div>
    <div class="stat-card" style="border-top: 4px solid #10b981;">
        <h3>Total Customer</h3>
        <div class="value" id="totalCustomers">-</div>
        <div class="label">Customer Terdaftar</div>
    </div>
</div>

<h4 style="margin-top: 1.5rem; margin-bottom: 0.75rem; font-weight: 600; color: var(--text-secondary);">Analisis Keanggotaan Customer</h4>
<div class="stats-grid">
    <div class="stat-card clickable-card" style="border-top: 4px solid #b4b3b2;" onclick="showPremiumCustomers()">
        <span class="badge-premium-click">Lihat Detail</span>
        <h3>Platinum</h3>
        <div class="value text-primary" id="platinumCount">-</div>
        <div class="label">Tier Platinum</div>
    </div>
    <div class="stat-card" style="border-top: 4px solid #d4af37;">
        <h3>Gold</h3>
        <div class="value" style="color: #d4af37;" id="goldCount">-</div>
        <div class="label">Tier Gold</div>
    </div>
    <div class="stat-card" style="border-top: 4px solid #a0a0a0;">
        <h3>Silver</h3>
        <div class="value" style="color: #888;" id="silverCount">-</div>
        <div class="label">Tier Silver</div>
    </div>
    <div class="stat-card" style="border-top: 4px solid #a0522d;">
        <h3>Bronze</h3>
        <div class="value" style="color: #cd7f32;" id="bronzeCount">-</div>
        <div class="label">Tier Bronze</div>
    </div>
</div>

<!-- Stats Grid - Order Summary -->
<h4 style="margin-top: 2rem; margin-bottom: 0.75rem; font-weight: 600; color: var(--text-secondary);">Ringkasan Status Pembayaran Order (Arsip)</h4>
<div class="stats-grid">
    <div class="stat-card" style="border-left: 5px solid #10b981; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
            <h3 style="color: #10b981; font-weight: 600;">Order Lunas (Paid)</h3>
            <div class="value text-success" id="paidOrdersAmount">Rp -</div>
        </div>
        <div class="label" id="paidOrdersCount" style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">- order lunas</div>
    </div>
    <div class="stat-card" style="border-left: 5px solid #ef4444; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
            <h3 style="color: #ef4444; font-weight: 600;">Order Belum Lunas (Unpaid)</h3>
            <div class="value text-danger" id="unpaidOrdersAmount">Rp -</div>
        </div>
        <div class="label" id="unpaidOrdersCount" style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">- order belum lunas</div>
    </div>
</div>

<!-- Chart Row -->
<div class="chart-card" style="margin-top: 2rem;">
    <h4>Diagram Produk Paling Banyak Order Lunas (Paid)</h4>
    <div class="chart-container">
        <canvas id="revenueChart"></canvas>
    </div>
</div>

<!-- Top Customers Table -->
<div class="card-table" style="margin-top: 2rem;">
    <h4>Tingkatan Customer (Paling Banyak Belanja Amount)</h4>
    <div style="overflow-x: auto;">
        <table>
            <thead>
                <tr>
                    <th>Member ID</th>
                    <th>Nama</th>
                    <th>WhatsApp</th>
                    <th>Email</th>
                    <th>Keanggotaan</th>
                    <th>Total Spent</th>
                </tr>
            </thead>
            <tbody id="topCustomersBody">
                <tr>
                    <td colspan="6" style="text-align:center;">Memuat data...</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<!-- Dashboard Row: Monthly Growth Chart & Top Cities Panel -->
<div class="dashboard-row" style="margin-top: 2rem;">
    <!-- Column 1: Customer Growth Chart -->
    <div class="chart-card" style="margin-bottom: 0;">
        <h4>Analisis Pertumbuhan Customer Bulan ke Bulan (MoM)</h4>
        <div class="chart-container" style="height: 350px;">
            <canvas id="growthChart"></canvas>
        </div>
    </div>

    <!-- Column 2: Top Cities Panel -->
    <div class="chart-card" style="margin-bottom: 0;">
        <h4>Top Kota Asal Customer (Paid vs Unpaid)</h4>
        <div class="city-list" id="topCitiesContainer">
            <div style="text-align: center; color: var(--text-muted); padding: 2rem;">Memuat data kota...</div>
        </div>
    </div>
</div>

<!-- Detailed Monthly Growth Table -->
<div class="card-table" style="margin-top: 2rem;">
    <h4>Tabel Rincian Pertumbuhan & Retensi Customer Bulanan</h4>
    <div style="overflow-x: auto;">
        <table>
            <thead>
                <tr>
                    <th>Bulan</th>
                    <th>Customer Aktif (Transaksi Paid)</th>
                    <th>Pertumbuhan MoM</th>
                    <th>Customer Baru (New)</th>
                    <th>Repeat Order</th>
                </tr>
            </thead>
            <tbody id="growthTableBody">
                <tr>
                    <td colspan="5" style="text-align:center;">Memuat data pertumbuhan...</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<!-- Premium Customers Modal -->
<div class="modal-backdrop" id="premiumCustomersModal" onclick="handleBackdropClick(event)">
    <div class="modal-container">
        <div class="modal-header">
            <h3>Data Customer Premium (Platinum, Gold, Silver)</h3>
            <button class="modal-close-btn" onclick="closePremiumCustomers()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="search-container">
                <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <input type="text" class="search-input" id="modalSearchInput" placeholder="Cari berdasarkan Nama, Member ID, WhatsApp, atau Email..." oninput="filterPremiumCustomers()">
            </div>
            <div style="overflow-x: auto; max-height: 480px;">
                <table>
                    <thead>
                        <tr>
                            <th>Member ID</th>
                            <th>Nama</th>
                            <th>WhatsApp</th>
                            <th>Email</th>
                            <th>Keanggotaan</th>
                            <th>Total Spent</th>
                        </tr>
                    </thead>
                    <tbody id="modalCustomersBody">
                        <tr>
                            <td colspan="6" style="text-align:center;">Memuat data premium...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    const API_BASE = '/api/sales';
    let authToken = localStorage.getItem('auth_token');
    let currentYear = 'all';
    let revenueChart = null;
    let yearsInitialized = false;

    function getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };
    }

    function renderYearTabs(years) {
        if (yearsInitialized) return;
        const tabsContainer = document.getElementById('yearTabs');
        
        // Reset tabs but keep "All Time"
        tabsContainer.innerHTML = '<button class="tab-btn active" id="btn-all" onclick="changeYear(\'all\')">All Time</button>';
        
        if (years && Array.isArray(years)) {
            // Sort years descending
            const sortedYears = [...years].sort((a, b) => b - a);
            sortedYears.forEach(y => {
                const btn = document.createElement('button');
                btn.className = 'tab-btn';
                btn.id = `btn-${y}`;
                btn.textContent = y;
                btn.onclick = () => changeYear(y);
                tabsContainer.appendChild(btn);
            });
        }
        yearsInitialized = true;
    }

    function changeYear(year) {
        currentYear = year;
        
        // Update active class
        const buttons = document.querySelectorAll('.tab-btn');
        buttons.forEach(btn => {
            if (btn.id === `btn-${year}`) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        loadStatistics();
    }

    async function loadStatistics() {
        const url = `${API_BASE}/customer/statistics?tahun=${currentYear}`;
        
        try {
            const response = await fetch(url, { headers: getHeaders() });
            const result = await response.json();
            
            if (result.success) {
                // Initialize years list dynamically on first load
                if (result.data.years) {
                    renderYearTabs(result.data.years);
                }
                
                renderStats(result.data);
                renderChart(result.data.top_products);
                renderTopCustomers(result.data.top_customers);
                renderGrowthDashboard(result.data.customer_growth, result.data.top_cities);
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    function renderStats(data) {
        // Membership Tiers
        document.getElementById('totalData').textContent = (data.total_data || 0).toLocaleString('id-ID');
        document.getElementById('totalLeads').textContent = (data.total_leads || 0).toLocaleString('id-ID');
        document.getElementById('totalCustomers').textContent = (data.total_customers || 0).toLocaleString('id-ID');
        document.getElementById('platinumCount').textContent = (data.membership.platinum || 0).toLocaleString('id-ID');
        document.getElementById('goldCount').textContent = (data.membership.gold || 0).toLocaleString('id-ID');
        document.getElementById('silverCount').textContent = (data.membership.silver || 0).toLocaleString('id-ID');
        document.getElementById('bronzeCount').textContent = (data.membership.bronze || 0).toLocaleString('id-ID');

        // Order Summary Metrics
        if (data.orders) {
            document.getElementById('paidOrdersAmount').textContent = 'Rp ' + (data.orders.paid_amount || 0).toLocaleString('id-ID');
            document.getElementById('paidOrdersCount').textContent = (data.orders.paid_count || 0).toLocaleString('id-ID') + ' order lunas';

            document.getElementById('unpaidOrdersAmount').textContent = 'Rp ' + (data.orders.unpaid_amount || 0).toLocaleString('id-ID');
            document.getElementById('unpaidOrdersCount').textContent = (data.orders.unpaid_count || 0).toLocaleString('id-ID') + ' order belum lunas';
        }
    }

    function renderChart(topProducts) {
        const ctx = document.getElementById('revenueChart').getContext('2d');
        
        if (revenueChart) {
            revenueChart.destroy();
        }

        if (!topProducts || topProducts.length === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }

        const labels = topProducts.map(p => p.produk_nama);
        const counts = topProducts.map(p => p.paid_orders_count);
        
        revenueChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Jumlah Order Lunas (Paid)',
                    data: counts,
                    backgroundColor: 'rgba(20, 184, 166, 0.75)',
                    borderColor: 'rgb(20, 184, 166)',
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Horizontal bars for ultimate label readability
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        },
                        title: {
                            display: true,
                            text: 'Jumlah Order Paid',
                            font: {
                                weight: 'bold'
                            }
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.parsed.x} Order Lunas`;
                            }
                        }
                    }
                }
            }
        });
    }

    function renderTopCustomers(customers) {
        const tbody = document.getElementById('topCustomersBody');
        
        if (!customers || customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tidak ada data</td></tr>';
            return;
        }
        
        tbody.innerHTML = customers.map(c => {
            const waLink = c.wa && c.wa !== '-' ? `https://wa.me/${c.wa}` : '#';
            const badgeClass = `badge-${(c.keanggotaan || 'basic').toLowerCase()}`;
            
            return `
                <tr>
                    <td><code>${c.memberID || '-'}</code></td>
                    <td><strong>${c.nama}</strong></td>
                    <td>
                        ${c.wa && c.wa !== '-' ? `
                            <a href="${waLink}" target="_blank" class="text-primary" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                                <i class="fab fa-whatsapp" style="color:#25d366; font-size: 1.1rem;"></i> ${c.wa}
                            </a>
                        ` : '-'}
                    </td>
                    <td>${c.email || '-'}</td>
                    <td><span class="badge ${badgeClass}">${c.keanggotaan}</span></td>
                    <td class="text-success" style="font-weight: 600;">Rp ${c.total_spent.toLocaleString('id-ID')}</td>
                </tr>
            `;
        }).join('');
    }

    // New JS Variables and Functions for Monthly Growth and Top Cities
    let growthChart = null;
    let premiumCustomersList = [];

    function renderGrowthDashboard(growthData, citiesData) {
        // 1. Render Chart.js for Growth (Line + Stacked Bar)
        const ctx = document.getElementById('growthChart').getContext('2d');
        
        if (growthChart) {
            growthChart.destroy();
        }

        if (!growthData || growthData.length === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        } else {
            const labels = growthData.map(row => row.month_name);
            const newCustomers = growthData.map(row => row.new_count);
            const repeatCustomers = growthData.map(row => row.repeat_count);
            const totalCustomers = growthData.map(row => row.total_count);

            growthChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Customer Baru (New)',
                            data: newCustomers,
                            backgroundColor: 'rgba(56, 189, 248, 0.75)', // Sky blue
                            borderColor: 'rgb(56, 189, 248)',
                            borderWidth: 1,
                            borderRadius: 4,
                            stack: 'membership'
                        },
                        {
                            label: 'Repeat Order',
                            data: repeatCustomers,
                            backgroundColor: 'rgba(99, 102, 241, 0.75)', // Indigo
                            borderColor: 'rgb(99, 102, 241)',
                            borderWidth: 1,
                            borderRadius: 4,
                            stack: 'membership'
                        },
                        {
                            label: 'Total Customer Aktif',
                            data: totalCustomers,
                            type: 'line',
                            borderColor: 'rgb(20, 184, 166)', // Teal
                            backgroundColor: 'rgba(20, 184, 166, 0.1)',
                            borderWidth: 3,
                            pointBackgroundColor: 'rgb(20, 184, 166)',
                            pointHoverRadius: 7,
                            tension: 0.35,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                boxWidth: 12,
                                font: {
                                    size: 11
                                }
                            }
                        }
                    }
                }
            });
        }

        // 2. Render Growth Details Table (Newest first)
        const tableBody = document.getElementById('growthTableBody');
        if (!growthData || growthData.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Tidak ada data pertumbuhan</td></tr>';
        } else {
            tableBody.innerHTML = growthData.map(row => {
                const growthVal = row.growth;
                let growthBadge = '';
                if (growthVal > 0) {
                    growthBadge = `<span class="trend-indicator trend-up"><i class="fas fa-arrow-up"></i> +${growthVal}%</span>`;
                } else if (growthVal < 0) {
                    growthBadge = `<span class="trend-indicator trend-down"><i class="fas fa-arrow-down"></i> ${growthVal}%</span>`;
                } else {
                    growthBadge = `<span class="trend-indicator text-muted" style="font-size:0.75rem;">0%</span>`;
                }
                
                return `
                    <tr>
                        <td><strong>${row.month_name}</strong></td>
                        <td style="font-weight: 600;">${row.total_count.toLocaleString('id-ID')} customer</td>
                        <td>${growthBadge}</td>
                        <td>
                            <div style="font-weight: 600;">${row.new_count.toLocaleString('id-ID')} <span style="font-weight: normal; color: var(--text-muted); font-size: 0.75rem;">(${row.new_percentage}%)</span></div>
                        </td>
                        <td>
                            <div style="font-weight: 600;">${row.repeat_count.toLocaleString('id-ID')} <span style="font-weight: normal; color: var(--text-muted); font-size: 0.75rem;">(${row.repeat_percentage}%)</span></div>
                        </td>
                    </tr>
                `;
            }).reverse().join('');
        }

        // 3. Render Top Cities list
        const citiesContainer = document.getElementById('topCitiesContainer');
        if (!citiesData || citiesData.length === 0) {
            citiesContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">Tidak ada data kota asal</div>';
        } else {
            citiesContainer.innerHTML = citiesData.map(city => {
                return `
                    <div class="city-item">
                        <div class="city-info">
                            <span class="city-name">${city.city}</span>
                            <span class="city-percentage">${city.percentage}%</span>
                        </div>
                        <div class="city-progress-wrapper">
                            <div class="city-progress-bar" style="width: ${city.percentage}%"></div>
                        </div>
                        <div class="city-stats">
                            <span class="city-badge city-badge-paid"><i class="fas fa-check-circle"></i> ${city.paid_orders.toLocaleString('id-ID')} Paid</span>
                            <span class="city-badge city-badge-unpaid"><i class="fas fa-times-circle"></i> ${city.unpaid_orders.toLocaleString('id-ID')} Unpaid</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // Modal Logic for Premium Customers
    async function showPremiumCustomers() {
        const modal = document.getElementById('premiumCustomersModal');
        const tbody = document.getElementById('modalCustomersBody');
        const searchInput = document.getElementById('modalSearchInput');
        
        // Clear search
        searchInput.value = '';
        
        // Show modal
        modal.classList.add('show');
        
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Memuat data customer premium...</td></tr>';
        
        const url = `${API_BASE}/customer?all=true&keanggotaan=platinum,gold,silver` + (currentYear !== 'all' ? `&tahun=${currentYear}` : '');
        
        try {
            const response = await fetch(url, { headers: getHeaders() });
            const result = await response.json();
            
            if (result.success && result.data) {
                premiumCustomersList = result.data.map(c => {
                    const spendVal = parseFloat(c.total_spend || 0);
                    return {
                        ...c,
                        total_spent: spendVal
                    };
                });
                renderPremiumCustomers(premiumCustomersList);
            } else {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-danger);">Gagal memuat data</td></tr>';
            }
        } catch (error) {
            console.error('Error fetching premium customers:', error);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-danger);">Terjadi kesalahan koneksi</td></tr>';
        }
    }

    function renderPremiumCustomers(customers) {
        const tbody = document.getElementById('modalCustomersBody');
        
        if (!customers || customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Tidak ada data customer premium</td></tr>';
            return;
        }
        
        tbody.innerHTML = customers.map(c => {
            const waLink = c.wa && c.wa !== '-' ? `https://wa.me/${c.wa}` : '#';
            const badgeClass = `badge-${(c.keanggotaan || 'basic').toLowerCase()}`;
            const formattedSpend = typeof c.total_spent === 'number' ? c.total_spent.toLocaleString('id-ID') : parseFloat(c.total_spend || 0).toLocaleString('id-ID');
            
            return `
                <tr>
                    <td><code>${c.memberID || '-'}</code></td>
                    <td><strong>${c.nama}</strong></td>
                    <td>
                        ${c.wa && c.wa !== '-' ? `
                            <a href="${waLink}" target="_blank" class="text-primary" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                                <i class="fab fa-whatsapp" style="color:#25d366; font-size: 1.1rem;"></i> ${c.wa}
                            </a>
                        ` : '-'}
                    </td>
                    <td>${c.email || '-'}</td>
                    <td><span class="badge ${badgeClass}">${c.keanggotaan}</span></td>
                    <td class="text-success" style="font-weight: 600;">Rp ${formattedSpend}</td>
                </tr>
            `;
        }).join('');
    }

    function filterPremiumCustomers() {
        const query = document.getElementById('modalSearchInput').value.toLowerCase().trim();
        
        if (!query) {
            renderPremiumCustomers(premiumCustomersList);
            return;
        }
        
        const filtered = premiumCustomersList.filter(c => {
            const name = (c.nama || '').toLowerCase();
            const memberID = (c.memberID || '').toLowerCase();
            const wa = (c.wa || '').toLowerCase();
            const email = (c.email || '').toLowerCase();
            
            return name.includes(query) || memberID.includes(query) || wa.includes(query) || email.includes(query);
        });
        
        renderPremiumCustomers(filtered);
    }

    function closePremiumCustomers() {
        document.getElementById('premiumCustomersModal').classList.remove('show');
    }
    
    function handleBackdropClick(event) {
        if (event.target.id === 'premiumCustomersModal') {
            closePremiumCustomers();
        }
    }
    
    // Support Escape key to close modal
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closePremiumCustomers();
        }
    });

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        loadStatistics();
    });
</script>
@endpush

@extends('layouts.admin')

@section('title', 'Sales Dashboard')
@section('page_title', 'Dashboard Sales')

@push('styles')
<style>
    :root {
        --theme-primary: #5EEAD4;
        --theme-primary-dark: #14B8A6;
        --theme-primary-light: #7DD3FC;
        --theme-primary-lighter: #CCFBF1;
    }

    .stat-card::before {
        background: linear-gradient(90deg, var(--theme-primary) 0%, var(--theme-primary-light) 100%);
    }

    .stat-icon {
        background: var(--theme-primary-lighter);
        color: var(--theme-primary);
        transition: all 0.3s ease;
    }

    .stat-card:hover .stat-icon {
        transform: scale(1.05);
    }
    
    /* Override untuk card dengan inline style (financial metrics & stats-grid-2x2) */
    .stat-card:hover .stat-icon[style] {
        opacity: 0.9;
        transform: scale(1.05);
    }

    .sidebar-link.active,
    .sidebar-link:hover {
        background: linear-gradient(135deg, rgba(94, 234, 212, 0.08) 0%, rgba(94, 234, 212, 0.03) 100%);
        color: var(--theme-primary-dark);
    }

    .sidebar-link.active::before {
        background: linear-gradient(180deg, var(--theme-primary) 0%, var(--theme-primary-dark) 100%);
    }

    .stats-grid-2x2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .stats-grid-2x2 .stat-card {
        min-height: 140px;
        padding: 1.5rem;
    }

    .stats-grid-2x2 .stat-icon {
        width: 40px;
        height: 40px;
    }

    .stats-grid-2x2 .stat-icon svg {
        width: 20px;
        height: 20px;
    }

    .stats-grid-2x2 .stat-value {
        font-size: 1.25rem;
    }

    .stats-grid-2x2 .stat-label {
        font-size: 0.8125rem;
    }

    @media (max-width: 1024px) {
        .stats-grid-2x2 {
            grid-template-columns: 1fr;
        }

        .financial-metrics-grid {
            grid-template-columns: repeat(3, 1fr) !important;
        }
    }

    @media (max-width: 768px) {
        .financial-metrics-grid {
            grid-template-columns: repeat(2, 1fr) !important;
        }
    }

    @media (max-width: 480px) {
        .financial-metrics-grid {
            grid-template-columns: 1fr !important;
        }
    }

    .financial-metrics-grid .stat-card {
        min-height: 140px;
    }

    .financial-metrics-grid .stat-icon {
        width: 40px;
        height: 40px;
    }

    .financial-metrics-grid .stat-icon svg {
        width: 20px;
        height: 20px;
    }

    .financial-metrics-grid .stat-value {
        font-size: 1.25rem;
    }

    .financial-metrics-grid .stat-label {
        font-size: 0.8125rem;
    }
</style>
@endpush

@section('content')
    <div class="card-grid" style="grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1.5rem;">
        <!-- Col 6 - Chart Perbandingan Transaksi dan Order -->
        <div class="card-table">
            <h3>Perbandingan Transaksi & Order</h3>
            <canvas id="chartTransaksiOrder" style="max-height: 360px;"></canvas>
        </div>

        <!-- Col 6 - 4 Card Statistik (2x2) -->
        <div class="stats-grid-2x2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="stat-card">
                <div class="stat-icon" style="background: #CCFBF1; color: #14B8A6;">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 3h18v4H3z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                        <path d="M5 7v14h14V7" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    </svg>
                </div>
                <span class="stat-label">Total Order</span>
                <span class="stat-value" id="overview-total-order">0</span>
                <small class="text-muted">Keseluruhan</small>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #D1FAE5; color: #10B981;">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12l4 4L19 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    </svg>
                </div>
                <span class="stat-label">Total Paid</span>
                <span class="stat-value" id="overview-paid-order">0</span>
                <small class="text-muted">Status order = 2</small>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #FEE2E2; color: #EF4444;">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    </svg>
                </div>
                <span class="stat-label">Total Unpaid</span>
                <span class="stat-value" id="overview-unpaid-order">0</span>
                <small class="text-muted">Belum dibayar</small>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #FEF3C7; color: #F59E0B;">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        <path d="M12 8V12L16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    </svg>
                </div>
                <span class="stat-label">Paid Ratio</span>
                <span class="stat-value" id="paid-ratio">0%</span>
                <small class="text-muted">Persentase</small>
            </div>
        </div>
    </div>

    <!-- Financial Metrics Section -->
    <div class="card-grid financial-metrics-grid" style="grid-template-columns: repeat(5, 1fr); gap: 1rem; margin-top: 1.5rem;">
        <div class="stat-card">
            <div class="stat-icon" style="background: #FFE5E5; color: #FF6B6B;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Gross Revenue</span>
            <span class="stat-value" id="gross-revenue">Rp 0</span>
            <small class="text-muted">Total harga</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #FFF4E5; color: #FFB84D;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Shipping Cost</span>
            <span class="stat-value" id="shipping-cost">Rp 0</span>
            <small class="text-muted">Total ongkir</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #E5F5FF; color: #4DA6FF;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Net Revenue</span>
            <span class="stat-value" id="net-revenue">Rp 0</span>
            <small class="text-muted">Harga produk</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #E5FFE5; color: #4DFF4D;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Gross Profit</span>
            <span class="stat-value" id="gross-profit">Rp 0</span>
            <small class="text-muted">Net - shipping</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #F0E5FF; color: #9D4DFF;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    <path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Net Profit</span>
            <span class="stat-value" id="net-profit">Rp 0</span>
            <small class="text-muted">Profit bersih</small>
        </div>
    </div>

    <div class="card-grid" style="grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1.5rem;">
        <div class="card-table">
            <h3>Performa Penjualan (30 Hari)</h3>
            <canvas id="chartPenjualan" style="max-height: 300px;"></canvas>
        </div>
        <div class="card-table">
            <h3>Performa Sales (7 Hari)</h3>
            <canvas id="chartSales" style="max-height: 300px;"></canvas>
        </div>
    </div>

    <div class="card-grid" style="grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1.5rem;">
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
                            <td colspan="3" style="text-align: center; padding: 2rem;">Memuat data...</td>
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
                            <td colspan="4" style="text-align: center; padding: 2rem;">Memuat data...</td>
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
    let chartOrderStatus = null;
    let chartPenjualan = null;
    let chartSales = null;

    async function loadDashboardData() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
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
            
            if (result.success && result.data) {
                const data = result.data;
                
                // Helper function to safely update element
                function safeUpdateElement(id, value) {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = value;
                    }
                }

                // Update financial metrics
                if (data.financial) {
                    safeUpdateElement('gross-revenue', data.financial.gross_revenue_formatted ?? 'Rp 0');
                    safeUpdateElement('shipping-cost', data.financial.shipping_cost_formatted ?? 'Rp 0');
                    safeUpdateElement('net-revenue', data.financial.net_revenue_formatted ?? 'Rp 0');
                    safeUpdateElement('gross-profit', data.financial.gross_profit_formatted ?? 'Rp 0');
                    safeUpdateElement('net-profit', data.financial.net_profit_formatted ?? 'Rp 0');
                }

                // Overview cards
                if (data.overview) {
                    // Update overview stats cards (2x2 grid)
                    safeUpdateElement('overview-total-order', data.overview.orders_total ?? 0);
                    safeUpdateElement('overview-paid-order', data.overview.orders_paid ?? 0);
                    safeUpdateElement('overview-unpaid-order', data.overview.orders_unpaid ?? 0);
                    safeUpdateElement('paid-ratio', data.overview.paid_ratio_formatted ?? '0%');
                }

                // Update chart transaksi dan order
                if (data.chart_transaksi_order) {
                    updateChartTransaksiOrder(data.chart_transaksi_order);
                }

                // Update chart status order (keep for compatibility)
                if (data.chart_status_order) {
                    updateOrderStatusChart(data.chart_status_order);
                }

                // Update chart performa penjualan
                updateChartPenjualan(data.chart_performa_penjualan);
                
                // Update chart performa sales
                updateChartSales(data.chart_performa_sales);

                // Update tabel follow up
                updateFollowUpTable(data.riwayat_follow_up);

                // Update tabel pembelian
                updatePembelianTable(data.pembelian_terakhir);
            }
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
                        backgroundColor: '#14b8a6',
                        borderRadius: 8,
                        yAxisID: 'y',
                    },
                    {
                        label: 'Jumlah Order',
                        data: data.map(item => item.order),
                        backgroundColor: '#5eead4',
                        borderRadius: 8,
                        yAxisID: 'y1',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.datasetIndex === 0) {
                                    label += 'Rp ' + new Intl.NumberFormat('id-ID').format(context.parsed.y);
                                } else {
                                    label += context.parsed.y;
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + new Intl.NumberFormat('id-ID', {
                                    notation: 'compact',
                                    maximumFractionDigits: 1
                                }).format(value);
                            }
                        },
                        title: {
                            display: true,
                            text: 'Transaksi (Rp)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        grid: {
                            drawOnChartArea: false,
                        },
                        ticks: {
                            stepSize: 1
                        },
                        title: {
                            display: true,
                            text: 'Jumlah Order'
                        }
                    }
                }
            }
        });
    }

    function updateOrderStatusChart(data) {
        const canvas = document.getElementById('chartOrderStatus');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');

        if (chartOrderStatus) {
            chartOrderStatus.destroy();
        }

        chartOrderStatus = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.label),
                datasets: [
                    {
                        label: 'Paid',
                        data: data.map(item => item.paid),
                        backgroundColor: '#22c55e',
                        borderRadius: 8,
                    },
                    {
                        label: 'Belum Paid',
                        data: data.map(item => item.unpaid),
                        backgroundColor: '#f97316',
                        borderRadius: 8,
                    },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                        }
                    }
                }
            }
        });
    }

    function updateChartPenjualan(data) {
        const canvas = document.getElementById('chartPenjualan');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (chartPenjualan) {
            chartPenjualan.destroy();
        }

        chartPenjualan = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                    label: 'Total Penjualan',
                    data: data.map(item => item.total),
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + new Intl.NumberFormat('id-ID').format(value);
                            }
                        }
                    }
                }
            }
        });
    }

    function updateChartSales(data) {
        const canvas = document.getElementById('chartSales');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (chartSales) {
            chartSales.destroy();
        }

        chartSales = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                    label: 'Jumlah Order',
                    data: data.map(item => item.count),
                    backgroundColor: '#14b8a6',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    function updateFollowUpTable(data) {
        const tbody = document.getElementById('follow-up-table');
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem;">Tidak ada data</td></tr>';
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
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Tidak ada data</td></tr>';
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

    // Load data when page loads
    document.addEventListener('DOMContentLoaded', function() {
        loadDashboardData();
    });
</script>
@endpush


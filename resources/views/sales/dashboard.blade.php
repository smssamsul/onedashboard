@extends('layouts.admin')

@section('title', 'Sales Dashboard')
@section('page_title', 'Dashboard Sales')

@section('content')
    <div class="card-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3h18v4H3z" stroke="currentColor" stroke-width="2" fill="none"/>
                    <path d="M5 7v14h14V7" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Total Order</span>
            <span class="stat-value" id="total-order">0</span>
            <small class="text-muted">Keseluruhan</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12l4 4L19 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Order Paid</span>
            <span class="stat-value" id="paid-order">0</span>
            <small class="text-muted">Status pembayaran = paid</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <span class="stat-label">Order Belum Paid</span>
            <span class="stat-value" id="unpaid-order">0</span>
            <small class="text-muted">Butuh tindak lanjut</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7-6a4 4 0 1 1 0 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <span class="stat-label">Total Customer</span>
            <span class="stat-value" id="total-customer">0</span>
            <small class="text-muted" id="customer-today">+0 hari ini</small>
        </div>
    </div>

    <div class="card-grid">
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 12h4l3 9 4-18 3 9h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <span class="stat-label">Total Penjualan Hari Ini</span>
            <span class="stat-value" id="total-hari-ini">Rp 0</span>
            <small class="text-muted">Hari ini</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <span class="stat-label">Total Penjualan Bulan Ini</span>
            <span class="stat-value" id="total-bulan-ini">Rp 0</span>
            <small class="text-muted">Bulan ini</small>
        </div>
    </div>

    <div class="card-table" style="margin-top: 1.5rem;">
        <h3>Perbandingan Order Harian (Paid vs Belum Paid)</h3>
        <canvas id="chartOrderStatus" style="max-height: 360px;"></canvas>
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

            const response = await fetch('/api/admin/sales/dashboard', {
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
                
                // Update statistik
                document.getElementById('total-hari-ini').textContent = data.statistik.total_penjualan_hari_ini_formatted;
                document.getElementById('total-bulan-ini').textContent = data.statistik.total_penjualan_bulan_ini_formatted;

                // Overview cards
                if (data.overview) {
                    document.getElementById('total-order').textContent = data.overview.orders_total ?? 0;
                    document.getElementById('paid-order').textContent = data.overview.orders_paid ?? 0;
                    document.getElementById('unpaid-order').textContent = data.overview.orders_unpaid ?? 0;
                    document.getElementById('total-customer').textContent = data.overview.customers_total ?? 0;
                    const todayIncrement = data.overview.customers_new_today ?? 0;
                    document.getElementById('customer-today').textContent = `+${todayIncrement} hari ini`;
                }

                // Update chart status order
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

    function updateOrderStatusChart(data) {
        const ctx = document.getElementById('chartOrderStatus').getContext('2d');

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
        const ctx = document.getElementById('chartPenjualan').getContext('2d');
        
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
        const ctx = document.getElementById('chartSales').getContext('2d');
        
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
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem;">Tidak ada data</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.customer}</td>
                <td>${item.follup}</td>
                <td>${item.tanggal || '-'}</td>
            </tr>
        `).join('');
    }

    function updatePembelianTable(data) {
        const tbody = document.getElementById('pembelian-table');
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Tidak ada data</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.customer}</td>
                <td>${item.produk}</td>
                <td>${item.total_harga_formatted}</td>
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


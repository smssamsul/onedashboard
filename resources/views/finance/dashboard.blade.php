@extends('layouts.admin')

@section('title', 'Finance Dashboard')
@section('page_title', 'Dashboard Finance')

@push('styles')
<style>
    :root {
        --theme-primary: #34D399;
        --theme-primary-dark: #10B981;
        --theme-primary-light: #6EE7B7;
        --theme-primary-lighter: #D1FAE5;
    }

    .stat-card::before {
        background: linear-gradient(90deg, var(--theme-primary) 0%, var(--theme-primary-light) 100%);
    }

    .stat-icon {
        transition: all 0.3s ease;
    }

    .stat-card:hover .stat-icon {
        transform: scale(1.05);
    }
    
    .stat-card:hover .stat-icon[style] {
        opacity: 0.9;
        transform: scale(1.05);
    }

    .stat-icon {
        width: 40px;
        height: 40px;
    }

    .stat-icon svg {
        width: 20px;
        height: 20px;
    }

    .stat-value {
        font-size: 1.25rem;
    }

    .stat-label {
        font-size: 0.8125rem;
    }

    .stat-card {
        min-height: 140px;
    }

    .sidebar-link.active,
    .sidebar-link:hover {
        background: linear-gradient(135deg, rgba(52, 211, 153, 0.08) 0%, rgba(52, 211, 153, 0.03) 100%);
        color: var(--theme-primary-dark);
    }

    .sidebar-link.active::before {
        background: linear-gradient(180deg, var(--theme-primary) 0%, var(--theme-primary-dark) 100%);
    }
</style>
@endpush

@section('content')
    <div class="card-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
            <div class="stat-icon" style="background: #D1FAE5; color: #10B981;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Pendapatan Bulan Ini</span>
            <span class="stat-value" id="pendapatan-bulan-ini">Rp 0</span>
            <small class="text-muted">Bulan ini</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #FEE2E2; color: #EF4444;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2v20M6 5h7.5a3.5 3.5 0 0 1 0 7H6M18 12H10.5a3.5 3.5 0 0 0 0 7H18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Pengeluaran Bulan Ini</span>
            <span class="stat-value" id="pengeluaran-bulan-ini">Rp 0</span>
            <small class="text-muted">Bulan ini</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #D1FAE5; color: #10B981;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12l4 4L19 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Profit Bulan Ini</span>
            <span class="stat-value" id="profit-bulan-ini">Rp 0</span>
            <small class="text-muted" id="profit-margin">0% margin</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #E5F5FF; color: #4DA6FF;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9L11 5H19C19.5304 5 20.0391 5.21071 20.4142 5.58579C20.7893 5.96086 21 6.46957 21 7V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Saldo Saat Ini</span>
            <span class="stat-value" id="saldo-saat-ini">Rp 0</span>
            <small class="text-muted">Total saldo</small>
        </div>
    </div>

    <div class="card-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
            <div class="stat-icon" style="background: #FEF3C7; color: #F59E0B;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Piutang</span>
            <span class="stat-value" id="accounts-receivable">Rp 0</span>
            <small class="text-muted">Belum diterima</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #FEE2E2; color: #EF4444;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 11L12 14L22 4M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Hutang</span>
            <span class="stat-value" id="accounts-payable">Rp 0</span>
            <small class="text-muted">Belum dibayar</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #D1FAE5; color: #10B981;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Invoice Lunas</span>
            <span class="stat-value" id="invoice-lunas">0</span>
            <small class="text-muted" id="invoice-tertunda">0 tertunda</small>
        </div>
    </div>

    <div class="card-grid" style="grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1.5rem;">
        <div class="card-table">
            <h3>Pendapatan vs Pengeluaran (6 Bulan)</h3>
            <canvas id="chartPendapatan" style="max-height: 300px;"></canvas>
        </div>
        <div class="card-table">
            <h3>Cashflow (Minggu Ini)</h3>
            <canvas id="chartCashflow" style="max-height: 300px;"></canvas>
        </div>
    </div>

    <div class="card-table" style="margin-top: 1.5rem;">
        <h3>Transaksi Terbaru</h3>
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Tipe</th>
                        <th>Deskripsi</th>
                        <th>Jumlah</th>
                        <th>Tanggal</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="transaksi-table">
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 2rem;">Memuat data...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
@endsection

@push('scripts')
<script>
    let chartPendapatan = null;
    let chartCashflow = null;

    async function loadDashboardData() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch('/api/admin/finance/dashboard', {
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
                
                // Update statistik
                safeUpdateElement('pendapatan-bulan-ini', data.statistik.pendapatan_bulan_ini_formatted);
                safeUpdateElement('pengeluaran-bulan-ini', data.statistik.pengeluaran_bulan_ini_formatted);
                safeUpdateElement('profit-bulan-ini', data.statistik.profit_bulan_ini_formatted);
                safeUpdateElement('profit-margin', (data.statistik.profit_margin ?? 0) + '% margin');
                safeUpdateElement('saldo-saat-ini', data.cashflow.saldo_saat_ini_formatted);
                safeUpdateElement('accounts-receivable', data.cashflow.accounts_receivable_formatted);
                safeUpdateElement('accounts-payable', data.cashflow.accounts_payable_formatted);
                safeUpdateElement('invoice-lunas', data.laporan.invoice_lunas ?? 0);
                safeUpdateElement('invoice-tertunda', (data.laporan.pembayaran_tertunda ?? 0) + ' tertunda');

                // Update charts
                if (data.chart_pendapatan) {
                    updateChartPendapatan(data.chart_pendapatan);
                }
                if (data.chart_cashflow) {
                    updateChartCashflow(data.chart_cashflow);
                }
                if (data.transaksi_terbaru) {
                    updateTransaksiTable(data.transaksi_terbaru);
                }
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    function updateChartPendapatan(data) {
        const canvas = document.getElementById('chartPendapatan');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (chartPendapatan) {
            chartPendapatan.destroy();
        }

        chartPendapatan = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                    label: 'Pendapatan',
                    data: data.map(item => item.pendapatan),
                    backgroundColor: '#10b981',
                    borderRadius: 8,
                }, {
                    label: 'Pengeluaran',
                    data: data.map(item => item.pengeluaran),
                    backgroundColor: '#f43f5e',
                    borderRadius: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + new Intl.NumberFormat('id-ID').format(value / 1000000) + 'M';
                            }
                        }
                    }
                }
            }
        });
    }

    function updateChartCashflow(data) {
        const canvas = document.getElementById('chartCashflow');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (chartCashflow) {
            chartCashflow.destroy();
        }

        chartCashflow = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                    label: 'Masuk',
                    data: data.map(item => item.masuk),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Keluar',
                    data: data.map(item => item.keluar),
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + new Intl.NumberFormat('id-ID').format(value / 1000000) + 'M';
                            }
                        }
                    }
                }
            }
        });
    }

    function updateTransaksiTable(data) {
        const tbody = document.getElementById('transaksi-table');
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">Tidak ada data</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(item => {
            const jumlahFormatted = 'Rp ' + new Intl.NumberFormat('id-ID').format(item.jumlah);
            const statusClass = item.status === 'Lunas' || item.status === 'Dibayar' ? 'status-success' : 'status-warning';
            return `
                <tr>
                    <td><span class="status-pill ${item.tipe === 'Pendapatan' ? 'status-success' : 'status-danger'}">${item.tipe}</span></td>
                    <td>${item.deskripsi}</td>
                    <td>${jumlahFormatted}</td>
                    <td>${item.tanggal || '-'}</td>
                    <td><span class="status-pill ${statusClass}">${item.status}</span></td>
                </tr>
            `;
        }).join('');
    }

    document.addEventListener('DOMContentLoaded', function() {
        loadDashboardData();
    });
</script>
@endpush


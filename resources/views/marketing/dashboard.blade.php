@extends('layouts.admin')

@section('title', 'Marketing Dashboard')
@section('page_title', 'Dashboard Marketing')

@push('styles')
<style>
    :root {
        --theme-primary: #FB7185;
        --theme-primary-dark: #F43F5E;
        --theme-primary-light: #FCA5A5;
        --theme-primary-lighter: #FFE4E6;
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
        background: linear-gradient(135deg, rgba(251, 113, 133, 0.08) 0%, rgba(251, 113, 133, 0.03) 100%);
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
            <div class="stat-icon" style="background: #FFE4E6; color: #F43F5E;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 12h4l3 9 4-18 3 9h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Total Campaign</span>
            <span class="stat-value" id="total-campaign">0</span>
            <small class="text-muted">Keseluruhan</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #D1FAE5; color: #10B981;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12l4 4L19 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Campaign Aktif</span>
            <span class="stat-value" id="campaign-aktif">0</span>
            <small class="text-muted">Sedang berjalan</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #E5F5FF; color: #4DA6FF;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Total Leads</span>
            <span class="stat-value" id="total-leads">0</span>
            <small class="text-muted" id="lead-baru-hari-ini">+0 hari ini</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #D1FAE5; color: #10B981;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Total Revenue</span>
            <span class="stat-value" id="total-revenue">Rp 0</span>
            <small class="text-muted">Dari campaign</small>
        </div>
    </div>

    <div class="card-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
            <div class="stat-icon" style="background: #FEF3C7; color: #F59E0B;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 11L12 14L22 4M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Conversion Rate</span>
            <span class="stat-value" id="conversion-rate">0%</span>
            <small class="text-muted">Tingkat konversi</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #FEE2E2; color: #EF4444;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                    <path d="M12 8v4l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Cost per Lead</span>
            <span class="stat-value" id="cost-per-lead">Rp 0</span>
            <small class="text-muted">Biaya per lead</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #F0E5FF; color: #9D4DFF;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    <path d="M12 8V12L16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">ROAS</span>
            <span class="stat-value" id="roas">0%</span>
            <small class="text-muted">Return on ad spend</small>
        </div>
    </div>

    <div class="card-grid" style="grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1.5rem;">
        <div class="card-table">
            <h3>Leads (Minggu Ini)</h3>
            <canvas id="chartLeads" style="max-height: 300px;"></canvas>
        </div>
        <div class="card-table">
            <h3>Campaign Performance (6 Bulan)</h3>
            <canvas id="chartCampaign" style="max-height: 300px;"></canvas>
        </div>
    </div>

    <div class="card-table" style="margin-top: 1.5rem;">
        <h3>Campaign Terbaru</h3>
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Nama Campaign</th>
                        <th>Channel</th>
                        <th>Leads</th>
                        <th>Konversi</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="campaign-table">
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
    let chartLeads = null;
    let chartCampaign = null;

    async function loadDashboardData() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch('/api/marketing/dashboard', {
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
                safeUpdateElement('total-campaign', data.statistik.total_campaign ?? 0);
                safeUpdateElement('campaign-aktif', data.statistik.campaign_aktif ?? 0);
                safeUpdateElement('total-leads', data.statistik.total_lead ?? 0);
                safeUpdateElement('lead-baru-hari-ini', '+' + (data.statistik.lead_baru_hari_ini ?? 0) + ' hari ini');
                safeUpdateElement('total-revenue', data.performance.total_revenue_formatted);
                safeUpdateElement('conversion-rate', (data.performance.conversion_rate ?? 0) + '%');
                safeUpdateElement('cost-per-lead', data.performance.cost_per_lead_formatted);
                safeUpdateElement('roas', data.performance.return_on_ad_spend_formatted);

                // Update charts
                if (data.chart_leads) {
                    updateChartLeads(data.chart_leads);
                }
                if (data.chart_campaign) {
                    updateChartCampaign(data.chart_campaign);
                }
                if (data.campaign_terbaru) {
                    updateCampaignTable(data.campaign_terbaru);
                }
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    function updateChartLeads(data) {
        const canvas = document.getElementById('chartLeads');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (chartLeads) {
            chartLeads.destroy();
        }

        chartLeads = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                    label: 'Leads',
                    data: data.map(item => item.leads),
                    backgroundColor: '#f43f5e',
                    borderRadius: 8,
                }, {
                    label: 'Konversi',
                    data: data.map(item => item.konversi),
                    backgroundColor: '#fb7185',
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
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    function updateChartCampaign(data) {
        const canvas = document.getElementById('chartCampaign');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (chartCampaign) {
            chartCampaign.destroy();
        }

        chartCampaign = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                    label: 'Leads',
                    data: data.map(item => item.leads),
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y',
                }, {
                    label: 'Revenue',
                    data: data.map(item => item.revenue),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1',
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
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Rp ' + new Intl.NumberFormat('id-ID').format(value / 1000000) + 'M';
                            }
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    function updateCampaignTable(data) {
        const tbody = document.getElementById('campaign-table');
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">Tidak ada data</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(item => {
            const statusClass = item.status === 'Aktif' ? 'status-success' : 'status-warning';
            return `
                <tr>
                    <td>${item.nama}</td>
                    <td>${item.channel}</td>
                    <td>${item.leads ?? 0}</td>
                    <td>${item.konversi ?? 0}</td>
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


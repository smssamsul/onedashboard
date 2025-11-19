@extends('layouts.customer')

@section('title', 'Dashboard Customer')

@section('content')
    <div class="dashboard-welcome" style="margin-bottom: 2rem;">
        <h2>Selamat Datang, <span id="welcome-name">...</span>!</h2>
        <p class="text-muted">Kelola dan akses order Anda di sini</p>
    </div>

    <div class="stat-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3h18v4H3z" stroke="currentColor" stroke-width="2" fill="none"/>
                    <path d="M5 7v14h14V7" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
            </div>
            <div class="stat-info">
                <span class="stat-label">Total Order</span>
                <span class="stat-value" id="total-order">0</span>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="color: var(--success);">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12l4 4L19 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <div class="stat-info">
                <span class="stat-label">Order Aktif</span>
                <span class="stat-value" id="order-aktif">0</span>
            </div>
        </div>
    </div>

    <div class="orders-section">
        <h3 style="margin-bottom: 1.5rem; font-size: 1.5rem; font-weight: 700; color: var(--text);">Order Aktif Saya</h3>
        
        <div id="orders-container" class="orders-grid">
            <div class="loading-state" style="text-align: center; padding: 3rem;">
                <p style="color: var(--muted);">Memuat data...</p>
            </div>
        </div>

        <div id="empty-state" class="empty-state" style="display: none; text-align: center; padding: 3rem; background: var(--surface); border-radius: 16px; box-shadow: var(--shadow-sm);">
            <svg style="width: 64px; height: 64px; margin: 0 auto 1rem; color: var(--muted);" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3h18v4H3z" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M5 7v14h14V7" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            <h4 style="margin: 0 0 0.5rem; color: var(--text);">Belum ada order aktif</h4>
            <p style="margin: 0; color: var(--muted);">Order yang sudah Anda bayar akan muncul di sini</p>
        </div>
    </div>
@endsection

@push('styles')
<style>
    .dashboard-welcome h2 {
        margin: 0 0 0.5rem 0;
        font-size: 2rem;
        font-weight: 800;
        color: var(--text);
    }

    .stat-cards {
        margin-bottom: 2rem;
    }

    .stat-card {
        background: var(--surface);
        padding: 1.5rem;
        border-radius: 16px;
        box-shadow: var(--shadow-sm);
        display: flex;
        align-items: center;
        gap: 1rem;
        transition: all 0.3s;
    }

    .stat-card:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
    }

    .stat-icon {
        width: 48px;
        height: 48px;
        padding: 0.75rem;
        background: var(--primary-lighter);
        border-radius: 12px;
        color: var(--primary);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .stat-icon svg {
        width: 100%;
        height: 100%;
    }

    .stat-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .stat-label {
        font-size: 0.875rem;
        color: var(--muted);
        font-weight: 500;
    }

    .stat-value {
        font-size: 1.75rem;
        font-weight: 800;
        color: var(--text);
    }

    .orders-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 1.5rem;
    }

    .order-card {
        background: var(--surface);
        border-radius: 16px;
        box-shadow: var(--shadow-sm);
        overflow: hidden;
        transition: all 0.3s;
        display: flex;
        flex-direction: column;
    }

    .order-card:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-4px);
    }

    .order-image-container {
        position: relative;
        width: 100%;
        height: 200px;
        overflow: hidden;
        background: linear-gradient(135deg, var(--primary-lighter) 0%, #fff 100%);
    }

    .order-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .order-badge {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: var(--primary);
        color: white;
        padding: 0.375rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
    }

    .order-badge.ebook {
        background: var(--secondary);
    }

    .order-badge.seminar {
        background: var(--primary);
    }

    .order-content {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        flex: 1;
    }

    .order-header {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .order-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text);
        margin: 0;
    }

    .order-kode {
        font-size: 0.875rem;
        color: var(--muted);
        font-family: monospace;
    }

    .order-info {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1rem;
        background: var(--bg);
        border-radius: 12px;
    }

    .order-info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .order-info-label {
        font-size: 0.875rem;
        color: var(--muted);
        font-weight: 500;
    }

    .order-info-value {
        font-size: 0.875rem;
        color: var(--text);
        font-weight: 600;
    }

    .seminar-schedule {
        background: linear-gradient(135deg, var(--primary-lighter) 0%, #fff 100%);
        padding: 1rem;
        border-radius: 12px;
        margin-top: 0.5rem;
    }

    .seminar-schedule-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text);
        margin: 0 0 0.5rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .seminar-time {
        font-size: 1rem;
        font-weight: 700;
        color: var(--primary);
        margin: 0;
    }

    .order-actions {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-top: auto;
    }

    .btn-primary, .btn-secondary {
        padding: 0.875rem 1.5rem;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.9375rem;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
        border: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        text-decoration: none;
    }

    .btn-primary {
        background: var(--primary);
        color: white;
    }

    .btn-primary:hover {
        background: var(--primary-dark);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }

    .btn-secondary {
        background: var(--surface);
        color: var(--primary);
        border: 2px solid var(--primary);
    }

    .btn-secondary:hover {
        background: var(--primary-lighter);
    }

    .loading-state {
        grid-column: 1 / -1;
    }

    @media (max-width: 768px) {
        .orders-grid {
            grid-template-columns: 1fr;
        }

        .stat-cards {
            grid-template-columns: 1fr;
        }
    }
</style>
@endpush

@push('scripts')
<script>
    let customerData = null;

    async function loadDashboardData() {
        try {
            const token = localStorage.getItem('customer_auth_token');
            if (!token) {
                window.location.href = '/customer/login';
                return;
            }

            const response = await fetch('/api/customer/dashboard', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('customer_auth_token');
                localStorage.removeItem('customer_data');
                window.location.href = '/customer/login';
                return;
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                const data = result.data;
                customerData = data;
                
                // Update header
                const customerName = data.customer.nama_panggilan || data.customer.nama;
                document.getElementById('customer-name').textContent = customerName;
                document.getElementById('welcome-name').textContent = customerName;

                // Update statistik
                document.getElementById('total-order').textContent = data.statistik.total_order ?? 0;
                document.getElementById('order-aktif').textContent = data.statistik.order_aktif ?? 0;

                // Render orders
                renderOrders(data.orders_aktif);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            document.getElementById('orders-container').innerHTML = 
                '<div class="loading-state"><p style="color: var(--danger);">Terjadi kesalahan saat memuat data</p></div>';
        }
    }

    function renderOrders(orders) {
        const container = document.getElementById('orders-container');
        const emptyState = document.getElementById('empty-state');

        if (!orders || orders.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'grid';
        emptyState.style.display = 'none';

        container.innerHTML = orders.map(order => {
            const isSeminar = order.tipe_produk === 'seminar';
            const isEbook = order.tipe_produk === 'ebook';
            
            // Ambil gambar pertama atau default
            const imageUrl = order.gambar && order.gambar.length > 0 
                ? order.gambar[0] 
                : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5NzMxNiIgZmlsbC1vcGFjaXR5PSIwLjEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxOHB4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iI2Y5NzMxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

            let seminarInfo = '';
            let actionButtons = '';

            if (isSeminar && order.webinar) {
                const webinar = order.webinar;
                const startTime = webinar.start_time_formatted || webinar.start_time || 'Belum dijadwalkan';
                
                seminarInfo = `
                    <div class="seminar-schedule">
                        <div class="seminar-schedule-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Jadwal Seminar
                        </div>
                        <p class="seminar-time">${startTime}</p>
                    </div>
                `;

                if (webinar.join_url) {
                    actionButtons = `
                        <a href="${webinar.join_url}" target="_blank" class="btn-primary">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 12L9 8V16L15 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                            </svg>
                            Join Seminar
                        </a>
                    `;
                }
            }

            if (isEbook && order.ebook_url) {
                actionButtons = `
                    <a href="${order.ebook_url}" target="_blank" class="btn-primary">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M4 6V19.5C4 20.163 4.26339 20.7989 4.73223 21.2678C5.20107 21.7366 5.83696 22 6.5 22H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M4 6C4 5.33696 4.26339 4.70107 4.73223 4.23223C5.20107 3.76339 5.83696 3.5 6.5 3.5H20V17H6.5C5.83696 17 5.20107 16.7366 4.73223 16.2678C4.26339 15.7989 4 15.163 4 14.5V6Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M8 8H16M8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Buka Ebook
                    </a>
                `;
            }

            return `
                <div class="order-card">
                    <div class="order-image-container">
                        <img src="${imageUrl}" alt="${order.produk_nama}" class="order-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5NzMxNiIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4='">
                        <span class="order-badge ${order.tipe_produk}">${order.tipe_produk === 'seminar' ? 'Seminar' : 'Ebook'}</span>
                    </div>
                    <div class="order-content">
                        <div class="order-header">
                            <h4 class="order-title">${order.produk_nama || 'Produk'}</h4>
                            <span class="order-kode">${order.produk_kode || '-'}</span>
                        </div>
                        <div class="order-info">
                            <div class="order-info-item">
                                <span class="order-info-label">Total Harga</span>
                                <span class="order-info-value">${order.total_harga_formatted}</span>
                            </div>
                            <div class="order-info-item">
                                <span class="order-info-label">Tanggal Order</span>
                                <span class="order-info-value">${order.tanggal_order || '-'}</span>
                            </div>
                        </div>
                        ${seminarInfo}
                        ${actionButtons ? `<div class="order-actions">${actionButtons}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Load data when page loads
    document.addEventListener('DOMContentLoaded', function() {
        loadDashboardData();
    });
</script>
@endpush


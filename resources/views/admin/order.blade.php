@extends('layouts.admin')

@section('title', 'Order')
@section('page_title', 'Order')

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

    .page-header p {
        margin: 0.25rem 0 0 0;
        opacity: 0.8;
        font-size: 0.875rem;
    }

    .action-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
    }

    .search-filter-group {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        flex-wrap: wrap;
    }

    .search-input {
        position: relative;
    }

    .search-input input {
        padding: 0.625rem 1rem 0.625rem 2.5rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        width: 280px;
        background: var(--surface);
        transition: all 0.2s;
    }

    .search-input input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
    }

    .search-input::before {
        content: '';
        position: absolute;
        left: 0.875rem;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'/%3E%3C/svg%3E") no-repeat center;
        background-size: contain;
    }

    .btn {
        padding: 0.625rem 1.25rem;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }

    .btn-primary {
        background: var(--primary);
        color: white;
    }

    .btn-primary:hover {
        background: var(--primary-dark);
    }

    .btn-secondary {
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
    }

    .btn-secondary:hover {
        background: var(--bg);
    }

    .loading {
        text-align: center;
        padding: 2rem;
        color: var(--text-muted);
    }

    .empty-state {
        text-align: center;
        padding: 3rem 2rem;
        color: var(--text-muted);
    }

    .table-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        justify-content: center;
    }

    .table-action-btn {
        padding: 0.375rem 0.75rem;
        border-radius: var(--radius-sm);
        font-size: 0.8125rem;
        cursor: pointer;
        border: 1px solid var(--border);
        transition: all 0.2s ease;
        background: transparent;
    }

    .table-action-btn:hover {
        background: var(--bg);
    }

    .table-action-btn.view {
        color: var(--accent);
        border-color: var(--accent);
    }

    .table-action-btn.view:hover {
        background: var(--accent-lighter);
    }

    .filter-select {
        padding: 0.625rem 2rem 0.625rem 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        background: var(--surface);
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0.75rem center;
        background-size: 16px;
    }

    .filter-select:focus {
        outline: none;
        border-color: var(--accent);
    }

    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.75rem;
        margin-top: 1.5rem;
    }

    .pagination button {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border);
        background: var(--surface);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s;
    }

    .pagination button:hover:not(:disabled) {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
    }

    .pagination button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .pagination span {
        font-size: 0.875rem;
        color: var(--text-secondary);
    }

    .status-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: 500;
    }

    .status-badge.pending {
        background: #fef3c7;
        color: #92400e;
    }

    .status-badge.approved {
        background: #d1fae5;
        color: #065f46;
    }

    .status-badge.rejected {
        background: #fee2e2;
        color: #991b1b;
    }

    .status-badge.unpaid {
        background: #e0e7ff;
        color: #3730a3;
    }

    .card-table {
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        overflow: hidden;
    }

    .card-table-header {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border);
        background: var(--bg);
    }

    .table-responsive {
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    thead {
        background: var(--bg);
    }

    th {
        padding: 0.875rem 1rem;
        text-align: left;
        font-size: 0.8125rem;
        font-weight: 600;
        color: #ffffff;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--border);
    }

    td {
        padding: 1rem;
        border-bottom: 1px solid var(--border);
        font-size: 0.875rem;
        color: var(--text);
    }

    tbody tr:hover {
        background: var(--bg);
    }

    .text-right {
        text-align: right;
    }

    .text-center {
        text-align: center;
    }
</style>
@endpush

@section('content')
<!-- Page Header -->
<div class="page-header">
    <div>
        <h1>Data Order</h1>
        <p>Kelola dan monitor semua order customer</p>
    </div>
</div>

<!-- Action Bar -->
<div class="action-bar">
    <div class="search-filter-group">
        <div class="search-input">
            <input type="text" id="searchInput" placeholder="Cari order..." onkeyup="handleSearch()" />
        </div>
        <select class="filter-select" id="perPageSelect" onchange="changePerPage()">
            <option value="10">10 per halaman</option>
            <option value="15" selected>15 per halaman</option>
            <option value="25">25 per halaman</option>
            <option value="50">50 per halaman</option>
            <option value="100">100 per halaman</option>
        </select>
    </div>
    <div class="btn-group">
        <button class="btn btn-secondary" onclick="loadOrders()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
        </button>
    </div>
</div>

<!-- Order Table -->
<div class="card-table">
    <div class="card-table-header">
        <h3 style="margin:0; border:none; padding:0;">Daftar Order</h3>
    </div>
    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>ID Order</th>
                    <th>Customer</th>
                    <th>Produk</th>
                    <th>Sales</th>
                    <th>Total Harga</th>
                    <th>Total Bayar</th>
                    <th>Sisa</th>
                    <th>Status Pembayaran</th>
                    <th>Tanggal</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody id="orderTableBody">
                <tr>
                    <td colspan="10" class="loading">Memuat data...</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<!-- Pagination -->
<div class="pagination" id="pagination"></div>
@endsection

@push('scripts')
<script>
    const API_BASE = '/api/sales';
    let authToken = localStorage.getItem('auth_token');
    let currentPage = 1;
    let perPage = 15;
    let searchTimeout;

    function getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };
    }

    function formatCurrency(amount) {
        if (!amount) return 'Rp 0';
        const num = parseFloat(amount);
        return 'Rp ' + num.toLocaleString('id-ID');
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function getStatusBadge(status) {
        const statusMap = {
            '0': { class: 'unpaid', text: 'Belum Bayar' },
            '1': { class: 'pending', text: 'Menunggu Validasi' },
            '2': { class: 'approved', text: 'Sudah Di-approve' },
            '3': { class: 'rejected', text: 'Ditolak' }
        };
        const statusInfo = statusMap[status] || { class: 'unpaid', text: 'Unknown' };
        return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
    }

    function handleSearch() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadOrders();
        }, 500);
    }

    function changePerPage() {
        perPage = parseInt(document.getElementById('perPageSelect').value);
        currentPage = 1;
        loadOrders();
    }

    function renderOrders(orders, pagination) {
        const tbody = document.getElementById('orderTableBody');
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="empty-state">Tidak ada data order</td></tr>';
            renderPagination(null);
            return;
        }
        
        tbody.innerHTML = orders.map(order => {
            const customer = order.customer_rel || {};
            const produk = order.produk_rel || {};
            const totalHarga = parseFloat(order.total_harga || 0);
            const totalPaid = parseFloat(order.total_paid || 0);
            const remaining = parseFloat(order.remaining || 0);
            const salesNama = customer.sales_nama || customer.sales_rel?.nama || '-';
            
            return `
                <tr>
                    <td><strong>#${order.id}</strong></td>
                    <td>
                        <strong>${customer.nama || '-'}</strong>
                        ${customer.wa ? `<br><small style="color: var(--text-muted);">${customer.wa}</small>` : ''}
                    </td>
                    <td>${produk.nama || '-'}</td>
                    <td>${salesNama}</td>
                    <td class="text-right">${formatCurrency(totalHarga)}</td>
                    <td class="text-right">${formatCurrency(totalPaid)}</td>
                    <td class="text-right"><strong>${formatCurrency(remaining)}</strong></td>
                    <td>${getStatusBadge(order.status_pembayaran)}</td>
                    <td>${formatDate(order.create_at)}</td>
                    <td class="table-actions">
                        <button class="table-action-btn view" onclick="viewOrder(${order.id})">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                            Detail
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        renderPagination(pagination);
    }

    function renderPagination(pagination) {
        if (!pagination) {
            document.getElementById('pagination').innerHTML = '';
            return;
        }
        const container = document.getElementById('pagination');
        container.innerHTML = `
            <button onclick="loadOrders(${pagination.current_page - 1})" ${pagination.current_page === 1 ? 'disabled' : ''}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
                Prev
            </button>
            <span>Halaman ${pagination.current_page} dari ${pagination.last_page} (${pagination.total} data)</span>
            <button onclick="loadOrders(${pagination.current_page + 1})" ${pagination.current_page === pagination.last_page ? 'disabled' : ''}>
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </button>
        `;
    }

    async function loadOrders(page = 1) {
        currentPage = page;
        const search = document.getElementById('searchInput').value;
        perPage = parseInt(document.getElementById('perPageSelect').value);
        
        let url = `${API_BASE}/order?page=${page}&per_page=${perPage}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const tbody = document.getElementById('orderTableBody');
        tbody.innerHTML = '<tr><td colspan="10" class="loading">Memuat data...</td></tr>';

        try {
            const response = await fetch(url, { headers: getHeaders() });
            const result = await response.json();

            if (result.success && result.data && result.data.length > 0) {
                renderOrders(result.data, result.pagination);
            } else {
                tbody.innerHTML = '<tr><td colspan="10" class="empty-state">Tidak ada data order</td></tr>';
                renderPagination(null);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            tbody.innerHTML = '<tr><td colspan="10" style="color: var(--danger);">Gagal memuat data</td></tr>';
        }
    }

    function viewOrder(id) {
        // Redirect ke detail order atau buka modal
        window.location.href = `/sales/order?id=${id}`;
    }

    // Load orders on page load
    document.addEventListener('DOMContentLoaded', function() {
        loadOrders();
    });
</script>
@endpush


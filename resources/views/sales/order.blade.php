@extends('layouts.sales')

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
</style>
@endpush

@section('content')
<div class="page-header">
    <div>
        <h1>Order</h1>
        <p>Daftar order</p>
    </div>
</div>

<!-- Action Bar -->
<div class="action-bar">
    <div class="search-filter-group">
        <div class="search-input">
            <input type="text" id="searchInput" placeholder="Cari customer atau produk..." onkeyup="handleSearch()" />
        </div>
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
                    <th>Customer</th>
                    <th>Produk</th>
                    <th>Total Harga</th>
                    <th>Status Order</th>
                    <th>Tanggal</th>
                </tr>
            </thead>
            <tbody id="orderTableBody">
                <tr>
                    <td colspan="5" class="loading">Memuat data...</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>
@endsection

@push('scripts')
<script>
    const API_BASE = '/api/sales';
    let allOrders = [];
    
    function getHeaders() {
        const token = localStorage.getItem('auth_token');
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric'
        });
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    }

    function handleSearch() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const filtered = allOrders.filter(order => 
            (order.customer_rel?.nama || '').toLowerCase().includes(searchTerm) ||
            (order.produk_rel?.nama || '').toLowerCase().includes(searchTerm)
        );
        renderOrders(filtered);
    }

    function renderOrders(orders) {
        const tbody = document.getElementById('orderTableBody');
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Tidak ada data order</td></tr>';
            return;
        }
        tbody.innerHTML = orders.map(order => `
            <tr>
                <td>${order.customer_rel?.nama || '-'}</td>
                <td>${order.produk_rel?.nama || '-'}</td>
                <td>${formatCurrency(order.total_harga || 0)}</td>
                <td>${order.status_order || '-'}</td>
                <td>${formatDate(order.create_at)}</td>
            </tr>
        `).join('');
    }

    async function loadOrders() {
        const tbody = document.getElementById('orderTableBody');
        tbody.innerHTML = '<tr><td colspan="5" class="loading">Memuat data...</td></tr>';

        try {
            const response = await fetch(`${API_BASE}/order`, { headers: getHeaders() });
            const result = await response.json();

            if (result.success && result.data && result.data.length > 0) {
                allOrders = result.data;
                renderOrders(allOrders);
            } else {
                allOrders = [];
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Tidak ada data order</td></tr>';
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            tbody.innerHTML = '<tr><td colspan="5" style="color: var(--danger);">Gagal memuat data</td></tr>';
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        loadOrders();
    });
</script>
@endpush

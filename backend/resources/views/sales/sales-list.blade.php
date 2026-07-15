@extends('layouts.sales')

@section('title', 'Sales List')
@section('page_title', 'Sales List')

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
        padding: 0.625rem 1rem;
        padding-left: 2.5rem;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        font-size: 0.9375rem;
        width: 300px;
    }

    .search-input svg {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
    }

    .filter-select {
        padding: 0.625rem 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        font-size: 0.9375rem;
        background: white;
    }

    .btn-group {
        display: flex;
        gap: 0.75rem;
    }

    .btn {
        padding: 0.625rem 1.25rem;
        border-radius: var(--radius);
        font-weight: 600;
        font-size: 0.9375rem;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
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
        background: var(--secondary);
        color: white;
    }

    .btn-secondary:hover {
        background: var(--secondary-dark);
    }

    .card-table {
        background: white;
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow);
        overflow: hidden;
    }

    .card-table-header {
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border);
        background: var(--surface);
    }

    .table-responsive {
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    thead {
        background: var(--surface);
    }

    th {
        padding: 1rem 1.5rem;
        text-align: left;
        font-weight: 600;
        color: #ffffff;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    td {
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--border);
        color: var(--text);
    }

    tbody tr {
        background: white;
    }

    tbody tr:hover {
        background: var(--surface);
    }

    .table-actions {
        display: flex;
        gap: 0.5rem;
    }

    .table-action-item {
        padding: 0.375rem 0.75rem;
        border-radius: var(--radius);
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .table-action-item.edit {
        background: var(--info-light);
        color: var(--info);
    }

    .table-action-item.edit:hover {
        background: var(--info);
        color: white;
    }

    .table-action-item.delete {
        background: var(--danger-light);
        color: var(--danger);
    }

    .table-action-item.delete:hover {
        background: var(--danger);
        color: white;
    }

    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        margin-top: 1.5rem;
    }

    .pagination button {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .pagination button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .pagination span {
        color: var(--text-muted);
        font-size: 0.875rem;
    }

    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal-overlay.active {
        display: flex;
    }

    .modal {
        background: white;
        border-radius: var(--radius-lg);
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: var(--shadow-lg);
    }

    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
    }

    .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--text-muted);
    }

    .modal-body {
        padding: 1.5rem;
    }

    .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
    }

    .form-group {
        margin-bottom: 1.25rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: var(--text);
    }

    .form-group input,
    .form-group select {
        width: 100%;
        padding: 0.625rem;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        font-size: 0.9375rem;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .loading {
        text-align: center;
        padding: 2rem;
        color: var(--text-muted);
    }

    .empty-state {
        text-align: center;
        padding: 2rem;
        color: var(--text-muted);
    }

    .alert {
        padding: 1rem;
        border-radius: var(--radius);
        margin-bottom: 1rem;
    }

    .alert-success {
        background: var(--success-light);
        color: var(--success);
        border: 1px solid var(--success);
    }

    .alert-error {
        background: var(--danger-light);
        color: var(--danger);
        border: 1px solid var(--danger);
    }
</style>
@endpush

@section('content')
<div class="page-header">
    <div>
        <h1>Sales List</h1>
        <p>Kelola data sales</p>
    </div>
    <button class="btn btn-primary" onclick="openSalesModal()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Tambah Sales
    </button>
</div>

<!-- Alert Container -->
<div id="alertContainer"></div>

<!-- Action Bar -->
<div class="action-bar">
    <div class="search-filter-group">
        <div class="search-input">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" id="searchInput" placeholder="Cari nama sales atau woowa key..." />
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
        <button class="btn btn-secondary" onclick="loadSales()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
        </button>
    </div>
</div>

<!-- Sales Table -->
<div class="card-table">
    <div class="card-table-header">
        <h3 style="margin:0; border:none; padding:0;">Daftar Sales</h3>
    </div>
    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>Urutan</th>
                    <th>Nama Sales</th>
                    <th>Email</th>
                    <th>Woowa Key</th>
                    <th>Last Update Lead</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody id="salesTableBody">
                <tr>
                    <td colspan="6" class="loading">Memuat data...</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<!-- Pagination -->
<div class="pagination" id="pagination"></div>

<!-- Create/Edit Sales Modal -->
<div class="modal-overlay" id="salesModal">
    <div class="modal">
        <div class="modal-header">
            <h3 id="modalTitle">Tambah Sales</h3>
            <button class="modal-close" onclick="closeSalesModal()">&times;</button>
        </div>
        <div class="modal-body">
            <input type="hidden" id="salesId" />
            <div class="form-group">
                <label>User *</label>
                <select id="salesUserId" required>
                    <option value="">Pilih User</option>
                </select>
            </div>
            <div class="form-group">
                <label>Woowa Key</label>
                <input type="text" id="salesWoowaKey" placeholder="Masukkan Woowa Key" />
            </div>
            <div class="form-group">
                <label>Urutan</label>
                <input type="text" id="salesUrutan" placeholder="Auto generate jika kosong" />
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeSalesModal()">Batal</button>
            <button class="btn btn-primary" onclick="saveSales()" id="btnSaveSales">Simpan</button>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    const API_BASE = '/api/sales';
    let authToken = localStorage.getItem('auth_token');
    let currentPage = 1;
    let perPage = 15;
    let userList = [];
    
    function getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };
    }

    function showAlert(message, type = 'success') {
        const container = document.getElementById('alertContainer');
        container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        setTimeout(() => container.innerHTML = '', 5000);
    }

    function changePerPage() {
        perPage = parseInt(document.getElementById('perPageSelect').value);
        currentPage = 1;
        loadSales();
    }

    async function loadUsers() {
        try {
            const response = await fetch('/api/admin/users', { headers: getHeaders() });
            const result = await response.json();
            if (result.success && result.data) {
                userList = result.data;
                const select = document.getElementById('salesUserId');
                select.innerHTML = '<option value="">Pilih User</option>';
                userList.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.nama}${user.email ? ' (' + user.email + ')' : ''}`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    function renderSales(salesList, pagination) {
        const tbody = document.getElementById('salesTableBody');
        if (salesList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Tidak ada data sales</td></tr>';
            renderPagination(null);
            return;
        }
        tbody.innerHTML = salesList.map(sales => `
            <tr>
                <td>${sales.urutan || '-'}</td>
                <td>
                    <strong>${sales.user_rel ? sales.user_rel.nama : '-'}</strong>
                    ${sales.karyawan_rel ? `<br><small style="color: var(--text-muted);">${sales.karyawan_rel.nama}</small>` : ''}
                </td>
                <td>${sales.user_rel ? (sales.user_rel.email || '-') : '-'}</td>
                <td>${sales.woowa_key || '-'}</td>
                <td>${sales.last_update_lead || '-'}</td>
                <td class="table-actions">
                    <span class="table-action-item edit" onclick="editSales(${sales.id})">Edit</span>
                    <span class="table-action-item delete" onclick="deleteSales(${sales.id})">Hapus</span>
                </td>
            </tr>
        `).join('');
        
        renderPagination(pagination);
    }

    function renderPagination(pagination) {
        if (!pagination) {
            document.getElementById('pagination').innerHTML = '';
            return;
        }
        const container = document.getElementById('pagination');
        container.innerHTML = `
            <button onclick="loadSales(${pagination.current_page - 1})" ${pagination.current_page === 1 ? 'disabled' : ''}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
                Prev
            </button>
            <span>Halaman ${pagination.current_page} dari ${pagination.last_page} (${pagination.total} data)</span>
            <button onclick="loadSales(${pagination.current_page + 1})" ${pagination.current_page === pagination.last_page ? 'disabled' : ''}>
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </button>
        `;
    }

    async function loadSales(page = 1) {
        try {
            currentPage = page;
            const search = document.getElementById('searchInput').value;
            const params = new URLSearchParams({
                page: page,
                per_page: perPage
            });
            if (search) {
                params.append('search', search);
            }

            const response = await fetch(`${API_BASE}/sales-list?${params}`, { headers: getHeaders() });
            const result = await response.json();

            if (result.success) {
                renderSales(result.data, result.pagination);
            } else {
                showAlert(result.message || 'Gagal memuat data sales', 'error');
            }
        } catch (error) {
            console.error('Error loading sales:', error);
            showAlert('Terjadi kesalahan saat memuat data', 'error');
        }
    }

    function openSalesModal() {
        document.getElementById('salesModal').classList.add('active');
        document.getElementById('modalTitle').textContent = 'Tambah Sales';
        document.getElementById('salesId').value = '';
        document.getElementById('salesUserId').value = '';
        document.getElementById('salesWoowaKey').value = '';
        document.getElementById('salesUrutan').value = '';
        loadUsers();
    }

    function closeSalesModal() {
        document.getElementById('salesModal').classList.remove('active');
    }

    async function editSales(id) {
        try {
            const response = await fetch(`${API_BASE}/sales-list/${id}`, { headers: getHeaders() });
            const result = await response.json();

            if (result.success && result.data) {
                const sales = result.data;
                document.getElementById('salesModal').classList.add('active');
                document.getElementById('modalTitle').textContent = 'Edit Sales';
                document.getElementById('salesId').value = sales.id;
                document.getElementById('salesUserId').value = sales.user_id || '';
                document.getElementById('salesWoowaKey').value = sales.woowa_key || '';
                document.getElementById('salesUrutan').value = sales.urutan || '';
                await loadUsers();
            } else {
                showAlert('Sales tidak ditemukan', 'error');
            }
        } catch (error) {
            console.error('Error loading sales:', error);
            showAlert('Gagal memuat data sales', 'error');
        }
    }

    async function saveSales() {
        const id = document.getElementById('salesId').value;
        const userId = document.getElementById('salesUserId').value;
        const woowaKey = document.getElementById('salesWoowaKey').value.trim();
        const urutan = document.getElementById('salesUrutan').value.trim();

        if (!userId) {
            showAlert('User wajib diisi', 'error');
            return;
        }

        const btn = document.getElementById('btnSaveSales');
        btn.disabled = true;
        btn.textContent = 'Menyimpan...';

        try {
            const body = {
                user_id: parseInt(userId),
                woowa_key: woowaKey || null,
                urutan: urutan || null,
            };

            let response;
            if (id) {
                // Update
                response = await fetch(`${API_BASE}/sales-list/${id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(body)
                });
            } else {
                // Create
                response = await fetch(`${API_BASE}/sales-list`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(body)
                });
            }

            const result = await response.json();

            if (result.success) {
                closeSalesModal();
                showAlert(result.message || 'Sales berhasil disimpan');
                loadSales(currentPage);
            } else {
                showAlert(result.message || 'Gagal menyimpan sales', 'error');
            }
        } catch (error) {
            console.error('Error saving sales:', error);
            showAlert('Terjadi kesalahan saat menyimpan data', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Simpan';
        }
    }

    async function deleteSales(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus sales ini?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/sales-list/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            const result = await response.json();

            if (result.success) {
                showAlert('Sales berhasil dihapus');
                loadSales(currentPage);
            } else {
                showAlert(result.message || 'Gagal menghapus sales', 'error');
            }
        } catch (error) {
            console.error('Error deleting sales:', error);
            showAlert('Terjadi kesalahan saat menghapus data', 'error');
        }
    }

    // Search with debounce
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadSales();
        }, 500);
    });

    // Load data when page loads
    document.addEventListener('DOMContentLoaded', function() {
        loadSales();
        loadUsers();
    });
</script>
@endpush


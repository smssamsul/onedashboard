@extends('layouts.sales')

@section('title', 'Customer')
@section('page_title', 'Customer')

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
        width: 200px;
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

    .btn-danger {
        background: var(--danger);
        color: white;
    }

    .btn-danger:hover {
        background: #dc2626;
    }

    .btn-success {
        background: #059669;
        color: white;
    }

    .btn-success:hover {
        background: #047857;
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
        min-width: 180px;
    }

    .filter-select:focus {
        outline: none;
        border-color: var(--accent);
    }

    .table-actions {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        align-items: stretch;
    }

    .table-action-item {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.375rem;
        padding: 0.25rem 0.625rem;
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text);
        text-decoration: none;
        border-radius: var(--radius-sm);
        transition: all 0.2s ease;
        cursor: pointer;
        background: transparent;
        border: 1px solid var(--border);
        width: 100%;
        text-align: center;
    }

    .table-action-item:hover {
        background: var(--bg);
        color: var(--accent);
    }

    .table-action-item.edit {
        color: var(--accent);
        border-color: var(--accent);
    }

    .table-action-item.edit:hover {
        background: var(--accent-lighter);
        color: var(--accent);
        border-color: var(--accent);
    }

    .table-action-item.delete {
        color: var(--danger);
        border-color: var(--danger);
    }

    .table-action-item.delete:hover {
        background: #fee2e2;
        color: var(--danger);
        border-color: var(--danger);
    }

    /* Freeze column (sticky first column) */
    .card-table {
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 300px);
        min-height: 400px;
    }

    .table-responsive {
        overflow-x: auto;
        overflow-y: auto;
        position: relative;
        width: 100%;
        max-height: calc(100vh - 380px);
        min-height: 300px;
        -webkit-overflow-scrolling: touch;
    }

    /* Custom scrollbar styling */
    .table-responsive::-webkit-scrollbar {
        height: 10px;
        width: 10px;
    }

    .table-responsive::-webkit-scrollbar:vertical {
        width: 10px;
    }

    .table-responsive::-webkit-scrollbar:horizontal {
        height: 10px;
    }

    .table-responsive::-webkit-scrollbar-track {
        background: var(--bg);
        border-radius: 4px;
    }

    .table-responsive::-webkit-scrollbar-thumb {
        background: var(--text-muted);
        border-radius: 4px;
        transition: background 0.2s;
    }

    .table-responsive::-webkit-scrollbar-thumb:hover {
        background: var(--text);
    }

    /* Firefox scrollbar */
    .table-responsive {
        scrollbar-width: thin;
        scrollbar-color: var(--text-muted) var(--bg);
    }

    .table-responsive table {
        border-collapse: separate;
        border-spacing: 0;
        width: 100%;
        min-width: 1200px;
        table-layout: auto;
    }

    .table-responsive th:first-child,
    .table-responsive td:first-child {
        position: sticky;
        left: 0;
        z-index: 10;
        background: var(--surface);
        box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
        min-width: 200px;
        padding-left: 1rem;
        padding-right: 1rem;
    }

    .table-responsive thead th:first-child {
        z-index: 11;
        background: var(--bg);
    }

    .table-responsive tbody tr:hover td:first-child {
        background: var(--bg);
    }

    /* Pagination */
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

    /* Modal Styles */
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
        backdrop-filter: blur(4px);
        padding: 1rem;
    }

    .modal-overlay.active {
        display: flex;
    }

    .modal {
        background: var(--surface);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: var(--shadow-lg);
    }

    .modal-header {
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--text);
    }

    .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--text-muted);
        line-height: 1;
        padding: 0;
        transition: color 0.2s;
    }

    .modal-close:hover {
        color: var(--text);
    }

    .modal-body {
        padding: 1.5rem;
    }

    .modal-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--text);
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
        width: 100%;
        padding: 0.625rem 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-family: inherit;
        transition: all 0.2s;
        background: var(--surface);
        color: var(--text);
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .alert {
        padding: 0.75rem 1rem;
        border-radius: var(--radius-sm);
        margin-bottom: 1rem;
        font-size: 0.875rem;
    }

    .alert-success {
        background: #d1fae5;
        color: #059669;
    }

    .alert-error {
        background: #fee2e2;
        color: #dc2626;
    }

    @media (max-width: 768px) {
        .form-row {
            grid-template-columns: 1fr;
        }
        .search-input input {
            width: 100%;
        }
    }
</style>
@endpush

@section('content')
<div class="page-header">
    <div>
        <h1>Kelola Customer</h1>
        <p>Kelola data customer Anda</p>
    </div>
    <div>
        <button class="btn btn-primary" onclick="openCreateModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Customer
        </button>
    </div>
</div>

<!-- Alert Container -->
<div id="alertContainer"></div>

<!-- Action Bar -->
<div class="action-bar">
    <div class="search-filter-group">
        <div class="search-input">
            <input type="text" id="searchInput" placeholder="Cari nama, email, atau WA..." />
        </div>
        <div class="search-input">
            <input type="text" id="filterMemberID" placeholder="Filter MemberID..." />
        </div>
        <div class="search-input">
            <input type="text" id="filterAlamat" placeholder="Filter Alamat..." />
        </div>
        <select class="filter-select" id="filterKeanggotaan">
            <option value="">Semua Keanggotaan</option>
            <option value="basic">Basic</option>
            <option value="bronze">Bronze</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
            <option value="diamond">Diamond</option>
        </select>
        <select class="filter-select" id="filterTahun">
            <option value="">Semua Tahun</option>
        </select>
        <select class="filter-select" id="perPageSelect" onchange="changePerPage()">
            <option value="10">10 per halaman</option>
            <option value="15" selected>15 per halaman</option>
            <option value="25">25 per halaman</option>
            <option value="50">50 per halaman</option>
            <option value="100">100 per halaman</option>
        </select>
    </div>
    <div class="btn-group">
        <button class="btn btn-secondary" onclick="loadCustomers()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
        </button>
    </div>
</div>

<!-- Customer Table -->
<div class="card-table">
    <div class="card-table-header">
        <h3 style="margin:0; border:none; padding:0;">Daftar Customer</h3>
    </div>
    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>Nama Customer</th>
                    <th>MemberID</th>
                    <th>Keanggotaan</th>
                    <th>Email</th>
                    <th>WhatsApp</th>
                    <th>Alamat</th>
                    <th>Profesi</th>
                    <th>Pendapatan</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody id="customerTableBody">
                <tr>
                    <td colspan="9" class="loading">Memuat data...</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<!-- Pagination -->
<div class="pagination" id="pagination"></div>

<!-- Create/Edit Customer Modal -->
<div class="modal-overlay" id="customerModal">
    <div class="modal">
        <div class="modal-header">
            <h3 id="modalTitle">Tambah Customer</h3>
            <button class="modal-close" onclick="closeCustomerModal()">&times;</button>
        </div>
        <div class="modal-body">
            <input type="hidden" id="customerId" />
            <div class="form-group">
                <label>Nama *</label>
                <input type="text" id="customerNama" required />
            </div>
            <div class="form-group">
                <label>Nama Panggilan</label>
                <input type="text" id="customerNamaPanggilan" />
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Email *</label>
                    <input type="email" id="customerEmail" required />
                </div>
                <div class="form-group">
                    <label>WhatsApp</label>
                    <input type="text" id="customerWa" placeholder="08xxxxxxxxxx" />
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Profesi</label>
                    <input type="text" id="customerProfesi" />
                </div>
                <div class="form-group">
                    <label>Pendapatan/Bulan</label>
                    <input type="text" id="customerPendapatan" placeholder="Contoh: 5 Juta" />
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Industri Pekerjaan</label>
                    <input type="text" id="customerIndustri" />
                </div>
                <div class="form-group">
                    <label>Jenis Kelamin</label>
                    <select id="customerJenisKelamin">
                        <option value="">Pilih</option>
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Tanggal Lahir</label>
                <input type="date" id="customerTanggalLahir" />
            </div>
            <div class="form-group">
                <label>Instagram</label>
                <input type="text" id="customerInstagram" placeholder="@username" />
            </div>
            <div class="form-group">
                <label>Alamat</label>
                <textarea id="customerAlamat" rows="3"></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Provinsi</label>
                    <input type="text" id="customerProvinsi" placeholder="Contoh: Jawa Barat" />
                </div>
                <div class="form-group">
                    <label>Kabupaten/Kota</label>
                    <input type="text" id="customerKabupaten" placeholder="Contoh: Bandung" />
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Kecamatan</label>
                    <input type="text" id="customerKecamatan" placeholder="Contoh: Cimahi Utara" />
                </div>
                <div class="form-group">
                    <label>Kode Pos</label>
                    <input type="text" id="customerKodePos" placeholder="Contoh: 40512" maxlength="5" />
                </div>
            </div>
            <div class="form-group">
                <label>Keanggotaan</label>
                <select id="customerKeanggotaan">
                    <option value="basic">Basic</option>
                    <option value="bronze">Bronze</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                    <option value="diamond">Diamond</option>
                </select>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeCustomerModal()">Batal</button>
            <button class="btn btn-primary" onclick="saveCustomer()" id="btnSaveCustomer">Simpan</button>
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
        loadCustomers();
    }

    function renderCustomers(customers, pagination) {
        const tbody = document.getElementById('customerTableBody');
        if (customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Tidak ada data customer</td></tr>';
            renderPagination(null);
            return;
        }
        
        // Fungsi untuk format keanggotaan dengan badge
        const formatKeanggotaan = (keanggotaan) => {
            if (!keanggotaan) return '<span style="color: var(--text-muted);">-</span>';
            const colors = {
                'basic': '#6b7280',
                'bronze': '#cd7f32',
                'silver': '#c0c0c0',
                'gold': '#ffd700',
                'platinum': '#e5e4e2',
                'diamond': '#b9f2ff'
            };
            const color = colors[keanggotaan.toLowerCase()] || '#6b7280';
            return `<span style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; background: ${color}; color: ${keanggotaan.toLowerCase() === 'gold' || keanggotaan.toLowerCase() === 'silver' ? '#000' : '#fff'}; font-weight: 500; font-size: 0.75rem; text-transform: capitalize;">${keanggotaan}</span>`;
        };
        
        tbody.innerHTML = customers.map(customer => `
            <tr>
                <td>
                    <strong>${customer.nama || '-'}</strong>
                    ${customer.nama_panggilan ? `<br><small style="color: var(--text-muted);">${customer.nama_panggilan}</small>` : ''}
                </td>
                <td><code style="background: var(--surface-secondary); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;">${customer.memberID || '-'}</code></td>
                <td>${formatKeanggotaan(customer.keanggotaan)}</td>
                <td>${customer.email || '-'}</td>
                <td>${customer.wa || '-'}</td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${customer.alamat || ''}">${customer.alamat || '-'}</td>
                <td>${customer.profesi || '-'}</td>
                <td>${customer.pendapatan_bln || '-'}</td>
                <td class="table-actions">
                    <span class="table-action-item edit" onclick="editCustomer(${customer.id})">Edit</span>
                    <span class="table-action-item delete" onclick="deleteCustomer(${customer.id})">Hapus</span>
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
            <button onclick="loadCustomers(${pagination.current_page - 1})" ${pagination.current_page === 1 ? 'disabled' : ''}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
                Prev
            </button>
            <span>Halaman ${pagination.current_page} dari ${pagination.last_page} (${pagination.total} data)</span>
            <button onclick="loadCustomers(${pagination.current_page + 1})" ${pagination.current_page === pagination.last_page ? 'disabled' : ''}>
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </button>
        `;
    }

    async function loadCustomers(page = 1) {
        currentPage = page;
        const search = document.getElementById('searchInput').value;
        const memberID = document.getElementById('filterMemberID').value;
        const keanggotaan = document.getElementById('filterKeanggotaan').value;
        const alamat = document.getElementById('filterAlamat').value;
        const tahun = document.getElementById('filterTahun').value;
        perPage = parseInt(document.getElementById('perPageSelect').value);
        
        let url = `${API_BASE}/customer?page=${page}&per_page=${perPage}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (memberID) url += `&memberID=${encodeURIComponent(memberID)}`;
        if (keanggotaan) url += `&keanggotaan=${encodeURIComponent(keanggotaan)}`;
        if (alamat) url += `&alamat=${encodeURIComponent(alamat)}`;
        if (tahun) url += `&tahun=${encodeURIComponent(tahun)}`;

        const tbody = document.getElementById('customerTableBody');
        tbody.innerHTML = '<tr><td colspan="9" class="loading">Memuat data...</td></tr>';

        try {
            const response = await fetch(url, { headers: getHeaders() });
            const result = await response.json();

            if (result.success && result.data && result.data.length > 0) {
                renderCustomers(result.data, result.pagination);
            } else {
                tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Tidak ada data customer</td></tr>';
                renderPagination(null);
            }
        } catch (error) {
            console.error('Error loading customers:', error);
            tbody.innerHTML = '<tr><td colspan="9" style="color: var(--danger);">Gagal memuat data</td></tr>';
        }
    }

    // Customer Modal Functions
    function openCreateModal() {
        document.getElementById('customerModal').classList.add('active');
        document.getElementById('modalTitle').textContent = 'Tambah Customer';
        document.getElementById('customerId').value = '';
        document.getElementById('customerNama').value = '';
        document.getElementById('customerNamaPanggilan').value = '';
        document.getElementById('customerEmail').value = '';
        document.getElementById('customerWa').value = '';
        document.getElementById('customerProfesi').value = '';
        document.getElementById('customerPendapatan').value = '';
        document.getElementById('customerIndustri').value = '';
        document.getElementById('customerJenisKelamin').value = '';
        document.getElementById('customerTanggalLahir').value = '';
        document.getElementById('customerInstagram').value = '';
        document.getElementById('customerAlamat').value = '';
    }

    function closeCustomerModal() {
        document.getElementById('customerModal').classList.remove('active');
    }

    async function editCustomer(id) {
        try {
            const response = await fetch(`${API_BASE}/customer/${id}`, { headers: getHeaders() });
            const result = await response.json();

            if (result.success && result.data && result.data.length > 0) {
                const customer = result.data[0];
                document.getElementById('customerModal').classList.add('active');
                document.getElementById('modalTitle').textContent = 'Edit Customer';
                document.getElementById('customerId').value = customer.id;
                document.getElementById('customerNama').value = customer.nama || '';
                document.getElementById('customerNamaPanggilan').value = customer.nama_panggilan || '';
                document.getElementById('customerEmail').value = customer.email || '';
                document.getElementById('customerWa').value = customer.wa || '';
                document.getElementById('customerProfesi').value = customer.profesi || '';
                document.getElementById('customerPendapatan').value = customer.pendapatan_bln || '';
                document.getElementById('customerIndustri').value = customer.industri_pekerjaan || '';
                document.getElementById('customerJenisKelamin').value = customer.jenis_kelamin || '';
                document.getElementById('customerTanggalLahir').value = customer.tanggal_lahir ? customer.tanggal_lahir.split(' ')[0] : '';
                document.getElementById('customerInstagram').value = customer.instagram || '';
                document.getElementById('customerAlamat').value = customer.alamat || '';
                document.getElementById('customerProvinsi').value = customer.provinsi || '';
                document.getElementById('customerKabupaten').value = customer.kabupaten || '';
                document.getElementById('customerKecamatan').value = customer.kecamatan || '';
                document.getElementById('customerKodePos').value = customer.kode_pos || '';
                document.getElementById('customerKeanggotaan').value = customer.keanggotaan || 'basic';
            } else {
                showAlert('Customer tidak ditemukan', 'error');
            }
        } catch (error) {
            console.error('Error loading customer:', error);
            showAlert('Gagal memuat data customer', 'error');
        }
    }

    async function saveCustomer() {
        const id = document.getElementById('customerId').value;
        const nama = document.getElementById('customerNama').value.trim();
        const email = document.getElementById('customerEmail').value.trim();

        if (!nama) {
            showAlert('Nama wajib diisi', 'error');
            return;
        }

        if (!email) {
            showAlert('Email wajib diisi', 'error');
            return;
        }

        const btn = document.getElementById('btnSaveCustomer');
        btn.disabled = true;
        btn.textContent = 'Menyimpan...';

        try {
            const body = {
                nama: nama,
                nama_panggilan: document.getElementById('customerNamaPanggilan').value.trim() || null,
                email: email,
                wa: document.getElementById('customerWa').value.trim() || null,
                profesi: document.getElementById('customerProfesi').value.trim() || null,
                pendapatan_bln: document.getElementById('customerPendapatan').value.trim() || null,
                industri_pekerjaan: document.getElementById('customerIndustri').value.trim() || null,
                jenis_kelamin: document.getElementById('customerJenisKelamin').value || null,
                tanggal_lahir: document.getElementById('customerTanggalLahir').value || null,
                instagram: document.getElementById('customerInstagram').value.trim() || null,
                alamat: document.getElementById('customerAlamat').value.trim() || null,
                provinsi: document.getElementById('customerProvinsi').value.trim() || null,
                kabupaten: document.getElementById('customerKabupaten').value.trim() || null,
                kecamatan: document.getElementById('customerKecamatan').value.trim() || null,
                kode_pos: document.getElementById('customerKodePos').value.trim() || null,
                keanggotaan: document.getElementById('customerKeanggotaan').value || 'basic',
            };

            let response;
            if (id) {
                // Update
                response = await fetch(`${API_BASE}/customer/${id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(body)
                });
            } else {
                // Create
                response = await fetch(`${API_BASE}/customer`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(body)
                });
            }

            const result = await response.json();

            if (result.success) {
                closeCustomerModal();
                showAlert(id ? 'Customer berhasil diupdate' : 'Customer berhasil ditambahkan', 'success');
                loadCustomers(currentPage);
            } else {
                const errorMsg = result.message || (result.errors ? Object.values(result.errors).flat().join(', ') : 'Gagal menyimpan customer');
                showAlert(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Error saving customer:', error);
            showAlert('Terjadi kesalahan saat menyimpan customer', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Simpan';
        }
    }

    async function deleteCustomer(id) {
        if (!confirm('Yakin ingin menghapus customer ini?')) return;

        try {
            const response = await fetch(`${API_BASE}/customer/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            const result = await response.json();

            if (result.success) {
                showAlert('Customer berhasil dihapus', 'success');
                loadCustomers(currentPage);
            } else {
                showAlert(result.message || 'Gagal menghapus customer', 'error');
            }
        } catch (error) {
            console.error('Error deleting customer:', error);
            showAlert('Terjadi kesalahan saat menghapus customer', 'error');
        }
    }

    // Enter key untuk search
    document.addEventListener('DOMContentLoaded', function() {
        loadCustomers();
        
        // Event listener untuk search input
        document.getElementById('searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loadCustomers(1);
            }
        });

        // Event listener untuk filter MemberID
        document.getElementById('filterMemberID').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loadCustomers(1);
            }
        });

        // Event listener untuk filter Alamat
        document.getElementById('filterAlamat').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loadCustomers(1);
            }
        });

        // Event listener untuk filter Keanggotaan
        document.getElementById('filterKeanggotaan').addEventListener('change', function() {
            loadCustomers(1);
        });

        // Event listener untuk filter Tahun
        document.getElementById('filterTahun').addEventListener('change', function() {
            loadCustomers(1);
        });

        // Load tahun yang tersedia
        loadAvailableYears();
    });

    // Fungsi untuk memuat tahun yang tersedia dari data customer
    async function loadAvailableYears() {
        try {
            const response = await fetch(`${API_BASE}/customer?all=true`, { headers: getHeaders() });
            const result = await response.json();
            
            if (result.success && result.data) {
                // Ambil tahun unik dari create_at
                const years = new Set();
                result.data.forEach(customer => {
                    if (customer.create_at) {
                        const year = new Date(customer.create_at).getFullYear();
                        if (year) years.add(year);
                    }
                });
                
                // Sort tahun dari terbaru ke terlama
                const sortedYears = Array.from(years).sort((a, b) => b - a);
                
                // Populate dropdown
                const tahunSelect = document.getElementById('filterTahun');
                const currentValue = tahunSelect.value;
                
                // Clear existing options except "Semua Tahun"
                tahunSelect.innerHTML = '<option value="">Semua Tahun</option>';
                
                // Add tahun options
                sortedYears.forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    tahunSelect.appendChild(option);
                });
                
                // Restore selected value if exists
                if (currentValue) {
                    tahunSelect.value = currentValue;
                }
            }
        } catch (error) {
            console.error('Error loading available years:', error);
        }
    }
</script>
@endpush

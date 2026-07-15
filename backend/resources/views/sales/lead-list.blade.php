@extends('layouts.sales')

@section('title', 'Data Lead')
@section('page_title', 'Data Lead')

@push('styles')
<style>
    /* ===== STATS GRID ===== */
    .lead-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .lead-stat-card {
        background: var(--surface);
        border-radius: var(--radius);
        padding: 1.25rem;
        border: 1px solid var(--border);
        display: flex;
        align-items: center;
        gap: 1rem;
        transition: all 0.2s ease;
    }

    .lead-stat-card:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
    }

    .lead-stat-icon {
        width: 48px;
        height: 48px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .lead-stat-icon svg { width: 22px; height: 22px; }

    .icon-primary  { background: #e8eef5; color: var(--primary); }
    .icon-danger   { background: #fee2e2; color: var(--danger); }
    .icon-warning  { background: #fef3c7; color: var(--warning); }
    .icon-info     { background: #dbeafe; color: var(--info); }
    .icon-success  { background: #d1fae5; color: var(--success); }

    .lead-stat-info { min-width: 0; }

    .lead-stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text);
        line-height: 1.2;
    }

    .lead-stat-label {
        font-size: 0.775rem;
        color: var(--text-secondary);
        margin-top: 0.2rem;
        font-weight: 500;
    }

    /* ===== PAGE HEADER ===== */
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

    .page-header h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .page-header p  { margin: 0.25rem 0 0; opacity: 0.8; font-size: 0.875rem; }

    /* ===== ACTION BAR ===== */
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

    .search-input { position: relative; }

    .search-input input {
        padding: 0.625rem 1rem 0.625rem 2.5rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        width: 220px;
        background: var(--surface);
        color: var(--text);
        font-family: inherit;
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

    .filter-select {
        padding: 0.625rem 2rem 0.625rem 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        background: var(--surface);
        color: var(--text);
        font-family: inherit;
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0.75rem center;
        background-size: 16px;
        min-width: 160px;
        transition: all 0.2s;
    }

    .filter-select:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
    }

    /* ===== SCORE BADGE ===== */
    .score-badge {
        display: inline-block;
        padding: 0.25rem 0.65rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 600;
        text-transform: capitalize;
        letter-spacing: 0.02em;
    }

    .score-badge.hot  { background: #fee2e2; color: #991b1b; }
    .score-badge.warm { background: #fef3c7; color: #92400e; }
    .score-badge.cold { background: #dbeafe; color: #1e40af; }

    /* ===== TABLE OVERRIDES ===== */
    .card-table {
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 380px);
        min-height: 350px;
    }

    .table-responsive {
        overflow-x: auto;
        overflow-y: auto;
        position: relative;
        width: 100%;
        max-height: calc(100vh - 450px);
        min-height: 300px;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: var(--text-muted) var(--bg);
    }

    .table-responsive::-webkit-scrollbar { height: 8px; width: 8px; }
    .table-responsive::-webkit-scrollbar-track { background: var(--bg); }
    .table-responsive::-webkit-scrollbar-thumb { background: var(--text-muted); border-radius: 4px; }

    .table-responsive table {
        border-collapse: separate;
        border-spacing: 0;
        width: 100%;
        min-width: 1050px;
    }

    /* Sticky first column */
    .table-responsive th:first-child,
    .table-responsive td:first-child {
        position: sticky;
        left: 0;
        z-index: 10;
        background: var(--surface);
        box-shadow: 2px 0 4px rgba(0,0,0,0.06);
        min-width: 190px;
    }

    .table-responsive thead th:first-child {
        z-index: 11;
        background: var(--primary);
    }

    .table-responsive tbody tr:hover td:first-child {
        background: var(--bg);
    }

    .loading    { text-align: center; padding: 2.5rem; color: var(--text-muted); font-size: 0.875rem; }
    .empty-state { text-align: center; padding: 3rem 2rem; color: var(--text-muted); font-size: 0.875rem; }

    /* ===== ACTION BUTTON IN TABLE ===== */
    .table-action-item {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.3rem;
        padding: 0.3rem 0.7rem;
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: var(--radius-sm);
        transition: all 0.2s;
        cursor: pointer;
        border: 1px solid var(--success);
        background: transparent;
        color: var(--success);
        width: 100%;
        font-family: inherit;
    }

    .table-action-item:hover {
        background: #d1fae5;
        color: #065f46;
        border-color: #065f46;
    }

    /* ===== PAGINATION ===== */
    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.75rem;
        margin-top: 1.25rem;
    }

    .pagination button {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border);
        background: var(--surface);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text);
        font-family: inherit;
        transition: all 0.2s;
    }

    .pagination button:hover:not(:disabled) {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
    }

    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }

    .pagination span {
        font-size: 0.875rem;
        color: var(--text-secondary);
    }

    /* ===== ALERT ===== */
    .alert {
        padding: 0.75rem 1rem;
        border-radius: var(--radius-sm);
        margin-bottom: 1rem;
        font-size: 0.875rem;
    }

    .alert-success { background: #d1fae5; color: #065f46; }
    .alert-error   { background: #fee2e2; color: #991b1b; }

    @media (max-width: 768px) {
        .lead-stats-grid { grid-template-columns: 1fr 1fr; }
        .search-input input { width: 100%; }
    }
</style>
@endpush

@section('content')

{{-- Page Header --}}
<div class="page-header">
    <div>
        <h1>Data Lead</h1>
        <p>Kelola prospek yang belum melakukan pembayaran</p>
    </div>
    <button class="btn btn-secondary" style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25); color: white;" onclick="loadLeads()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        Refresh
    </button>
</div>

{{-- Alert --}}
<div id="alertContainer"></div>

{{-- Stats Cards --}}
<div class="lead-stats-grid">
    <div class="lead-stat-card">
        <div class="lead-stat-icon icon-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
        </div>
        <div class="lead-stat-info">
            <div class="lead-stat-value" id="statTotal">—</div>
            <div class="lead-stat-label">Total Lead</div>
        </div>
    </div>
    <div class="lead-stat-card">
        <div class="lead-stat-icon icon-danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
        </div>
        <div class="lead-stat-info">
            <div class="lead-stat-value" id="statHot">—</div>
            <div class="lead-stat-label">Hot Lead</div>
        </div>
    </div>
    <div class="lead-stat-card">
        <div class="lead-stat-icon icon-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
            </svg>
        </div>
        <div class="lead-stat-info">
            <div class="lead-stat-value" id="statWarm">—</div>
            <div class="lead-stat-label">Warm Lead</div>
        </div>
    </div>
    <div class="lead-stat-card">
        <div class="lead-stat-icon icon-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
        </div>
        <div class="lead-stat-info">
            <div class="lead-stat-value" id="statCold">—</div>
            <div class="lead-stat-label">Cold Lead</div>
        </div>
    </div>
    <div class="lead-stat-card">
        <div class="lead-stat-icon icon-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
        </div>
        <div class="lead-stat-info">
            <div class="lead-stat-value" id="statVerified">—</div>
            <div class="lead-stat-label">Terverifikasi</div>
        </div>
    </div>
</div>

{{-- Action Bar --}}
<div class="action-bar">
    <div class="search-filter-group">
        <div class="search-input">
            <input type="text" id="searchInput" placeholder="Cari nama, email, atau WA..." />
        </div>
        <select class="filter-select" id="filterScoreLabel" onchange="loadLeads()">
            <option value="">Semua Score</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
        </select>
        <select class="filter-select" id="filterTahun" onchange="loadLeads()">
            <option value="">Semua Tahun</option>
        </select>
        <select class="filter-select" id="perPageSelect" onchange="changePerPage()">
            <option value="15" selected>15 per halaman</option>
            <option value="25">25 per halaman</option>
            <option value="50">50 per halaman</option>
            <option value="100">100 per halaman</option>
        </select>
    </div>
</div>

{{-- Table --}}
<div class="card-table">
    <div class="card-table-header">
        <h3 style="margin:0; border:none; padding:0; font-size:1rem; font-weight:600; color:var(--text);">Daftar Lead</h3>
    </div>
    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>Nama</th>
                    <th>WhatsApp</th>
                    <th>Email</th>
                    <th>Sales</th>
                    <th>Profesi</th>
                    <th>Score</th>
                    <th>Tgl Daftar</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody id="leadTableBody">
                <tr><td colspan="8" class="loading">Memuat data lead...</td></tr>
            </tbody>
        </table>
    </div>
</div>

{{-- Pagination --}}
<div class="pagination" id="pagination"></div>

@endsection

@push('scripts')
<script>
    const API_BASE   = '/api/sales';
    const authToken  = localStorage.getItem('auth_token');
    let currentPage  = 1;
    let perPage      = 15;
    let searchTimer  = null;

    function getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };
    }

    function showAlert(msg, type = 'success') {
        const c = document.getElementById('alertContainer');
        c.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
        setTimeout(() => c.innerHTML = '', 5000);
    }

    function changePerPage() {
        perPage = parseInt(document.getElementById('perPageSelect').value);
        currentPage = 1;
        loadLeads();
    }

    /* ---- Score Badge ---- */
    function scoreBadge(label) {
        const l = (label || 'cold').toLowerCase();
        const map = { hot: 'Hot', warm: 'Warm', cold: 'Cold' };
        const cls = map[l] ? l : 'cold';
        return `<span class="score-badge ${cls}">${map[cls] || 'Cold'}</span>`;
    }

    /* ---- Format Date ---- */
    function fmtDate(val) {
        if (!val) return '-';
        return new Date(val).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    /* ---- Render Table ---- */
    function renderLeads(leads, pagination) {
        const tbody = document.getElementById('leadTableBody');

        if (!leads || leads.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Tidak ada data lead</td></tr>';
            renderPagination(null);
            return;
        }

        tbody.innerHTML = leads.map(lead => `
            <tr>
                <td>
                    <strong>${lead.nama || '-'}</strong>
                    ${lead.memberID ? `<br><small style="color:var(--text-muted); font-size:0.72rem;">${lead.memberID}</small>` : ''}
                </td>
                <td>${lead.wa || '-'}</td>
                <td style="max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${lead.email || ''}">${lead.email || '-'}</td>
                <td>${lead.sales_nama || '-'}</td>
                <td>${lead.profesi || '-'}</td>
                <td>${scoreBadge(lead.score_label)}</td>
                <td style="white-space:nowrap; color:var(--text-secondary);">${fmtDate(lead.create_at)}</td>
                <td>
                    <button class="table-action-item" onclick="promoteToCustomer(${lead.id}, '${(lead.nama || '').replace(/'/g, "\\'")}')">
                        Jadikan Customer
                    </button>
                </td>
            </tr>
        `).join('');

        renderPagination(pagination);
    }

    /* ---- Pagination ---- */
    function renderPagination(pagination) {
        const c = document.getElementById('pagination');
        if (!pagination) { c.innerHTML = ''; return; }
        c.innerHTML = `
            <button onclick="loadLeads(${pagination.current_page - 1})" ${pagination.current_page === 1 ? 'disabled' : ''}>
                &larr; Prev
            </button>
            <span>Halaman ${pagination.current_page} dari ${pagination.last_page} &nbsp;&mdash;&nbsp; ${pagination.total.toLocaleString('id-ID')} lead</span>
            <button onclick="loadLeads(${pagination.current_page + 1})" ${pagination.current_page === pagination.last_page ? 'disabled' : ''}>
                Next &rarr;
            </button>
        `;
    }

    /* ---- Load Leads ---- */
    async function loadLeads(page = 1) {
        currentPage  = page;
        const search = document.getElementById('searchInput').value;
        const score  = document.getElementById('filterScoreLabel').value;
        const tahun  = document.getElementById('filterTahun').value;
        perPage      = parseInt(document.getElementById('perPageSelect').value);

        let url = `${API_BASE}/customer?customer_type=lead&page=${page}&per_page=${perPage}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (score)  url += `&score_label=${encodeURIComponent(score)}`;
        if (tahun)  url += `&tahun=${encodeURIComponent(tahun)}`;

        document.getElementById('leadTableBody').innerHTML =
            '<tr><td colspan="8" class="loading">Memuat data...</td></tr>';

        try {
            const res    = await fetch(url, { headers: getHeaders() });
            const result = await res.json();

            if (result.success) {
                renderLeads(result.data, result.pagination);
                // Update stat total dari result ini
                if (result.pagination) {
                    document.getElementById('statTotal').textContent =
                        result.pagination.total.toLocaleString('id-ID');
                }
                if (result.summary) {
                    document.getElementById('statVerified').textContent =
                        (result.summary.verified ?? 0).toLocaleString('id-ID');
                }
            } else {
                document.getElementById('leadTableBody').innerHTML =
                    '<tr><td colspan="8" class="empty-state">Tidak ada data lead</td></tr>';
            }
        } catch (err) {
            console.error(err);
            document.getElementById('leadTableBody').innerHTML =
                '<tr><td colspan="8" style="color:var(--danger); text-align:center; padding:2rem;">Gagal memuat data</td></tr>';
        }
    }

    /* ---- Load Stats Per Score Label ---- */
    async function loadStats() {
        try {
            const labels = ['hot', 'warm', 'cold'];
            await Promise.all(labels.map(async lbl => {
                const res  = await fetch(`${API_BASE}/customer?customer_type=lead&score_label=${lbl}&per_page=1`, { headers: getHeaders() });
                const json = await res.json();
                const el   = document.getElementById('stat' + lbl.charAt(0).toUpperCase() + lbl.slice(1));
                if (el) el.textContent = (json.pagination?.total ?? 0).toLocaleString('id-ID');
            }));

            // Total & verified
            const resAll  = await fetch(`${API_BASE}/customer?customer_type=lead&per_page=1`, { headers: getHeaders() });
            const jsonAll = await resAll.json();
            document.getElementById('statTotal').textContent    = (jsonAll.pagination?.total ?? 0).toLocaleString('id-ID');
            document.getElementById('statVerified').textContent = (jsonAll.summary?.verified ?? 0).toLocaleString('id-ID');
        } catch (e) {
            console.error('Gagal load stats:', e);
        }
    }

    /* ---- Promote Lead to Customer ---- */
    async function promoteToCustomer(id, nama) {
        if (!confirm(`Yakin menjadikan "${nama}" sebagai Customer?\n\nData akan dipindahkan ke menu Customer.`)) return;

        try {
            const res    = await fetch(`${API_BASE}/customer/${id}/promote`, {
                method: 'POST',
                headers: getHeaders()
            });
            const result = await res.json();

            if (result.success) {
                showAlert(`${nama} berhasil dipromote ke Customer.`, 'success');
                loadLeads(currentPage);
                loadStats();
            } else {
                showAlert(result.message || 'Gagal promote lead.', 'error');
            }
        } catch (err) {
            showAlert('Terjadi kesalahan. Coba lagi.', 'error');
        }
    }

    /* ---- Populate Tahun Filter ---- */
    function loadTahunOptions() {
        const now    = new Date().getFullYear();
        const select = document.getElementById('filterTahun');
        for (let y = now; y >= 2022; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            select.appendChild(opt);
        }
    }

    /* ---- Search debounce ---- */
    document.getElementById('searchInput').addEventListener('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { currentPage = 1; loadLeads(); }, 420);
    });

    /* ---- Init ---- */
    document.addEventListener('DOMContentLoaded', function () {
        loadTahunOptions();
        loadLeads();
        loadStats();
    });
</script>
@endpush

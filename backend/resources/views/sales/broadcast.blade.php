@php
    // Check user level - for sales biasa (level 2), use sales layout
    // For head sales (level 1), use admin layout
    // Since we can't check level in PHP without session, we'll use JavaScript to redirect
@endphp
@extends('layouts.admin')

@section('title', 'Broadcast')
@section('page_title', 'Broadcast')

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

    .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
    }

    .action-btn svg {
        width: 14px;
        height: 14px;
    }

    .action-btn.send {
        background: #ccfbf1;
        color: #0d9488;
    }

    .action-btn.send:hover {
        background: #99f6e4;
    }

    .action-btn.view {
        background: #dbeafe;
        color: #2563eb;
    }

    .action-btn.view:hover {
        background: #bfdbfe;
    }

    .action-btn.edit {
        background: #fef3c7;
        color: #d97706;
    }

    .action-btn.edit:hover {
        background: #fde68a;
    }

    .action-btn.delete {
        background: #fee2e2;
        color: #dc2626;
    }

    .action-btn.delete:hover {
        background: #fecaca;
    }

    .action-group {
        display: flex;
        gap: 0.375rem;
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
        max-width: 720px;
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

    .form-section {
        background: var(--bg);
        border-radius: var(--radius);
        padding: 1.25rem;
        margin-bottom: 1.25rem;
    }

    .form-section-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text);
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .form-section-title svg {
        width: 18px;
        height: 18px;
        color: var(--accent);
    }

    .form-group {
        margin-bottom: 1rem;
    }

    .form-group:last-child {
        margin-bottom: 0;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--text);
    }

    .form-group label .required {
        color: var(--danger);
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
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
    }

    .form-group textarea {
        min-height: 100px;
        resize: vertical;
    }

    .form-group select[multiple] {
        min-height: 120px;
    }

    .form-hint {
        font-size: 0.75rem;
        color: var(--text-muted);
        margin-top: 0.25rem;
    }

    .radio-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .radio-option {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all 0.2s;
    }

    .radio-option:hover {
        border-color: var(--accent);
    }

    .radio-option input[type="radio"] {
        width: auto;
        margin-top: 0.125rem;
        accent-color: var(--accent);
    }

    .radio-option-content {
        flex: 1;
    }

    .radio-option-title {
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--text);
    }

    .radio-option-desc {
        font-size: 0.75rem;
        color: var(--text-muted);
        margin-top: 0.125rem;
    }

    /* Penerima Table */
    .penerima-table {
        width: 100%;
        border-collapse: collapse;
    }

    .penerima-table th,
    .penerima-table td {
        padding: 0.75rem 1rem;
        text-align: left;
        font-size: 0.875rem;
    }

    .penerima-table th {
        background: var(--primary);
        color: white;
        font-weight: 600;
    }

    .penerima-table td {
        border-bottom: 1px solid var(--border);
    }

    .penerima-table tbody tr:hover {
        background: var(--bg);
    }
</style>
@endpush

@section('content')
    <!-- Page Header -->
    <div class="page-header">
        <div>
            <h1>Manajemen Broadcast</h1>
            <p>Kirim pesan broadcast ke customer</p>
        </div>
        <button class="btn btn-primary" onclick="openCreateModal()" style="background: white; color: var(--primary);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Buat Broadcast
        </button>
    </div>

    <!-- Broadcast Table -->
    <div class="card-table">
        <div class="card-table-header">
            <h3 style="margin:0; padding:0; border:none;">Daftar Broadcast</h3>
        </div>
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Nama</th>
                        <th>Pesan</th>
                        <th>Tanggal Kirim</th>
                        <th>Total Target</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody id="broadcastTableBody">
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">Memuat data...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Modal Create/Edit -->
    <div class="modal-overlay" id="broadcastModal">
        <div class="modal">
            <div class="modal-header">
                <h3 id="modalTitle">Buat Broadcast Baru</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <form id="broadcastForm" onsubmit="saveBroadcast(event)">
                <input type="hidden" id="broadcastId" name="id">
                <div class="modal-body">
                    <!-- Informasi Broadcast -->
                    <div class="form-section">
                        <div class="form-section-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"/>
                            </svg>
                            Informasi Broadcast
                        </div>
                        <div class="form-group">
                            <label>Nama Broadcast <span class="required">*</span></label>
                            <input type="text" id="nama" name="nama" required placeholder="Contoh: Promo Produk A - Januari 2024">
                            <div class="form-hint">Berikan nama yang mudah diingat untuk broadcast ini</div>
                        </div>
                        <div class="form-group">
                            <label>Pesan <span class="required">*</span></label>
                            <textarea id="pesan" name="pesan" required placeholder="Masukkan pesan yang akan dikirim..."></textarea>
                            <div class="form-hint">Gunakan @{{customer_name}}, @{{product_name}}, @{{order_total}} untuk variabel</div>
                        </div>
                    </div>

                    <!-- Waktu Pengiriman -->
                    <div class="form-section">
                        <div class="form-section-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 6v6l4 2"/>
                            </svg>
                            Waktu Pengiriman
                        </div>
                        <div class="form-group">
                            <div class="radio-group">
                                <label class="radio-option">
                                    <input type="radio" name="waktu_kirim" value="langsung" id="waktu_langsung" checked onchange="toggleTanggalKirim()">
                                    <div class="radio-option-content">
                                        <div class="radio-option-title">Langsung Kirim Sekarang</div>
                                        <div class="radio-option-desc">Broadcast akan langsung dikirim ke queue setelah disimpan</div>
                                    </div>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="waktu_kirim" value="jadwalkan" id="waktu_jadwalkan" onchange="toggleTanggalKirim()">
                                    <div class="radio-option-content">
                                        <div class="radio-option-title">Jadwalkan Pengiriman</div>
                                        <div class="radio-option-desc">Pilih tanggal dan waktu untuk mengirim broadcast nanti</div>
                                    </div>
                                </label>
                            </div>
                            <div id="tanggal_kirim_container" style="display: none; margin-top: 1rem;">
                                <label>Tanggal & Waktu Kirim</label>
                                <input type="datetime-local" id="tanggal_kirim" name="tanggal_kirim">
                            </div>
                        </div>
                    </div>

                    <!-- Target Filter -->
                    <div class="form-section">
                        <div class="form-section-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                            </svg>
                            Target Filter
                        </div>
                        <div class="form-group">
                            <label>Produk</label>
                            <select id="target_produk" name="target_produk" multiple>
                                <option value="">Memuat produk...</option>
                            </select>
                            <div class="form-hint">Tahan Ctrl untuk memilih multiple. Kosongkan untuk semua produk.</div>
                        </div>
                        <div class="form-group">
                            <label>Status Pembayaran</label>
                            <select id="target_status_pembayaran">
                                <option value="">Semua</option>
                                <option value="unpaid">Unpaid</option>
                                <option value="paid">Paid</option>
                                <option value="dp">DP</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Status Order</label>
                            <select id="target_status_order">
                                <option value="">Semua</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="complete">Complete</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
                    <button type="submit" class="btn btn-primary" id="submitBtn">Simpan Broadcast</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal Detail Penerima -->
    <div class="modal-overlay" id="penerimaModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Detail Penerima Broadcast</h3>
                <button class="modal-close" onclick="closePenerimaModal()">&times;</button>
            </div>
            <div class="modal-body" id="penerimaContent">
                <p>Memuat data...</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closePenerimaModal()">Tutup</button>
            </div>
        </div>
    </div>
@endsection

@push('scripts')
<script>
    const API_BASE = '/api/sales/broadcast';
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    
    if (!token) {
        window.location.href = '/login';
    }

    let produkList = [];

    document.addEventListener('DOMContentLoaded', function() {
        if (token) {
            loadBroadcasts();
            loadProduk();
        }
    });

    async function loadProduk() {
        try {
            const response = await fetch('/api/sales/produk', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                produkList = result.data;
                populateProdukSelect();
            }
        } catch (error) {
            console.error('Error loading produk:', error);
        }
    }

    function populateProdukSelect() {
        const select = document.getElementById('target_produk');
        select.innerHTML = '';
        
        produkList.forEach(produk => {
            const option = document.createElement('option');
            option.value = produk.id;
            option.textContent = produk.nama;
            select.appendChild(option);
        });
    }

    async function loadBroadcasts() {
        try {
            const response = await fetch(API_BASE, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            const result = await response.json();
            
            if (result.success) {
                renderBroadcasts(result.data);
            }
        } catch (error) {
            console.error('Error loading broadcasts:', error);
            document.getElementById('broadcastTableBody').innerHTML = 
                '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--danger);">Error memuat data</td></tr>';
        }
    }

    function renderBroadcasts(broadcasts) {
        const tbody = document.getElementById('broadcastTableBody');
        
        if (!broadcasts || broadcasts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">Belum ada broadcast</td></tr>';
            return;
        }

        tbody.innerHTML = broadcasts.map(broadcast => {
            const statusClass = broadcast.status === '1' ? 'status-success' : 'status-warning';
            const statusText = broadcast.status === '1' ? 'Aktif' : 'Nonaktif';
            const pesanPreview = broadcast.pesan.length > 40 ? broadcast.pesan.substring(0, 40) + '...' : broadcast.pesan;
            
            return `
                <tr>
                    <td><strong>${escapeHtml(broadcast.nama)}</strong></td>
                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(pesanPreview)}</td>
                    <td>${broadcast.tanggal_kirim || '-'}</td>
                    <td>${broadcast.total_target || 0}</td>
                    <td><span class="status-pill ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="action-group">
                            <button class="action-btn send" onclick="sendBroadcast(${broadcast.id})" title="Kirim">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="22" y1="2" x2="11" y2="13"/>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                </svg>
                            </button>
                            <button class="action-btn view" onclick="viewPenerima(${broadcast.id})" title="Penerima">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                            </button>
                            <button class="action-btn edit" onclick="editBroadcast(${broadcast.id})" title="Edit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </button>
                            <button class="action-btn delete" onclick="deleteBroadcast(${broadcast.id})" title="Hapus">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function openCreateModal() {
        document.getElementById('modalTitle').textContent = 'Buat Broadcast Baru';
        document.getElementById('broadcastForm').reset();
        document.getElementById('broadcastId').value = '';
        document.getElementById('waktu_langsung').checked = true;
        toggleTanggalKirim();
        document.getElementById('broadcastModal').classList.add('active');
    }

    function toggleTanggalKirim() {
        const jadwalkan = document.getElementById('waktu_jadwalkan').checked;
        const container = document.getElementById('tanggal_kirim_container');
        const input = document.getElementById('tanggal_kirim');
        
        if (jadwalkan) {
            container.style.display = 'block';
            input.removeAttribute('disabled');
            if (!input.value) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(9, 0, 0, 0);
                input.value = tomorrow.toISOString().slice(0, 16);
            }
        } else {
            container.style.display = 'none';
            input.setAttribute('disabled', 'disabled');
            input.value = '';
        }
    }

    function closeModal() {
        document.getElementById('broadcastModal').classList.remove('active');
    }

    async function editBroadcast(id) {
        try {
            const response = await fetch(`${API_BASE}/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            const result = await response.json();
            
            if (result.success) {
                const broadcast = result.data;
                document.getElementById('modalTitle').textContent = 'Edit Broadcast';
                document.getElementById('broadcastId').value = broadcast.id;
                document.getElementById('nama').value = broadcast.nama;
                document.getElementById('pesan').value = broadcast.pesan;
                
                if (broadcast.tanggal_kirim && broadcast.tanggal_kirim.trim() !== '') {
                    document.getElementById('waktu_jadwalkan').checked = true;
                    const tanggal = new Date(broadcast.tanggal_kirim);
                    document.getElementById('tanggal_kirim').value = tanggal.toISOString().slice(0, 16);
                } else {
                    document.getElementById('waktu_langsung').checked = true;
                }
                toggleTanggalKirim();
                
                const target = typeof broadcast.target === 'string' ? JSON.parse(broadcast.target) : broadcast.target;
                if (target) {
                    if (target.produk) {
                        const produkIds = Array.isArray(target.produk) ? target.produk : [target.produk];
                        const produkSelect = document.getElementById('target_produk');
                        Array.from(produkSelect.options).forEach(option => {
                            option.selected = produkIds.includes(parseInt(option.value));
                        });
                    }
                    (function mapStatusPembayaranToSelect() {
                        var el = document.getElementById('target_status_pembayaran');
                        var sp = target.status_pembayaran;
                        if (sp === undefined || sp === null || sp === '') {
                            el.value = '';
                            return;
                        }
                        var s = String(sp).toLowerCase();
                        if (s === 'unpaid' || s === 'paid' || s === 'dp') {
                            el.value = s;
                            return;
                        }
                        if (s === '0' || sp === 0) el.value = 'unpaid';
                        else if (s === '2' || sp === 2) el.value = 'paid';
                        else if (s === '4' || sp === 4) el.value = 'dp';
                        else el.value = '';
                    })();
                    (function mapStatusOrderToSelect() {
                        var el = document.getElementById('target_status_order');
                        var so = target.status_order;
                        if (so === undefined || so === null || so === '') {
                            el.value = '';
                            return;
                        }
                        var s = String(so).toLowerCase();
                        if (s === 'pending' || s === 'processing' || s === 'complete') {
                            el.value = s;
                            return;
                        }
                        if (s === '1' || so === 1) el.value = 'pending';
                        else if (s === '2' || so === 2) el.value = 'processing';
                        else if (s === '4' || so === 4) el.value = 'complete';
                        else el.value = '';
                    })();
                }
                
                document.getElementById('broadcastModal').classList.add('active');
            }
        } catch (error) {
            console.error('Error loading broadcast:', error);
            alert('Gagal memuat data broadcast');
        }
    }

    async function saveBroadcast(event) {
        event.preventDefault();
        
        const waktuKirim = document.querySelector('input[name="waktu_kirim"]:checked').value;
        const tanggalKirim = document.getElementById('tanggal_kirim').value;
        
        const formData = {
            nama: document.getElementById('nama').value,
            pesan: document.getElementById('pesan').value,
            tanggal_kirim: waktuKirim === 'jadwalkan' ? tanggalKirim : null,
            langsung_kirim: waktuKirim === 'langsung',
            target: {}
        };

        const produkSelect = document.getElementById('target_produk');
        const selectedProduk = Array.from(produkSelect.selectedOptions)
            .map(option => parseInt(option.value))
            .filter(id => !isNaN(id));
        
        if (selectedProduk.length > 0) {
            formData.target.produk = selectedProduk.length === 1 ? selectedProduk[0] : selectedProduk;
        }

        const statusPembayaran = document.getElementById('target_status_pembayaran').value;
        if (statusPembayaran) formData.target.status_pembayaran = statusPembayaran;

        const statusOrder = document.getElementById('target_status_order').value;
        if (statusOrder) formData.target.status_order = statusOrder;

        const id = document.getElementById('broadcastId').value;
        const url = id ? `${API_BASE}/${id}` : API_BASE;
        const method = id ? 'PUT' : 'POST';

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Menyimpan...';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            const result = await response.json();

            if (result.success) {
                const message = id ? 'Broadcast berhasil diperbarui' : 'Broadcast berhasil dibuat';
                
                if (formData.langsung_kirim && !id && result.data) {
                    const sendResult = await sendBroadcastAfterSave(result.data.id);
                    if (sendResult) {
                        alert(message + '\n\nBroadcast sedang dikirim ke queue!');
                    } else {
                        alert(message + '\n\nBroadcast dibuat, tapi gagal mengirim ke queue.');
                    }
                } else {
                    alert(message);
                }
                
                closeModal();
                loadBroadcasts();
            } else {
                alert(result.message || 'Gagal menyimpan broadcast');
            }
        } catch (error) {
            console.error('Error saving broadcast:', error);
            alert('Terjadi kesalahan saat menyimpan broadcast');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Simpan Broadcast';
        }
    }

    async function sendBroadcastAfterSave(id) {
        try {
            const response = await fetch(`${API_BASE}/${id}/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error sending broadcast:', error);
            return false;
        }
    }

    async function sendBroadcast(id) {
        if (!confirm('Apakah Anda yakin ingin mengirim broadcast ini?')) return;

        try {
            const response = await fetch(`${API_BASE}/${id}/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            const result = await response.json();

            if (result.success) {
                alert(`Broadcast berhasil dikirim!\nTotal: ${result.data.total_target}\nSent: ${result.data.sent_to_queue}\nFailed: ${result.data.failed}`);
                loadBroadcasts();
            } else {
                alert(result.message || 'Gagal mengirim broadcast');
            }
        } catch (error) {
            console.error('Error sending broadcast:', error);
            alert('Terjadi kesalahan');
        }
    }

    async function viewPenerima(id) {
        try {
            document.getElementById('penerimaContent').innerHTML = '<p style="text-align:center; color: var(--text-muted);">Memuat data...</p>';
            document.getElementById('penerimaModal').classList.add('active');
            
            const response = await fetch(`${API_BASE}/${id}/penerima`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                const penerima = result.data;
                
                if (penerima.length === 0) {
                    document.getElementById('penerimaContent').innerHTML = 
                        '<p style="text-align: center; padding: 2rem; color: var(--text-muted);">Belum ada data penerima</p>';
                    return;
                }

                let html = `
                    <p style="margin-bottom: 1rem;"><strong>Total Penerima: ${penerima.length}</strong></p>
                    <div class="table-responsive">
                        <table class="penerima-table">
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Customer</th>
                                    <th>No. Telepon</th>
                                    <th>Status</th>
                                    <th>Waktu Kirim</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                penerima.forEach((p, index) => {
                    const statusClass = p.status === '1' ? 'status-success' : 'status-warning';
                    const statusText = p.status === '1' ? 'Berhasil' : 'Pending';
                    const customerName = p.customer_rel ? p.customer_rel.nama : '-';
                    
                    html += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${escapeHtml(customerName)}</td>
                            <td>${escapeHtml(p.notelp || '-')}</td>
                            <td><span class="status-pill ${statusClass}">${statusText}</span></td>
                            <td>${p.send_at || '-'}</td>
                        </tr>
                    `;
                });

                html += '</tbody></table></div>';
                document.getElementById('penerimaContent').innerHTML = html;
            } else {
                document.getElementById('penerimaContent').innerHTML = 
                    '<p style="color: var(--danger);">Gagal memuat data</p>';
            }
        } catch (error) {
            console.error('Error loading penerima:', error);
            document.getElementById('penerimaContent').innerHTML = '<p style="color: var(--danger);">Error memuat data</p>';
        }
    }

    function closePenerimaModal() {
        document.getElementById('penerimaModal').classList.remove('active');
    }

    async function deleteBroadcast(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus broadcast ini?')) return;

        try {
            const response = await fetch(`${API_BASE}/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            const result = await response.json();

            if (result.success) {
                alert('Broadcast berhasil dihapus');
                loadBroadcasts();
            } else {
                alert(result.message || 'Gagal menghapus broadcast');
            }
        } catch (error) {
            console.error('Error deleting broadcast:', error);
            alert('Terjadi kesalahan');
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    window.onclick = function(event) {
        if (event.target === document.getElementById('broadcastModal')) closeModal();
        if (event.target === document.getElementById('penerimaModal')) closePenerimaModal();
    }
</script>
@endpush

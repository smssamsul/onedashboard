@extends('layouts.admin')

@section('title', 'Validasi Order')
@section('page_title', 'Validasi Order Customer')

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

    .sidebar-link.active,
    .sidebar-link:hover {
        background: linear-gradient(135deg, rgba(52, 211, 153, 0.08) 0%, rgba(52, 211, 153, 0.03) 100%);
        color: var(--theme-primary-dark);
    }

    .sidebar-link.active::before {
        background: linear-gradient(180deg, var(--theme-primary) 0%, var(--theme-primary-dark) 100%);
    }

    .filter-section {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .filter-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .filter-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .filter-group label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
    }

    .filter-group input,
    .filter-group select {
        padding: 0.625rem;
        border: 1px solid #D1D5DB;
        border-radius: 8px;
        font-size: 0.875rem;
        transition: all 0.2s;
    }

    .filter-group input:focus,
    .filter-group select:focus {
        outline: none;
        border-color: var(--theme-primary);
        box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.1);
    }

    .filter-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
    }

    .btn-filter {
        padding: 0.625rem 1.25rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
    }

    .btn-filter-primary {
        background: var(--theme-primary);
        color: white;
    }

    .btn-filter-primary:hover {
        background: var(--theme-primary-dark);
    }

    .btn-filter-secondary {
        background: #F3F4F6;
        color: #374151;
    }

    .btn-filter-secondary:hover {
        background: #E5E7EB;
    }

    .status-badge {
        display: inline-block;
        padding: 0.375rem 0.75rem;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .status-pending {
        background: #FEF3C7;
        color: #D97706;
    }

    .status-approved {
        background: #D1FAE5;
        color: #059669;
    }

    .status-rejected {
        background: #FEE2E2;
        color: #DC2626;
    }

    .status-belum-bayar {
        background: #E5E7EB;
        color: #6B7280;
    }

    .action-buttons {
        display: flex;
        gap: 0.5rem;
    }

    .btn-action {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
    }

    .btn-approve {
        background: var(--theme-primary);
        color: white;
    }

    .btn-approve:hover {
        background: var(--theme-primary-dark);
    }

    .btn-reject {
        background: #FEE2E2;
        color: #DC2626;
    }

    .btn-reject:hover {
        background: #FECACA;
    }

    .btn-view {
        background: #EFF6FF;
        color: #2563EB;
    }

    .btn-view:hover {
        background: #DBEAFE;
    }

    .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
    }

    .modal.active {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal-content {
        background: white;
        border-radius: 12px;
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid #E5E7EB;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #111827;
    }

    .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #6B7280;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
    }

    .modal-close:hover {
        background: #F3F4F6;
        color: #111827;
    }

    .modal-body {
        padding: 1.5rem;
    }

    .detail-group {
        margin-bottom: 1.5rem;
    }

    .detail-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: #6B7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
    }

    .detail-value {
        font-size: 0.875rem;
        color: #111827;
        font-weight: 500;
    }

    .detail-value-large {
        font-size: 1.125rem;
        color: #111827;
        font-weight: 600;
    }

    .bukti-pembayaran {
        margin-top: 1rem;
    }

    .bukti-pembayaran img {
        width: 100%;
        max-width: 400px;
        border-radius: 8px;
        border: 1px solid #E5E7EB;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    .form-group label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.5rem;
    }

    .form-group textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #D1D5DB;
        border-radius: 8px;
        font-size: 0.875rem;
        font-family: inherit;
        resize: vertical;
        min-height: 100px;
    }

    .form-group textarea:focus {
        outline: none;
        border-color: var(--theme-primary);
        box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.1);
    }

    .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid #E5E7EB;
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
    }

    .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: #6B7280;
    }

    .empty-state p {
        margin: 0.5rem 0 0 0;
        font-size: 0.875rem;
    }

    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;
        margin-top: 1.5rem;
        padding: 1rem;
    }

    .pagination button {
        padding: 0.5rem 1rem;
        border: 1px solid #D1D5DB;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s;
    }

    .pagination button:hover:not(:disabled) {
        background: #F3F4F6;
        border-color: var(--theme-primary);
    }

    .pagination button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .pagination .page-info {
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        color: #6B7280;
    }

    /* Disable hover effect on table rows */
    .card-table table tbody tr {
        transition: none !important;
    }

    .card-table table tbody tr:hover {
        background-color: transparent !important;
        transform: none !important;
    }
</style>
@endpush

@section('content')
    <!-- Statistik Card -->
    <div class="card-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
            <span class="stat-label">Menunggu Validasi</span>
            <span class="stat-value" id="stat-menunggu">0</span>
            <small class="text-muted">Order yang perlu divalidasi</small>
        </div>
        <div class="stat-card">
            <span class="stat-label">Total Nilai</span>
            <span class="stat-value" id="stat-total-nilai">Rp 0</span>
            <small class="text-muted">Nilai order menunggu</small>
        </div>
        <div class="stat-card">
            <span class="stat-label">Sudah Diapprove</span>
            <span class="stat-value" id="stat-approved">0</span>
            <small class="text-muted">Order yang sudah disetujui</small>
        </div>
        <div class="stat-card">
            <span class="stat-label">Ditolak</span>
            <span class="stat-value" id="stat-rejected">0</span>
            <small class="text-muted">Order yang ditolak</small>
        </div>
    </div>

    <!-- Filter Section -->
    <div class="filter-section">
        <div class="filter-grid">
            <div class="filter-group">
                <label>Tanggal Dari</label>
                <input type="date" id="filter-tanggal-dari" class="form-control">
            </div>
            <div class="filter-group">
                <label>Tanggal Sampai</label>
                <input type="date" id="filter-tanggal-sampai" class="form-control">
            </div>
            <div class="filter-group">
                <label>Metode Pembayaran</label>
                <select id="filter-payment-method" class="form-control">
                    <option value="">Semua Metode</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="E-Wallet">E-Wallet</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="qris">QRIS</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Status Pembayaran</label>
                <select id="filter-status" class="form-control">
                    <option value="">Semua Status</option>
                    <option value="1">Menunggu Approve Finance</option>
                    <option value="2">Approved</option>
                    <option value="3">Rejected</option>
                </select>
            </div>
        </div>
        <div class="filter-actions">
            <button class="btn-filter btn-filter-secondary" onclick="resetFilter()">Reset</button>
            <button class="btn-filter btn-filter-primary" onclick="applyFilter()">Terapkan Filter</button>
        </div>
    </div>

    <!-- Table Section -->
    <div class="card-table">
        <h3>Daftar Order</h3>
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Payment ID</th>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Produk</th>
                        <th>Amount</th>
                        <th>Total Paid / Remaining</th>
                        <th>Metode Bayar</th>
                        <th>Tanggal</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody id="orders-table">
                    <tr>
                        <td colspan="10" style="text-align: center; padding: 2rem;">Memuat data...</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="pagination" id="pagination"></div>
    </div>

    <!-- Modal Detail & Approve/Reject -->
    <div id="orderModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Detail Order</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body" id="modal-body">
                <!-- Content akan diisi via JavaScript -->
            </div>
            <div class="modal-footer" id="modal-footer">
                <!-- Footer akan diisi via JavaScript -->
            </div>
        </div>
    </div>
@endsection

@push('scripts')
<script>
    let currentPage = 1;
    let currentFilters = {};
    let currentOrderId = null;

    async function loadStatistics() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch('/api/finance/order-validation/statistics', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    document.getElementById('stat-menunggu').textContent = result.data.menunggu_validasi || 0;
                    document.getElementById('stat-total-nilai').textContent = result.data.total_nilai_menunggu_formatted || 'Rp 0';
                    document.getElementById('stat-approved').textContent = result.data.sudah_diapprove || 0;
                    document.getElementById('stat-rejected').textContent = result.data.ditolak || 0;
                }
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    // Helper function untuk mendapatkan keterangan status
    function getStatusKeterangan(status) {
        const statusMap = {
            '1': 'Menunggu Approve Finance',
            '2': 'Approved',
            '3': 'Rejected',
            null: 'Unknown',
            undefined: 'Unknown'
        };
        return statusMap[status] || 'Unknown';
    }

    // Helper function untuk mendapatkan class badge status
    function getStatusBadgeClass(status) {
        const statusMap = {
            '1': 'status-pending',
            '2': 'status-approved',
            '3': 'status-rejected',
            null: 'status-belum-bayar',
            undefined: 'status-belum-bayar'
        };
        return statusMap[status] || 'status-belum-bayar';
    }

    // Helper function untuk mendapatkan actions yang tersedia
    function getAvailableActions(status) {
        const statusStr = String(status || '1');
        if (statusStr === '1') {
            return ['approve', 'reject']; // Pending bisa approve atau reject
        } else if (statusStr === '2') {
            return ['reject']; // Approved bisa reject
        } else if (statusStr === '3') {
            return ['approve']; // Rejected bisa approve
        }
        return []; // Status lain tidak ada action
    }

    async function loadOrders(page = 1) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const params = new URLSearchParams({
                page: page,
                per_page: 15
            });

            // Tambahkan filter ke params
            if (currentFilters.tanggal_dari) params.append('tanggal_dari', currentFilters.tanggal_dari);
            if (currentFilters.tanggal_sampai) params.append('tanggal_sampai', currentFilters.tanggal_sampai);
            if (currentFilters.payment_method) params.append('payment_method', currentFilters.payment_method);
            
            // Jika ada filter status dan tidak kosong, tambahkan ke query
            if (currentFilters.status && currentFilters.status !== '') {
                params.append('status', currentFilters.status);
            }

            const response = await fetch(`/api/finance/order-validation?${params}`, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            const result = await response.json();
            const tbody = document.getElementById('orders-table');

            if (result.success && result.data && result.data.length > 0) {
                tbody.innerHTML = result.data.map(payment => {
                    const amount = 'Rp ' + new Intl.NumberFormat('id-ID').format(payment.amount || 0);
                    const totalPaid = 'Rp ' + new Intl.NumberFormat('id-ID').format(payment.total_paid || 0);
                    const remaining = 'Rp ' + new Intl.NumberFormat('id-ID').format(payment.remaining || 0);
                    
                    const tanggal = payment.tanggal 
                        ? new Date(payment.tanggal).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        })
                        : '-';
                    
                    const paymentStatus = payment.status || '1';
                    const statusKeterangan = getStatusKeterangan(paymentStatus);
                    const statusBadgeClass = getStatusBadgeClass(paymentStatus);
                    const availableActions = getAvailableActions(paymentStatus);

                    // Build action buttons based on available actions
                    let actionButtons = `<button class="btn-action btn-view" onclick="viewOrder(${payment.id})">Detail</button>`;
                    
                    if (availableActions.includes('approve')) {
                        actionButtons += `<button class="btn-action btn-approve" onclick="approveOrder(${payment.id})">Approve</button>`;
                    }
                    
                    if (availableActions.includes('reject')) {
                        actionButtons += `<button class="btn-action btn-reject" onclick="rejectOrder(${payment.id})">Reject</button>`;
                    }

                    const paidRemainingHtml = `
                        <div style="font-weight: 500; color: #059669; margin-bottom: 0.25rem;">
                             ${totalPaid}
                        </div>
                        <div style="font-weight: 500; color: ${payment.remaining > 0 ? '#DC2626' : '#059669'}; font-size: 0.875rem;">
                            / ${remaining}
                        </div>
                    `;

                    return `
                        <tr>
                            <td>#${payment.id}</td>
                            <td>#${payment.order_id}</td>
                            <td>
                                <div style="font-weight: 500;">${payment.order_rel?.customer_rel?.nama || '-'}</div>
                                <small style="color: #6B7280;">${payment.order_rel?.customer_rel?.email || '-'}</small>
                            </td>
                            <td>${payment.order_rel?.produk_rel?.nama || '-'}</td>
                            <td style="font-weight: 600;">${amount}</td>
                            <td>${paidRemainingHtml}</td>
                            <td>${payment.payment_method || '-'}</td>
                            <td>${tanggal}</td>
                            <td><span class="status-badge ${statusBadgeClass}">${statusKeterangan}</span></td>
                            <td>
                                <div class="action-buttons">
                                    ${actionButtons}
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');

                // Update pagination
                updatePagination(result.pagination);
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" class="empty-state">
                            <p>Tidak ada data pembayaran</p>
                        </td>
                    </tr>
                `;
                document.getElementById('pagination').innerHTML = '';
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            document.getElementById('orders-table').innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 2rem; color: #DC2626;">
                        Terjadi kesalahan saat memuat data
                    </td>
                </tr>
            `;
        }
    }

    function updatePagination(pagination) {
        const paginationEl = document.getElementById('pagination');
        if (!pagination || pagination.total <= pagination.per_page) {
            paginationEl.innerHTML = '';
            return;
        }

        const totalPages = pagination.last_page;
        const currentPageNum = pagination.current_page;

        let html = `
            <button ${currentPageNum === 1 ? 'disabled' : ''} onclick="loadOrders(${currentPageNum - 1})">Sebelumnya</button>
            <span class="page-info">Halaman ${currentPageNum} dari ${totalPages}</span>
            <button ${currentPageNum === totalPages ? 'disabled' : ''} onclick="loadOrders(${currentPageNum + 1})">Selanjutnya</button>
        `;

        paginationEl.innerHTML = html;
    }

    async function viewOrder(id) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch(`/api/finance/order-validation/${id}`, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    const payment = result.data;
                    currentOrderId = id;

                    const modalBody = document.getElementById('modal-body');
                    const modalFooter = document.getElementById('modal-footer');

                    const order = payment.order || {};
                    const customer = payment.customer || {};
                    const produk = payment.produk || {};

                    modalBody.innerHTML = `
                        <div class="detail-group">
                            <div class="detail-label">Payment ID</div>
                            <div class="detail-value-large">#${payment.id}</div>
                            <div class="detail-value" style="margin-top: 0.25rem; color: #6B7280;">
                                Order ID: #${payment.order_id} | Payment Ke: ${payment.payment_ke || '-'}
                            </div>
                        </div>

                        <div class="detail-group">
                            <div class="detail-label">Customer</div>
                            <div class="detail-value-large">${customer.nama || '-'}</div>
                            <div class="detail-value" style="margin-top: 0.25rem;">
                                ${customer.email || '-'} | ${customer.wa || '-'}
                            </div>
                            <div class="detail-value" style="margin-top: 0.25rem; color: #6B7280;">
                                ${customer.alamat || '-'}
                            </div>
                        </div>

                        <div class="detail-group">
                            <div class="detail-label">Produk</div>
                            <div class="detail-value-large">${produk.nama || '-'}</div>
                            <div class="detail-value" style="margin-top: 0.25rem; color: #6B7280;">
                                Kode: ${produk.kode || '-'}
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                            <div class="detail-group">
                                <div class="detail-label">Amount Pembayaran</div>
                                <div class="detail-value-large" style="color: var(--theme-primary-dark);">
                                    Rp ${new Intl.NumberFormat('id-ID').format(payment.amount || 0)}
                                </div>
                            </div>
                            <div class="detail-group">
                                <div class="detail-label">Total Harga Order</div>
                                <div class="detail-value-large">
                                    Rp ${new Intl.NumberFormat('id-ID').format(order.total_harga || 0)}
                                </div>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                            <div class="detail-group">
                                <div class="detail-label">Payment Method</div>
                                <div class="detail-value">${payment.payment_method || '-'}</div>
                            </div>
                            <div class="detail-group">
                                <div class="detail-label">Payment Type</div>
                                <div class="detail-value">${payment.payment_type || '-'}</div>
                            </div>
                        </div>

                        <div class="detail-group">
                            <div class="detail-label">Tanggal Pembayaran</div>
                            <div class="detail-value">${payment.tanggal ? new Date(payment.tanggal).toLocaleString('id-ID') : '-'}</div>
                        </div>

                        ${payment.catatan ? `
                            <div class="detail-group">
                                <div class="detail-label">Catatan</div>
                                <div class="detail-value">${payment.catatan}</div>
                            </div>
                        ` : ''}

                        ${payment.bukti_pembayaran ? `
                            <div class="detail-group bukti-pembayaran">
                                <div class="detail-label">Bukti Pembayaran</div>
                                <img src="${payment.bukti_pembayaran}" alt="Bukti Pembayaran" onclick="window.open('${payment.bukti_pembayaran}', '_blank')" style="cursor: pointer;">
                            </div>
                        ` : ''}
                    `;

                    // Get available actions based on payment status
                    const paymentStatus = payment.status || '1';
                    const availableActions = getAvailableActions(paymentStatus);
                    
                    let footerButtons = `<button class="btn-filter btn-filter-secondary" onclick="closeModal()">Tutup</button>`;
                    
                    if (availableActions.includes('reject')) {
                        footerButtons += `<button class="btn-action btn-reject" onclick="showRejectForm()">Tolak</button>`;
                    }
                    
                    if (availableActions.includes('approve')) {
                        footerButtons += `<button class="btn-action btn-approve" onclick="showApproveForm()">Approve</button>`;
                    }
                    
                    modalFooter.innerHTML = footerButtons;

                    document.getElementById('orderModal').classList.add('active');
                }
            }
        } catch (error) {
            console.error('Error loading order detail:', error);
            alert('Terjadi kesalahan saat memuat detail order');
        }
    }

    function showApproveForm() {
        const modalBody = document.getElementById('modal-body');
        const currentContent = modalBody.innerHTML;
        
        modalBody.innerHTML = currentContent + `
            <div class="form-group" style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #E5E7EB;">
                <label>Catatan (Opsional)</label>
                <textarea id="approve-catatan" placeholder="Tambahkan catatan jika diperlukan..."></textarea>
            </div>
        `;

        const modalFooter = document.getElementById('modal-footer');
        modalFooter.innerHTML = `
            <button class="btn-filter btn-filter-secondary" onclick="viewOrder(${currentOrderId})">Kembali</button>
            <button class="btn-action btn-approve" onclick="submitApprove()">Konfirmasi Approve</button>
        `;
    }

    function showRejectForm() {
        const modalBody = document.getElementById('modal-body');
        const currentContent = modalBody.innerHTML;
        
        modalBody.innerHTML = currentContent + `
            <div class="form-group" style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #E5E7EB;">
                <label>Alasan Penolakan <span style="color: #DC2626;">*</span></label>
                <textarea id="reject-alasan" placeholder="Masukkan alasan penolakan..." required></textarea>
            </div>
        `;

        const modalFooter = document.getElementById('modal-footer');
        modalFooter.innerHTML = `
            <button class="btn-filter btn-filter-secondary" onclick="viewOrder(${currentOrderId})">Kembali</button>
            <button class="btn-action btn-reject" onclick="submitReject()">Konfirmasi Tolak</button>
        `;
    }

    async function submitApprove() {
        if (!currentOrderId) return;

        const catatan = document.getElementById('approve-catatan')?.value || '';

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch(`/api/finance/order-validation/${currentOrderId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ catatan })
            });

            const result = await response.json();

            if (result.success) {
                alert('Order berhasil disetujui');
                closeModal();
                loadOrders(currentPage);
                loadStatistics();
            } else {
                alert(result.message || 'Gagal menyetujui order');
            }
        } catch (error) {
            console.error('Error approving order:', error);
            alert('Terjadi kesalahan saat menyetujui order');
        }
    }

    async function submitReject() {
        if (!currentOrderId) return;

        const catatan = document.getElementById('reject-alasan')?.value;
        if (!catatan || catatan.trim() === '') {
            alert('Alasan penolakan harus diisi');
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch(`/api/finance/order-validation/${currentOrderId}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ catatan })
            });

            const result = await response.json();

            if (result.success) {
                alert('Order ditolak');
                closeModal();
                loadOrders(currentPage);
                loadStatistics();
            } else {
                alert(result.message || 'Gagal menolak order');
            }
        } catch (error) {
            console.error('Error rejecting order:', error);
            alert('Terjadi kesalahan saat menolak order');
        }
    }

    async function approveOrder(id) {
        if (confirm('Apakah Anda yakin ingin menyetujui order ini?')) {
            try {
                const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
                const response = await fetch(`/api/finance/order-validation/${id}/approve`, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });

                const result = await response.json();

                if (result.success) {
                    alert('Order berhasil disetujui');
                    loadOrders(currentPage);
                    loadStatistics();
                } else {
                    alert(result.message || 'Gagal menyetujui order');
                }
            } catch (error) {
                console.error('Error approving order:', error);
                alert('Terjadi kesalahan saat menyetujui order');
            }
        }
    }

    async function rejectOrder(id) {
        const catatan = prompt('Masukkan alasan penolakan:');
        if (!catatan || catatan.trim() === '') {
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch(`/api/finance/order-validation/${id}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ catatan })
            });

            const result = await response.json();

            if (result.success) {
                alert('Order ditolak');
                loadOrders(currentPage);
                loadStatistics();
            } else {
                alert(result.message || 'Gagal menolak order');
            }
        } catch (error) {
            console.error('Error rejecting order:', error);
            alert('Terjadi kesalahan saat menolak order');
        }
    }

    function closeModal() {
        document.getElementById('orderModal').classList.remove('active');
        currentOrderId = null;
    }

    function applyFilter() {
        currentFilters = {};
        
        const tanggalDari = document.getElementById('filter-tanggal-dari').value;
        const tanggalSampai = document.getElementById('filter-tanggal-sampai').value;
        const paymentMethod = document.getElementById('filter-payment-method').value;
        const status = document.getElementById('filter-status').value;

        if (tanggalDari) currentFilters.tanggal_dari = tanggalDari;
        if (tanggalSampai) currentFilters.tanggal_sampai = tanggalSampai;
        if (paymentMethod) currentFilters.payment_method = paymentMethod;
        if (status) currentFilters.status = status;

        currentPage = 1;
        loadOrders(currentPage);
    }

    function resetFilter() {
        document.getElementById('filter-tanggal-dari').value = '';
        document.getElementById('filter-tanggal-sampai').value = '';
        document.getElementById('filter-payment-method').value = '';
        document.getElementById('filter-status').value = '';
        currentFilters = {};
        currentPage = 1;
        loadOrders(currentPage);
    }

    // Close modal when clicking outside
    document.getElementById('orderModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        loadStatistics();
        loadOrders(currentPage);
    });
</script>
@endpush




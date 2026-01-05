@extends('layouts.user')

@section('title', 'Izin Telat')

@push('styles')
<style>
    .action-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
    }

    .btn {
        padding: 0.625rem 1.25rem;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
    }

    .btn-primary {
        background: var(--primary);
        color: white;
    }

    .btn-primary:hover {
        background: var(--primary-dark);
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
        background: var(--surface);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 600px;
        box-shadow: var(--shadow-lg);
        max-height: 90vh;
        overflow-y: auto;
    }

    .modal-header {
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-body {
        padding: 1.5rem;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
        width: 100%;
        padding: 0.625rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
    }

    .modal-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
    }

    .status-badge {
        padding: 0.375rem 0.75rem;
        border-radius: var(--radius-sm);
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
</style>
@endpush

@section('content')
<div class="action-bar">
    <h2 style="margin: 0;">Izin Telat</h2>
    <button class="btn btn-primary" onclick="openAddModal()">+ Ajukan Izin Telat</button>
</div>

<div class="card-table">
    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Tanggal</th>
                    <th>Jam Masuk</th>
                    <th>Alasan</th>
                    <th>Status</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">Memuat data...</td>
                </tr>
            </tbody>
        </table>
    </div>
    <div class="pagination" id="pagination"></div>
</div>

<!-- Add/Edit Modal -->
<div class="modal-overlay" id="izinTelatModal" onclick="closeModal()">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h3 id="modalTitle">Ajukan Izin Telat</h3>
            <button onclick="closeModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
        </div>
        <div class="modal-body">
            <form id="izinTelatForm">
                <input type="hidden" id="izinTelatId">
                <div class="form-group">
                    <label>Tanggal *</label>
                    <input type="date" id="tanggal" required>
                </div>
                <div class="form-group">
                    <label>Jam Masuk *</label>
                    <input type="time" id="jamMasuk" required>
                </div>
                <div class="form-group">
                    <label>Alasan *</label>
                    <textarea id="alasan" rows="4" required></textarea>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn" onclick="closeModal()" style="background: var(--surface); border: 1px solid var(--border);">Batal</button>
            <button class="btn btn-primary" onclick="submitForm()">Simpan</button>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    let currentPage = 1;

    async function loadData(page = 1) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`/api/hr/izin-telat?page=${page}`, {
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
            
            if (result.success) {
                renderTable(result.data, result.pagination);
                renderPagination(result.pagination);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    function renderTable(data, pagination = null) {
        const tbody = document.getElementById('tableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Tidak ada data</td></tr>';
            return;
        }

        const perPage = pagination ? pagination.per_page : 15;
        const startNumber = pagination ? (pagination.current_page - 1) * perPage + 1 : 1;

        tbody.innerHTML = data.map((item, index) => {
            const statusClass = item.status === 'pending' ? 'status-pending' : 
                              item.status === 'approved' ? 'status-approved' : 'status-rejected';
            const statusText = item.status === 'pending' ? 'Menunggu' : 
                              item.status === 'approved' ? 'Disetujui' : 'Ditolak';
            
            return `
                <tr>
                    <td>${startNumber + index}</td>
                    <td>${item.tanggal || '-'}</td>
                    <td>${item.jam_masuk || '-'}</td>
                    <td>${item.alasan || '-'}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        ${item.status === 'pending' ? `<button class="btn" onclick="cancelIzinTelat(${item.id})" style="background: var(--danger); color: white; padding: 0.375rem 0.75rem; font-size: 0.75rem;">Batal</button>` : '-'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderPagination(pagination) {
        const paginationEl = document.getElementById('pagination');
        if (!pagination || pagination.last_page <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        paginationEl.innerHTML = `
            <button onclick="loadData(${pagination.current_page - 1})" ${pagination.current_page === 1 ? 'disabled' : ''}>Sebelumnya</button>
            <span>Halaman ${pagination.current_page} dari ${pagination.last_page}</span>
            <button onclick="loadData(${pagination.current_page + 1})" ${pagination.current_page === pagination.last_page ? 'disabled' : ''}>Selanjutnya</button>
        `;
    }

    function openAddModal() {
        document.getElementById('modalTitle').textContent = 'Ajukan Izin Telat';
        document.getElementById('izinTelatForm').reset();
        document.getElementById('izinTelatId').value = '';
        document.getElementById('izinTelatModal').classList.add('active');
    }

    function closeModal() {
        document.getElementById('izinTelatModal').classList.remove('active');
        document.getElementById('izinTelatForm').reset();
    }

    async function submitForm() {
        const tanggal = document.getElementById('tanggal').value;
        const jamMasuk = document.getElementById('jamMasuk').value;
        const alasan = document.getElementById('alasan').value;

        if (!tanggal || !jamMasuk || !alasan) {
            alert('Harap lengkapi semua field yang wajib diisi');
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch('/api/hr/izin-telat', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tanggal: tanggal,
                    jam_masuk: jamMasuk,
                    alasan: alasan
                })
            });

            const result = await response.json();
            
            if (result.success) {
                closeModal();
                loadData(currentPage);
                alert(result.message || 'Pengajuan izin telat berhasil');
            } else {
                alert(result.message || 'Terjadi kesalahan');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Terjadi kesalahan saat menyimpan data');
        }
    }

    async function cancelIzinTelat(id) {
        if (!confirm('Apakah Anda yakin ingin membatalkan pengajuan izin telat ini?')) {
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch(`/api/hr/izin-telat/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                loadData(currentPage);
                alert(result.message || 'Pengajuan izin telat berhasil dibatalkan');
            } else {
                alert(result.message || 'Terjadi kesalahan');
            }
        } catch (error) {
            console.error('Error canceling izin telat:', error);
            alert('Terjadi kesalahan saat membatalkan pengajuan');
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        loadData();
    });
</script>
@endpush


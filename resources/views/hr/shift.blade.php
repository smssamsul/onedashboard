@extends('layouts.hr')

@section('title', 'Shift')
@section('page_title', 'Manajemen Shift')

@push('styles')
<style>
    :root {
        --theme-primary: #A78BFA;
        --theme-primary-dark: #8B5CF6;
        --theme-primary-light: #C4B5FD;
    }

    .action-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
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
        max-width: 500px;
        box-shadow: var(--shadow-lg);
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
    .form-group select {
        width: 100%;
        padding: 0.625rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .modal-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
    }

    .badge {
        padding: 0.25rem 0.75rem;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: 500;
    }

    .badge-flexible {
        background: #D1FAE5;
        color: #059669;
    }

    .badge-fixed {
        background: #E5F5FF;
        color: #4DA6FF;
    }
</style>
@endpush

@section('content')
<div class="action-bar">
    <div class="search-input">
        <input type="text" id="searchInput" placeholder="Cari shift...">
    </div>
    <button class="btn btn-primary" onclick="openModal()">+ Tambah Shift</button>
</div>

<div class="card-table">
    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Nama Shift</th>
                    <th>Jam Mulai</th>
                    <th>Jam Selesai</th>
                    <th>Tipe</th>
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

<!-- Modal -->
<div class="modal-overlay" id="modalOverlay" onclick="closeModal()">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h3 id="modalTitle">Tambah Shift</h3>
            <button onclick="closeModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
        </div>
        <div class="modal-body">
            <form id="shiftForm">
                <input type="hidden" id="shiftId">
                
                <div class="form-group">
                    <label>Nama Shift *</label>
                    <input type="text" id="nama" required placeholder="Contoh: Shift Pagi">
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Jam Mulai *</label>
                        <input type="time" id="start_time" required>
                    </div>
                    <div class="form-group">
                        <label>Jam Selesai *</label>
                        <input type="time" id="end_time" required>
                    </div>
                </div>

                <div class="form-group">
                    <label>
                        <input type="checkbox" id="is_flexible" style="width: auto; margin-right: 0.5rem;">
                        Shift Fleksibel
                    </label>
                    <small style="display: block; margin-top: 0.25rem; color: var(--text-muted); font-size: 0.75rem;">
                        Shift fleksibel tidak akan mengecek keterlambatan
                    </small>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn" onclick="closeModal()" style="background: var(--surface); border: 1px solid var(--border);">Batal</button>
            <button class="btn btn-primary" onclick="saveShift()">Simpan</button>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    let currentPage = 1;
    let searchTerm = '';

    async function loadData(page = 1) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            let url = `/api/hr/shift?page=${page}`;
            if (searchTerm) {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }

            const response = await fetch(url, {
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
            const typeClass = item.is_flexible ? 'badge-flexible' : 'badge-fixed';
            const typeText = item.is_flexible ? 'Fleksibel' : 'Tetap';
            
            return `
                <tr>
                    <td>${startNumber + index}</td>
                    <td>${item.nama || '-'}</td>
                    <td>${item.start_time || '-'}</td>
                    <td>${item.end_time || '-'}</td>
                    <td><span class="badge ${typeClass}">${typeText}</span></td>
                    <td>
                        <button class="btn" onclick="editShift(${item.id})" style="background: var(--primary); color: white; padding: 0.375rem 0.75rem; font-size: 0.75rem;">Edit</button>
                        <button class="btn" onclick="deleteShift(${item.id})" style="background: var(--primary); color: white; padding: 0.375rem 0.75rem; font-size: 0.75rem;">Hapus</button>
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

    function openModal(id = null) {
        const modal = document.getElementById('modalOverlay');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('shiftForm');
        
        if (id) {
            title.textContent = 'Edit Shift';
            loadShift(id);
        } else {
            title.textContent = 'Tambah Shift';
            form.reset();
            document.getElementById('shiftId').value = '';
        }
        
        modal.classList.add('active');
    }

    function closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    }

    async function loadShift(id) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch(`/api/hr/shift/${id}`, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success) {
                const data = result.data;
                document.getElementById('shiftId').value = data.id;
                document.getElementById('nama').value = data.nama || '';
                document.getElementById('start_time').value = data.start_time || '';
                document.getElementById('end_time').value = data.end_time || '';
                document.getElementById('is_flexible').checked = data.is_flexible || false;
            }
        } catch (error) {
            console.error('Error loading shift:', error);
        }
    }

    async function saveShift() {
        const id = document.getElementById('shiftId').value;
        const nama = document.getElementById('nama').value;
        const start_time = document.getElementById('start_time').value;
        const end_time = document.getElementById('end_time').value;
        const is_flexible = document.getElementById('is_flexible').checked;

        if (!nama || !start_time || !end_time) {
            alert('Nama, Jam Mulai, dan Jam Selesai harus diisi');
            return;
        }

        if (start_time >= end_time) {
            alert('Jam Selesai harus lebih besar dari Jam Mulai');
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const url = id ? `/api/hr/shift/${id}` : '/api/hr/shift';
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    nama,
                    start_time,
                    end_time,
                    is_flexible
                })
            });

            const result = await response.json();
            
            if (result.success) {
                closeModal();
                loadData(currentPage);
                alert(result.message);
            } else {
                alert(result.message || 'Terjadi kesalahan');
            }
        } catch (error) {
            console.error('Error saving shift:', error);
            alert('Terjadi kesalahan saat menyimpan data');
        }
    }

    async function deleteShift(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus shift ini?')) {
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch(`/api/hr/shift/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                loadData(currentPage);
                alert(result.message);
            } else {
                alert(result.message || 'Terjadi kesalahan');
            }
        } catch (error) {
            console.error('Error deleting shift:', error);
            alert('Terjadi kesalahan saat menghapus data');
        }
    }

    function editShift(id) {
        openModal(id);
    }

    // Event listeners
    document.getElementById('searchInput').addEventListener('input', function(e) {
        searchTerm = e.target.value;
        currentPage = 1;
        loadData(1);
    });

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        loadData();
    });
</script>
@endpush


@extends('layouts.hr')

@section('title', 'Karyawan')
@section('page_title', 'Manajemen Karyawan')

@push('styles')
<style>
    :root {
        --theme-primary: #A78BFA;
        --theme-primary-dark: #8B5CF6;
        --theme-primary-light: #C4B5FD;
    }

    .page-header {
        background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-light) 100%);
        border-radius: var(--radius-lg);
        padding: 1.5rem 2rem;
        color: white;
        margin-bottom: 1.5rem;
    }

    .action-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
    }

    .search-input input,
    .filter-select {
        padding: 0.625rem 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        background: var(--surface);
    }

    .search-input input {
        width: 280px;
        padding-left: 2.5rem;
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
        overflow-y: auto;
        padding: 1rem;
    }

    .modal-overlay.active {
        display: flex;
    }

    .modal {
        background: var(--surface);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 700px;
        box-shadow: var(--shadow-lg);
        margin: auto;
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
        max-height: 70vh;
        overflow-y: auto;
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

    .form-group textarea {
        resize: vertical;
        min-height: 80px;
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

    .status-badge {
        padding: 0.25rem 0.75rem;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: 500;
    }

    .status-aktif {
        background: #D1FAE5;
        color: #059669;
    }

    .status-resign {
        background: #FEE2E2;
        color: #DC2626;
    }
</style>
@endpush

@section('content')
<div class="action-bar">
    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <div class="search-input">
            <input type="text" id="searchInput" placeholder="Cari karyawan...">
        </div>
        <select class="filter-select" id="filterDepartemen" style="width: 200px;">
            <option value="">Semua Departemen</option>
        </select>
        <select class="filter-select" id="filterStatus" style="width: 150px;">
            <option value="">Semua Status</option>
            <option value="1">Aktif</option>
            <option value="N">Non Aktif</option>
        </select>
    </div>
    <button class="btn btn-primary" onclick="openModal()">+ Tambah Karyawan</button>
</div>

<div class="card-table">
    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>No. Telp</th>
                    <th>Departemen</th>
                    <th>Jabatan</th>
                    <th>Status</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem;">Memuat data...</td>
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
            <h3 id="modalTitle">Tambah Karyawan</h3>
            <button onclick="closeModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
        </div>
        <div class="modal-body">
            <form id="karyawanForm">
                <input type="hidden" id="karyawanId">
                
                <div class="form-group">
                    <label>Nama Karyawan *</label>
                    <input type="text" id="nama" required>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Jenis Kelamin</label>
                        <select id="jenis_kelamin">
                            <option value="">Pilih</option>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Tanggal Lahir</label>
                        <input type="date" id="tanggal_lahir">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="email">
                    </div>
                    <div class="form-group">
                        <label>No. Telepon</label>
                        <input type="text" id="notelp">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Tanggal Join *</label>
                        <input type="date" id="tanggal_join" required>
                    </div>
                    <div class="form-group" id="tanggalResignGroup" style="display: none;">
                        <label>Tanggal Resign</label>
                        <input type="date" id="tanggal_resign">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Departemen</label>
                        <select id="departemen">
                            <option value="">Pilih Departemen</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Jabatan *</label>
                        <select id="jabatan" required>
                            <option value="">Pilih Jabatan</option>
                            <option value="1">Head</option>
                            <option value="2">Staff</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Shift</label>
                    <select id="shift">
                        <option value="">Pilih Shift</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Status Karyawan</label>
                    <select id="status_karyawan">
                        <option value="">Pilih Status</option>
                        <option value="Aktif">Aktif</option>
                        <option value="Cuti">Cuti</option>
                        <option value="Resign">Resign</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Alamat</label>
                    <textarea id="alamat"></textarea>
                </div>

                <div class="form-group" id="avatarUrlGroup" style="display: none;">
                    <label>Avatar URL</label>
                    <input type="text" id="avatar_url" placeholder="https://...">
                </div>

                <div class="form-group" id="statusGroup" style="display: none;">
                    <label>Status</label>
                    <select id="status">
                        <option value="1">Aktif</option>
                        <option value="N">Non Aktif</option>
                    </select>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn" onclick="closeModal()" style="background: var(--surface); border: 1px solid var(--border);">Batal</button>
            <button class="btn btn-primary" onclick="saveKaryawan()">Simpan</button>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    let currentPage = 1;
    let searchTerm = '';
    let filterDepartemen = '';
    let filterStatus = '';
    let departemenList = [];
    let shiftList = [];

    async function loadDepartemenList() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch('/api/hr/departemen?all=true', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success) {
                departemenList = result.data;
                const select = document.getElementById('departemen');
                const filterSelect = document.getElementById('filterDepartemen');
                
                const options = '<option value="">Pilih Departemen</option>' + 
                    departemenList.map(d => `<option value="${d.id}">${d.nama}</option>`).join('');
                
                select.innerHTML = options;
                filterSelect.innerHTML = '<option value="">Semua Departemen</option>' + 
                    departemenList.map(d => `<option value="${d.id}">${d.nama}</option>`).join('');
            }
        } catch (error) {
            console.error('Error loading departemen:', error);
        }
    }

    async function loadShiftList() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch('/api/hr/shift?all=true', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success) {
                shiftList = result.data;
                const select = document.getElementById('shift');
                
                const options = '<option value="">Pilih Shift</option>' + 
                    shiftList.map(s => `<option value="${s.id}">${s.nama} (${s.start_time} - ${s.end_time})</option>`).join('');
                
                select.innerHTML = options;
            }
        } catch (error) {
            console.error('Error loading shift:', error);
        }
    }

    async function loadData(page = 1) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            let url = `/api/hr/karyawan?page=${page}`;
            if (searchTerm) {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }
            if (filterDepartemen) {
                url += `&departemen=${filterDepartemen}`;
            }
            if (filterStatus) {
                url += `&status=${filterStatus}`;
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
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">Tidak ada data</td></tr>';
            return;
        }

        const perPage = pagination ? pagination.per_page : 15;
        const startNumber = pagination ? (pagination.current_page - 1) * perPage + 1 : 1;

        tbody.innerHTML = data.map((item, index) => {
            const statusClass = item.status === '1' ? 'status-aktif' : 'status-resign';
            const statusText = item.status === '1' ? 'Aktif' : 'Non Aktif';
            
            return `
                <tr>
                    <td>${startNumber + index}</td>
                    <td>${item.nama || '-'}</td>
                    <td>${item.email || '-'}</td>
                    <td>${item.notelp || '-'}</td>
                    <td>${item.departemen_rel ? item.departemen_rel.nama : '-'}</td>
                    <td>${item.jabatan === 1 ? 'Head' : item.jabatan === 2 ? 'Staff' : '-'}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="btn" onclick="editKaryawan(${item.id})" style="background: var(--primary); color: white; padding: 0.375rem 0.75rem; font-size: 0.75rem;">Edit</button>
                        <button class="btn" onclick="deleteKaryawan(${item.id})" style="background: var(--primary); color: white; padding: 0.375rem 0.75rem; font-size: 0.75rem;">Hapus</button>
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
        const form = document.getElementById('karyawanForm');
        const tanggalResignGroup = document.getElementById('tanggalResignGroup');
        const statusGroup = document.getElementById('statusGroup');
        const avatarUrlGroup = document.getElementById('avatarUrlGroup');
        
        if (id) {
            title.textContent = 'Edit Karyawan';
            // Tampilkan field tanggal resign, status, dan avatar_url saat edit
            if (tanggalResignGroup) tanggalResignGroup.style.display = 'block';
            if (statusGroup) statusGroup.style.display = 'block';
            if (avatarUrlGroup) avatarUrlGroup.style.display = 'block';
            loadKaryawan(id);
        } else {
            title.textContent = 'Tambah Karyawan';
            form.reset();
            document.getElementById('karyawanId').value = '';
            // Sembunyikan field tanggal resign, status, dan avatar_url saat tambah baru
            if (tanggalResignGroup) tanggalResignGroup.style.display = 'none';
            if (statusGroup) statusGroup.style.display = 'none';
            if (avatarUrlGroup) avatarUrlGroup.style.display = 'none';
        }
        
        modal.classList.add('active');
    }

    function closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    }

    async function loadKaryawan(id) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch(`/api/hr/karyawan/${id}`, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success) {
                const data = result.data;
                document.getElementById('karyawanId').value = data.id;
                document.getElementById('nama').value = data.nama || '';
                document.getElementById('jenis_kelamin').value = data.jenis_kelamin || '';
                document.getElementById('tanggal_lahir').value = data.tanggal_lahir || '';
                document.getElementById('email').value = data.email || '';
                document.getElementById('notelp').value = data.notelp || '';
                document.getElementById('tanggal_join').value = data.tanggal_join || '';
                document.getElementById('tanggal_resign').value = data.tanggal_resign || '';
                document.getElementById('departemen').value = data.departemen || '';
                document.getElementById('jabatan').value = data.jabatan || '';
                document.getElementById('shift').value = data.shift || '';
                document.getElementById('status_karyawan').value = data.status_karyawan || '';
                document.getElementById('alamat').value = data.alamat || '';
                document.getElementById('avatar_url').value = data.avatar_url || '';
                document.getElementById('status').value = data.status || '1';
            }
        } catch (error) {
            console.error('Error loading karyawan:', error);
        }
    }

    async function saveKaryawan() {
        const id = document.getElementById('karyawanId').value;
        const nama = document.getElementById('nama').value;
        const jenis_kelamin = document.getElementById('jenis_kelamin').value;
        const tanggal_lahir = document.getElementById('tanggal_lahir').value;
        const email = document.getElementById('email').value;
        const notelp = document.getElementById('notelp').value;
        const tanggal_join = document.getElementById('tanggal_join').value;
        const tanggal_resign = document.getElementById('tanggal_resign').value;
        const departemen = document.getElementById('departemen').value;
        const jabatan = document.getElementById('jabatan').value;
        const shift = document.getElementById('shift').value;
        const status_karyawan = document.getElementById('status_karyawan').value;
        const alamat = document.getElementById('alamat').value;
        const avatar_url = document.getElementById('avatar_url').value;
        const status = document.getElementById('status').value;

        if (!nama || !tanggal_join || !jabatan) {
            alert('Nama, Tanggal Join, dan Jabatan harus diisi');
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const url = id ? `/api/hr/karyawan/${id}` : '/api/hr/karyawan';
            const method = id ? 'PUT' : 'POST';

            // Prepare data object
            const data = {
                nama,
                jenis_kelamin: jenis_kelamin || null,
                tanggal_lahir: tanggal_lahir || null,
                email: email || null,
                notelp: notelp || null,
                tanggal_join,
                departemen: departemen || null,
                jabatan: jabatan || null,
                shift: shift || null,
                status_karyawan: status_karyawan || null,
                alamat: alamat || null,
                avatar_url: avatar_url || null
            };

            // Hanya tambahkan tanggal_resign dan status saat edit
            if (id) {
                data.tanggal_resign = tanggal_resign || null;
                data.status = status || '1';
            } else {
                // Saat tambah baru, status default aktif
                data.status = '1';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
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
            console.error('Error saving karyawan:', error);
            alert('Terjadi kesalahan saat menyimpan data');
        }
    }

    async function deleteKaryawan(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus karyawan ini?')) {
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch(`/api/hr/karyawan/${id}`, {
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
            console.error('Error deleting karyawan:', error);
            alert('Terjadi kesalahan saat menghapus data');
        }
    }

    function editKaryawan(id) {
        openModal(id);
    }

    // Event listeners
    document.getElementById('searchInput').addEventListener('input', function(e) {
        searchTerm = e.target.value;
        currentPage = 1;
        loadData(1);
    });

    document.getElementById('filterDepartemen').addEventListener('change', function(e) {
        filterDepartemen = e.target.value;
        currentPage = 1;
        loadData(1);
    });

    document.getElementById('filterStatus').addEventListener('change', function(e) {
        filterStatus = e.target.value;
        currentPage = 1;
        loadData(1);
    });

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        loadDepartemenList();
        loadShiftList();
        loadData();
    });
</script>
@endpush


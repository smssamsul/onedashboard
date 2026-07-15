@extends('layouts.hr')

@section('title', 'Pengajuan Cuti')
@section('page_title', 'Manajemen Pengajuan Cuti')

@push('styles')
<style>
    .action-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
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

    .btn-success {
        background: var(--primary);
        color: white;
    }

    .btn-danger {
        background: var(--primary);
        color: white;
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
    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
        <select class="filter-select" id="filterKaryawan" style="width: 250px; padding: 0.625rem; border: 1px solid var(--border); border-radius: var(--radius-sm);">
            <option value="">Semua Karyawan</option>
        </select>
        <select class="filter-select" id="filterStatus" style="width: 200px; padding: 0.625rem; border: 1px solid var(--border); border-radius: var(--radius-sm);">
            <option value="">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Ditolak</option>
        </select>
    </div>
</div>

<div class="card-table">
    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Karyawan</th>
                    <th>Tanggal Mulai</th>
                    <th>Tanggal Selesai</th>
                    <th>Jumlah Hari</th>
                    <th>Alasan</th>
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
@endsection

@push('scripts')
<script>
    let currentPage = 1;
    let filterKaryawan = '';
    let filterStatus = '';

    async function loadKaryawanList() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch('/api/hr/karyawan?all=true&status=1', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success) {
                const select = document.getElementById('filterKaryawan');
                select.innerHTML = '<option value="">Semua Karyawan</option>' + 
                    result.data.map(k => `<option value="${k.id}">${k.nama}</option>`).join('');
            }
        } catch (error) {
            console.error('Error loading karyawan:', error);
        }
    }

    async function loadData(page = 1) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            let url = `/api/hr/cuti?page=${page}`;
            if (filterKaryawan) {
                url += `&karyawan=${filterKaryawan}`;
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
            const statusClass = item.status === 'pending' ? 'status-pending' : 
                              item.status === 'approved' ? 'status-approved' : 'status-rejected';
            const statusText = item.status === 'pending' ? 'Menunggu' : 
                              item.status === 'approved' ? 'Disetujui' : 'Ditolak';
            
            return `
                <tr>
                    <td>${startNumber + index}</td>
                    <td>${item.karyawan_rel ? item.karyawan_rel.nama : '-'}</td>
                    <td>${item.tanggal_mulai || '-'}</td>
                    <td>${item.tanggal_selesai || '-'}</td>
                    <td>${item.jumlah_hari || '-'} hari</td>
                    <td>${item.alasan || '-'}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        ${item.status === 'pending' ? `
                            <button class="btn btn-success" onclick="approveCuti(${item.id})" style="padding: 0.375rem 0.75rem; font-size: 0.75rem; margin-right: 0.5rem;">Setujui</button>
                            <button class="btn btn-danger" onclick="rejectCuti(${item.id})" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;">Tolak</button>
                        ` : '-'}
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

    async function approveCuti(id) {
        if (!confirm('Apakah Anda yakin ingin menyetujui pengajuan cuti ini?')) {
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch(`/api/hr/cuti/${id}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                loadData(currentPage);
                alert(result.message || 'Pengajuan cuti berhasil disetujui');
            } else {
                alert(result.message || 'Terjadi kesalahan');
            }
        } catch (error) {
            console.error('Error approving cuti:', error);
            alert('Terjadi kesalahan saat menyetujui pengajuan');
        }
    }

    async function rejectCuti(id) {
        const reason = prompt('Masukkan alasan penolakan:');
        if (!reason) {
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch(`/api/hr/cuti/${id}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ alasan: reason })
            });

            const result = await response.json();
            
            if (result.success) {
                loadData(currentPage);
                alert(result.message || 'Pengajuan cuti berhasil ditolak');
            } else {
                alert(result.message || 'Terjadi kesalahan');
            }
        } catch (error) {
            console.error('Error rejecting cuti:', error);
            alert('Terjadi kesalahan saat menolak pengajuan');
        }
    }

    document.getElementById('filterKaryawan').addEventListener('change', function(e) {
        filterKaryawan = e.target.value;
        currentPage = 1;
        loadData(1);
    });

    document.getElementById('filterStatus').addEventListener('change', function(e) {
        filterStatus = e.target.value;
        currentPage = 1;
        loadData(1);
    });

    document.addEventListener('DOMContentLoaded', function() {
        loadKaryawanList().then(() => {
            loadData();
        });
    });
</script>
@endpush


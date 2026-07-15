@extends('layouts.user')

@section('title', 'Absensi')
@section('page_title', 'Absensi Saya')

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

    .image-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 3000;
        cursor: pointer;
    }

    .image-modal-overlay.active {
        display: flex;
    }

    .image-modal-content {
        max-width: 90%;
        max-height: 90vh;
        position: relative;
    }

    .image-modal-content img {
        max-width: 100%;
        max-height: 90vh;
        object-fit: contain;
        border-radius: var(--radius-lg);
    }

    .image-modal-close {
        position: absolute;
        top: -40px;
        right: 0;
        background: rgba(255, 255, 255, 0.9);
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 1.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #000;
    }

    .image-modal-close:hover {
        background: rgba(255, 255, 255, 1);
    }
</style>
@endpush

@section('content')
<div class="action-bar">
    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
        <div style="display: flex; gap: 0.5rem; align-items: center;">
            <label style="font-size: 0.875rem; white-space: nowrap;">Tanggal:</label>
            <input type="date" id="filterTanggal" style="padding: 0.625rem; border: 1px solid var(--border); border-radius: var(--radius-sm);">
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center;">
            <label style="font-size: 0.875rem; white-space: nowrap;">Tanggal Berjangka:</label>
            <input type="date" id="filterTanggalMulai" style="padding: 0.625rem; border: 1px solid var(--border); border-radius: var(--radius-sm);" placeholder="Dari">
            <span style="font-size: 0.875rem;">s/d</span>
            <input type="date" id="filterTanggalAkhir" style="padding: 0.625rem; border: 1px solid var(--border); border-radius: var(--radius-sm);" placeholder="Sampai">
        </div>
    </div>
</div>

<div class="card-table">
    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Tanggal</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Status</th>
                    <th>Foto</th>
                    <th>Lokasi</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem;">Memuat data...</td>
                </tr>
            </tbody>
        </table>
    </div>
    <div class="pagination" id="pagination"></div>
</div>

<!-- Image Modal -->
<div class="image-modal-overlay" id="imageModal" onclick="closeImageModal()">
    <div class="image-modal-content" onclick="event.stopPropagation()">
        <button class="image-modal-close" onclick="closeImageModal()">&times;</button>
        <img id="modalImage" src="" alt="Preview">
    </div>
</div>
@endsection

@push('scripts')
<script>
    let currentPage = 1;
    let filterTanggal = '';
    let filterTanggalMulai = '';
    let filterTanggalAkhir = '';

    // Set default tanggal hari ini
    function setDefaultDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        const filterTanggalEl = document.getElementById('filterTanggal');
        if (filterTanggalEl) {
            filterTanggalEl.value = todayStr;
            filterTanggal = todayStr;
        }
    }

    // Image Modal functions
    function showImageModal(imageSrc) {
        const modal = document.getElementById('imageModal');
        const img = document.getElementById('modalImage');
        img.src = imageSrc;
        modal.classList.add('active');
    }

    function closeImageModal() {
        const modal = document.getElementById('imageModal');
        modal.classList.remove('active');
    }

    // Load absensi data
    async function loadData(page = 1) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            let url = `/api/hr/absensi/by-current-user?page=${page}`;
            // Jika ada filter tanggal berjangka, gunakan itu, jika tidak gunakan filter tanggal tunggal
            if (filterTanggalMulai && filterTanggalAkhir) {
                url += `&tanggal_mulai=${filterTanggalMulai}&tanggal_akhir=${filterTanggalAkhir}`;
            } else if (filterTanggal) {
                url += `&tanggal=${filterTanggal}`;
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
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Tidak ada data</td></tr>';
            return;
        }

        const perPage = pagination ? pagination.per_page : 15;
        const startNumber = pagination ? (pagination.current_page - 1) * perPage + 1 : 1;

        tbody.innerHTML = data.map((item, index) => {
            const photoIn = item.check_in_photo ? `<img src="/storage/${item.check_in_photo}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="showImageModal('/storage/${item.check_in_photo}')">` : '-';
            const photoOut = item.check_out_photo ? `<img src="/storage/${item.check_out_photo}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; cursor: pointer;" onclick="showImageModal('/storage/${item.check_out_photo}')">` : '-';
            const location = item.lat_check_in && item.long_check_in ? 
                `<a href="https://www.google.com/maps?q=${item.lat_check_in},${item.long_check_in}" target="_blank" style="color: var(--accent);">📍 Lihat</a>` : '-';
            
            return `
                <tr>
                    <td>${startNumber + index}</td>
                    <td>${item.tanggal || '-'}</td>
                    <td>${item.check_in || '-'}</td>
                    <td>${item.check_out || '-'}</td>
                    <td><span class="status-badge ${item.status_absensi === 'Hadir' ? 'status-aktif' : ''}">${item.status_absensi || '-'}</span></td>
                    <td>
                        <div style="display: flex; gap: 0.5rem;">
                            ${photoIn}
                            ${photoOut}
                        </div>
                    </td>
                    <td>${location}</td>
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

    // Event listeners
    document.getElementById('filterTanggal').addEventListener('change', function(e) {
        filterTanggal = e.target.value;
        // Reset filter tanggal berjangka jika menggunakan filter tanggal tunggal
        if (filterTanggal) {
            filterTanggalMulai = '';
            filterTanggalAkhir = '';
            document.getElementById('filterTanggalMulai').value = '';
            document.getElementById('filterTanggalAkhir').value = '';
        }
        currentPage = 1;
        loadData(1);
    });

    document.getElementById('filterTanggalMulai').addEventListener('change', function(e) {
        filterTanggalMulai = e.target.value;
        // Reset filter tanggal tunggal jika menggunakan filter tanggal berjangka
        if (filterTanggalMulai || filterTanggalAkhir) {
            filterTanggal = '';
            document.getElementById('filterTanggal').value = '';
        }
        currentPage = 1;
        loadData(1);
    });

    document.getElementById('filterTanggalAkhir').addEventListener('change', function(e) {
        filterTanggalAkhir = e.target.value;
        // Reset filter tanggal tunggal jika menggunakan filter tanggal berjangka
        if (filterTanggalMulai || filterTanggalAkhir) {
            filterTanggal = '';
            document.getElementById('filterTanggal').value = '';
        }
        currentPage = 1;
        loadData(1);
    });

    // Close image modal on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeImageModal();
        }
    });

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        setDefaultDate();
        loadData();
        initCheckIn();
    });
</script>

@include('hr.checkin-component')
@endpush


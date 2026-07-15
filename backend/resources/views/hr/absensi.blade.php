@extends('layouts.hr')

@section('title', 'Absensi')
@section('page_title', 'Manajemen Absensi')

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

    .btn-success:hover {
        background: var(--primary-dark);
    }

    .btn-danger {
        background: var(--primary);
        color: white;
    }

    .btn-danger:hover {
        background: var(--primary-dark);
    }

    .camera-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        flex-direction: column;
        gap: 1rem;
    }

    .camera-container.active {
        display: flex;
    }

    .camera-preview {
        max-width: 90%;
        max-height: 70vh;
        border-radius: var(--radius-lg);
        border: 3px solid white;
        position: relative;
    }
    
    #overlayCanvas {
        border-radius: var(--radius-lg);
    }

    .camera-controls {
        display: flex;
        gap: 1rem;
        align-items: center;
    }

    .camera-btn {
        padding: 1rem 2rem;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        font-size: 1.5rem;
        width: 80px;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .camera-btn.capture {
        background: var(--primary);
        color: white;
    }

    .camera-btn.cancel {
        background: var(--primary);
        color: white;
    }

    .photo-preview {
        width: 150px;
        height: 150px;
        object-fit: cover;
        border-radius: var(--radius-sm);
        border: 2px solid var(--border);
    }

    .location-status {
        padding: 0.5rem 1rem;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        margin-top: 0.5rem;
    }

    .location-valid {
        background: #D1FAE5;
        color: #059669;
    }

    .location-invalid {
        background: #FEE2E2;
        color: #DC2626;
    }

    .location-loading {
        background: #FEF3C7;
        color: #D97706;
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

    #exportDropdown button:hover {
        background: var(--primary-light);
    }
</style>
@endpush

@section('content')
<div class="action-bar">
    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
        <select class="filter-select" id="filterKaryawan" style="width: 250px; padding: 0.625rem; border: 1px solid var(--border); border-radius: var(--radius-sm);">
            <option value="">Semua Karyawan</option>
        </select>
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
    <div style="position: relative; display: inline-block;">
        <button class="btn btn-primary" onclick="toggleExportDropdown()" style="background: var(--primary);">Export</button>
        <div id="exportDropdown" style="display: none; position: absolute; top: 100%; left: 0; margin-top: 0.25rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 1000; min-width: 150px;">
            <button onclick="exportData('excel'); closeExportDropdown();" style="width: 100%; padding: 0.625rem 1rem; text-align: left; background: none; border: none; cursor: pointer; font-size: 0.875rem; border-bottom: 1px solid var(--border);">Excel</button>
            <button onclick="exportData('pdf'); closeExportDropdown();" style="width: 100%; padding: 0.625rem 1rem; text-align: left; background: none; border: none; cursor: pointer; font-size: 0.875rem; border-bottom: 1px solid var(--border);">PDF</button>
            <button onclick="exportData('csv'); closeExportDropdown();" style="width: 100%; padding: 0.625rem 1rem; text-align: left; background: none; border: none; cursor: pointer; font-size: 0.875rem;">CSV</button>
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
                    <th>Karyawan</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Status</th>
                    <th>Foto</th>
                    <th>Lokasi</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <tr>
                    <td colspan="9" style="text-align: center; padding: 2rem;">Memuat data...</td>
                </tr>
            </tbody>
        </table>
    </div>
    <div class="pagination" id="pagination"></div>
</div>

<!-- Camera Modal -->
<div class="camera-container" id="cameraContainer">
    <div style="position: relative; display: inline-block;">
        <video id="video" class="camera-preview" autoplay playsinline></video>
        <canvas id="overlayCanvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; border-radius: var(--radius-lg);"></canvas>
    </div>
    <canvas id="canvas" style="display: none;"></canvas>
    <canvas id="watermarkCanvas" style="display: none;"></canvas>
    <div class="camera-controls">
        <button class="camera-btn cancel" onclick="closeCamera()">✕</button>
        <button class="camera-btn capture" onclick="capturePhoto()">📷</button>
    </div>
</div>

<!-- Check In Modal -->
<div class="modal-overlay" id="checkInModal" onclick="closeCheckInModal()">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h3>Check In Absensi</h3>
            <button onclick="closeCheckInModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
        </div>
        <div class="modal-body">
            <form id="checkInForm">
                <div class="form-group">
                    <label>Karyawan *</label>
                    <select id="checkInKaryawan" required>
                        <option value="">Pilih Karyawan</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Foto Selfie *</label>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <button type="button" class="btn btn-primary" onclick="openCamera('checkIn')">Ambil Foto</button>
                        <img id="checkInPhotoPreview" class="photo-preview" style="display: none;">
                        <input type="file" id="checkInPhotoFile" accept="image/*" capture="user" style="display: none;" onchange="handlePhotoSelect(event, 'checkIn')">
                    </div>
                </div>
                <div class="form-group">
                    <label>Lokasi</label>
                    <div id="checkInLocationStatus" class="location-status" style="display: none;"></div>
                    <input type="hidden" id="checkInLat">
                    <input type="hidden" id="checkInLong">
                    <small style="display: block; margin-top: 0.5rem; color: #666; font-size: 0.75rem;">Lokasi akan otomatis diambil saat mengambil foto.</small>
                </div>
                <div class="form-group">
                    <label>Catatan</label>
                    <textarea id="checkInNotes" rows="3"></textarea>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn" onclick="closeCheckInModal()" style="background: var(--surface); border: 1px solid var(--border);">Batal</button>
            <button class="btn btn-success" onclick="submitCheckIn()">Check In</button>
        </div>
    </div>
</div>

<!-- Check Out Modal -->
<div class="modal-overlay" id="checkOutModal" onclick="closeCheckOutModal()">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h3>Check Out Absensi</h3>
            <button onclick="closeCheckOutModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
        </div>
        <div class="modal-body">
            <form id="checkOutForm">
                <input type="hidden" id="checkOutAbsensiId">
                <div class="form-group">
                    <label>Foto Selfie *</label>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <button type="button" class="btn btn-primary" onclick="openCamera('checkOut')">Ambil Foto</button>
                        <img id="checkOutPhotoPreview" class="photo-preview" style="display: none;">
                        <input type="file" id="checkOutPhotoFile" accept="image/*" capture="user" style="display: none;" onchange="handlePhotoSelect(event, 'checkOut')">
                    </div>
                </div>
                <div class="form-group">
                    <label>Lokasi</label>
                    <div id="checkOutLocationStatus" class="location-status" style="display: none;"></div>
                    <input type="hidden" id="checkOutLat">
                    <input type="hidden" id="checkOutLong">
                    <small style="display: block; margin-top: 0.5rem; color: #666; font-size: 0.75rem;">Lokasi akan otomatis diambil saat mengambil foto.</small>
                </div>
                <div class="form-group">
                    <label>Catatan</label>
                    <textarea id="checkOutNotes" rows="3"></textarea>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn" onclick="closeCheckOutModal()" style="background: var(--surface); border: 1px solid var(--border);">Batal</button>
            <button class="btn btn-danger" onclick="submitCheckOut()">Check Out</button>
        </div>
    </div>
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
    let filterKaryawan = '';
    let filterTanggal = '';
    let filterTanggalMulai = '';
    let filterTanggalAkhir = '';
    let currentStream = null;
    let currentPhotoType = '';
    let currentPhoto = null;
    let karyawanList = [];
    let currentCheckOutKaryawan = null;
    let overlayInterval = null;

    // Export dropdown functions
    function toggleExportDropdown() {
        const dropdown = document.getElementById('exportDropdown');
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        }
    }

    function closeExportDropdown() {
        const dropdown = document.getElementById('exportDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('exportDropdown');
        if (dropdown) {
            const button = event.target.closest('button[onclick="toggleExportDropdown()"]');
            const isClickInside = dropdown.contains(event.target);
            if (!button && !isClickInside) {
                closeExportDropdown();
            }
        }
    });

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

    // Export functions
    async function exportData(format) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            let url = `/api/hr/absensi/export?format=${format}`;
            if (filterKaryawan) {
                url += `&karyawan=${filterKaryawan}`;
            }
            // Jika ada filter tanggal berjangka, gunakan itu, jika tidak gunakan filter tanggal tunggal
            if (filterTanggalMulai && filterTanggalAkhir) {
                url += `&tanggal_mulai=${filterTanggalMulai}&tanggal_akhir=${filterTanggalAkhir}`;
            } else if (filterTanggal) {
                url += `&tanggal=${filterTanggal}`;
            }

            // Add authorization header via fetch and create blob
            const response = await fetch(url, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': format === 'pdf' ? 'application/pdf' : format === 'excel' || format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
                }
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                const error = await response.json();
                alert(error.message || 'Terjadi kesalahan saat mengekspor data');
                return;
            }

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            // Create a temporary link to trigger download
            const link = document.createElement('a');
            link.href = blobUrl;
            
            let filename = `absensi_${filterTanggal || 'all'}`;
            if (format === 'pdf') {
                link.download = filename + '.pdf';
            } else if (format === 'excel' || format === 'xlsx') {
                link.download = filename + '.xlsx';
            } else if (format === 'csv') {
                link.download = filename + '.csv';
            }
            
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up blob URL
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Terjadi kesalahan saat mengekspor data');
        }
    }

    // Load karyawan list
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
                karyawanList = result.data;
                const select = document.getElementById('checkInKaryawan');
                const filterSelect = document.getElementById('filterKaryawan');
                
                const options = '<option value="">Pilih Karyawan</option>' + 
                    karyawanList.map(k => `<option value="${k.id}">${k.nama}</option>`).join('');
                
                select.innerHTML = options;
                filterSelect.innerHTML = '<option value="">Semua Karyawan</option>' + 
                    karyawanList.map(k => `<option value="${k.id}">${k.nama}</option>`).join('');
            }
            return Promise.resolve();
        } catch (error) {
            console.error('Error loading karyawan:', error);
            return Promise.reject(error);
        }
    }

    // Load absensi data
    async function loadData(page = 1) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            let url = `/api/hr/absensi?page=${page}`;
            if (filterKaryawan) {
                url += `&karyawan=${filterKaryawan}`;
            }
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
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem;">Tidak ada data</td></tr>';
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
                    <td>${item.karyawan_rel ? item.karyawan_rel.nama : '-'}</td>
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
                    <td>
                        ${!item.check_out ? `<button class="btn" onclick="openCheckOutModal(${item.id}, ${item.karyawan})" style="background: var(--primary); color: white; padding: 0.375rem 0.75rem; font-size: 0.75rem;">Check Out</button>` : ''}
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

    // Camera functions
    function openCamera(type) {
        currentPhotoType = type;
        const video = document.getElementById('video');
        const container = document.getElementById('cameraContainer');
        
        // Otomatis ambil lokasi saat membuka kamera
        getCurrentLocationSilent(type);
        
        container.classList.add('active');
        
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
            .then(stream => {
                currentStream = stream;
                video.srcObject = stream;
                
                // Start drawing overlay when video is ready
                video.onloadedmetadata = () => {
                    startOverlayDrawing();
                };
            })
            .catch(err => {
                console.error('Error accessing camera:', err);
                alert('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.');
                closeCamera();
            });
    }

    function closeCamera() {
        const container = document.getElementById('cameraContainer');
        const video = document.getElementById('video');
        
        // Stop overlay drawing
        if (overlayInterval) {
            clearInterval(overlayInterval);
            overlayInterval = null;
        }
        
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
        
        if (video.srcObject) {
            video.srcObject = null;
        }
        
        container.classList.remove('active');
    }

    function startOverlayDrawing() {
        const video = document.getElementById('video');
        const overlayCanvas = document.getElementById('overlayCanvas');
        
        if (!overlayCanvas || !video) return;
        
        // Stop previous interval if exists
        if (overlayInterval) {
            clearInterval(overlayInterval);
        }
        
        // Set canvas size to match video
        const updateCanvasSize = () => {
            const rect = video.getBoundingClientRect();
            overlayCanvas.width = video.videoWidth || rect.width;
            overlayCanvas.height = video.videoHeight || rect.height;
        };
        
        // Wait for video to be ready
        const initOverlay = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                updateCanvasSize();
            } else {
                // Retry after a short delay
                setTimeout(initOverlay, 100);
                return;
            }
        };
        
        initOverlay();
        
        // Update canvas size when video dimensions change
        video.addEventListener('resize', updateCanvasSize);
        
        // Draw overlay continuously
        const drawOverlay = () => {
            if (!overlayCanvas || overlayCanvas.width === 0 || overlayCanvas.height === 0) {
                return;
            }
            
            const ctx = overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            
            // Get watermark data
            let namaKaryawan = '';
            let lat = '';
            let long = '';
            
            if (currentPhotoType === 'checkIn') {
                const karyawanId = document.getElementById('checkInKaryawan')?.value;
                const selectedKaryawan = karyawanList.find(k => k.id == karyawanId);
                namaKaryawan = selectedKaryawan ? selectedKaryawan.nama : '';
                lat = document.getElementById('checkInLat')?.value || '';
                long = document.getElementById('checkInLong')?.value || '';
            } else if (currentPhotoType === 'checkOut') {
                namaKaryawan = currentCheckOutKaryawan ? currentCheckOutKaryawan.nama : '';
                lat = document.getElementById('checkOutLat')?.value || '';
                long = document.getElementById('checkOutLong')?.value || '';
            }
            
            // Prepare watermark text
            const timestamp = new Date().toLocaleString('id-ID', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const watermarkText = [
                namaKaryawan ? namaKaryawan.replace(/\s+/g, '_') : 'Unknown',
                `${lat || '-'}, ${long || '-'}`,
                timestamp,
                "One Dashboard - Ternak Properti"
            ];
            
            // Watermark style
            const padding = 15;
            const fontSize = Math.max(14, overlayCanvas.width / 30);
            const lineHeight = fontSize * 1.3;
            const textX = padding;
            const textY = overlayCanvas.height - (watermarkText.length * lineHeight) - padding;
            
            // Draw semi-transparent background for watermark
            const textWidth = Math.max(
                ...watermarkText.map(text => ctx.measureText(text).width)
            ) + (padding * 2);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(
                textX - padding,
                textY - padding,
                textWidth,
                (watermarkText.length * lineHeight) + (padding * 2)
            );
            
            // Draw watermark text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            watermarkText.forEach((text, index) => {
                ctx.fillText(text, textX, textY + (index * lineHeight));
            });
        };
        
        // Draw immediately
        drawOverlay();
        
        // Update every 100ms to refresh timestamp
        overlayInterval = setInterval(drawOverlay, 100);
    }

    function capturePhoto() {
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        // Get watermark data
        let namaKaryawan = '';
        let lat = '';
        let long = '';
        
        if (currentPhotoType === 'checkIn') {
            const karyawanId = document.getElementById('checkInKaryawan').value;
            const selectedKaryawan = karyawanList.find(k => k.id == karyawanId);
            namaKaryawan = selectedKaryawan ? selectedKaryawan.nama : '';
            lat = document.getElementById('checkInLat').value;
            long = document.getElementById('checkInLong').value;
        } else {
            // For check out, get karyawan name from stored data
            namaKaryawan = currentCheckOutKaryawan ? currentCheckOutKaryawan.nama : '';
            lat = document.getElementById('checkOutLat').value;
            long = document.getElementById('checkOutLong').value;
        }
        
        // Add watermark to photo
        addWatermarkToPhoto(canvas, namaKaryawan, lat, long).then(watermarkedBlob => {
            const file = new File([watermarkedBlob], 'photo.jpg', { type: 'image/jpeg' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            if (currentPhotoType === 'checkIn') {
                document.getElementById('checkInPhotoFile').files = dataTransfer.files;
                handlePhotoSelect({ target: { files: dataTransfer.files } }, 'checkIn');
            } else {
                document.getElementById('checkOutPhotoFile').files = dataTransfer.files;
                handlePhotoSelect({ target: { files: dataTransfer.files } }, 'checkOut');
            }
            
            closeCamera();
        });
    }

    async function addWatermarkToPhoto(sourceCanvas, namaKaryawan, lat, long) {
        return new Promise((resolve) => {
            const watermarkCanvas = document.getElementById('watermarkCanvas');
            const ctx = watermarkCanvas.getContext('2d');
            
            // Set canvas size same as source
            watermarkCanvas.width = sourceCanvas.width;
            watermarkCanvas.height = sourceCanvas.height;
            
            // Draw original image
            ctx.drawImage(sourceCanvas, 0, 0);
            
            // Prepare watermark text
            const timestamp = new Date().toLocaleString('id-ID', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const watermarkText = [
                namaKaryawan || 'Unknown',
                `${lat || '-'}, ${long || '-'}`,
                timestamp
            ];
            
            // Replace spaces with underscores for nama_karyawan
            if (watermarkText[0] !== 'Unknown') {
                watermarkText[0] = watermarkText[0].replace(/\s+/g, '_');
            }
            
            // Watermark style
            const padding = 15;
            const fontSize = Math.max(14, sourceCanvas.width / 30);
            const lineHeight = fontSize * 1.3;
            const textX = padding;
            const textY = watermarkCanvas.height - (watermarkText.length * lineHeight) - padding;
            
            // Draw semi-transparent background for watermark
            const textWidth = Math.max(
                ...watermarkText.map(text => ctx.measureText(text).width)
            ) + (padding * 2);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(
                textX - padding,
                textY - padding,
                textWidth,
                (watermarkText.length * lineHeight) + (padding * 2)
            );
            
            // Draw watermark text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            watermarkText.forEach((text, index) => {
                ctx.fillText(text, textX, textY + (index * lineHeight));
            });
            
            // Convert to blob
            watermarkCanvas.toBlob(resolve, 'image/jpeg', 0.9);
        });
    }

    function handlePhotoSelect(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if (type === 'checkIn') {
                document.getElementById('checkInPhotoPreview').src = e.target.result;
                document.getElementById('checkInPhotoPreview').style.display = 'block';
                currentPhoto = file;
            } else {
                document.getElementById('checkOutPhotoPreview').src = e.target.result;
                document.getElementById('checkOutPhotoPreview').style.display = 'block';
                currentPhoto = file;
            }
        };
        reader.readAsDataURL(file);
    }

    // Location functions - Silent version untuk otomatis saat buka kamera
    function getCurrentLocationSilent(type) {
        const statusEl = type === 'checkIn' ? 
            document.getElementById('checkInLocationStatus') : 
            document.getElementById('checkOutLocationStatus');
        
        if (!navigator.geolocation) {
            return;
        }
        
        // Ambil lokasi dengan timeout lebih pendek dan tanpa high accuracy untuk lebih cepat
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                if (type === 'checkIn') {
                    document.getElementById('checkInLat').value = lat;
                    document.getElementById('checkInLong').value = lng;
                } else {
                    document.getElementById('checkOutLat').value = lat;
                    document.getElementById('checkOutLong').value = lng;
                }
                
                // Update status dengan pesan singkat
                statusEl.style.display = 'block';
                statusEl.className = 'location-status location-valid';
                statusEl.innerHTML = `Lokasi berhasil diambil (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
                
                // Update overlay if camera is active
                if (overlayInterval) {
                    startOverlayDrawing();
                }
            },
            (error) => {
                // Jika gagal, tidak tampilkan error (silent fail)
                // Lokasi akan tetap kosong dan user bisa lanjut tanpa lokasi
                statusEl.style.display = 'none';
            },
            {
                enableHighAccuracy: false, // Lebih cepat tanpa high accuracy
                timeout: 15000, // 15 detik
                maximumAge: 60000 // Boleh gunakan cache sampai 1 menit
            }
        );
    }

    // Location functions
    function getCurrentLocation(type, retryCount = 0) {
        const statusEl = type === 'checkIn' ? 
            document.getElementById('checkInLocationStatus') : 
            document.getElementById('checkOutLocationStatus');
        
        statusEl.style.display = 'block';
        statusEl.className = 'location-status location-loading';
        statusEl.innerHTML = 'Mengambil lokasi...' + (retryCount > 0 ? ` (Percobaan ${retryCount + 1})` : '');
        
        if (!navigator.geolocation) {
            statusEl.className = 'location-status location-invalid';
            statusEl.innerHTML = 'Geolocation tidak didukung oleh browser. <button onclick="skipLocation(\'' + type + '\')" style="margin-left: 10px; padding: 4px 8px; background: #EF4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Lewati</button>';
            return;
        }
        
        // Options untuk geolocation
        // Coba dengan high accuracy dulu, jika timeout coba lagi tanpa high accuracy
        const options = retryCount === 0 ? {
            enableHighAccuracy: true,
            timeout: 30000, // 30 detik
            maximumAge: 0 // Jangan gunakan cache
        } : {
            enableHighAccuracy: false, // Retry tanpa high accuracy
            timeout: 20000, // 20 detik
            maximumAge: 60000 // Boleh gunakan cache sampai 1 menit
        };
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                if (type === 'checkIn') {
                    document.getElementById('checkInLat').value = lat;
                    document.getElementById('checkInLong').value = lng;
                } else {
                    document.getElementById('checkOutLat').value = lat;
                    document.getElementById('checkOutLong').value = lng;
                }
                
                // Validate location
                try {
                    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
                    const response = await fetch('/api/hr/setting', {
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Accept': 'application/json'
                        }
                    });
                    
                    const result = await response.json();
                    statusEl.className = 'location-status location-valid';
                    statusEl.innerHTML = `Lokasi berhasil diambil (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
                    
                    // Update overlay if camera is active
                    if (overlayInterval) {
                        startOverlayDrawing();
                    }
                } catch (error) {
                    statusEl.className = 'location-status location-valid';
                    statusEl.innerHTML = `Lokasi berhasil diambil (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
                    
                    // Update overlay if camera is active
                    if (overlayInterval) {
                        startOverlayDrawing();
                    }
                }
            },
            (error) => {
                let errorMessage = '';
                let canRetry = false;
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan browser.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Informasi lokasi tidak tersedia.';
                        canRetry = retryCount < 2;
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Timeout mengambil lokasi.';
                        canRetry = retryCount < 2;
                        break;
                    default:
                        errorMessage = 'Terjadi kesalahan: ' + error.message;
                        canRetry = retryCount < 2;
                        break;
                }
                
                if (canRetry) {
                    statusEl.className = 'location-status location-loading';
                    statusEl.innerHTML = errorMessage + ' <button onclick="getCurrentLocation(\'' + type + '\', ' + (retryCount + 1) + ')" style="margin-left: 10px; padding: 4px 8px; background: #3B82F6; color: white; border: none; border-radius: 4px; cursor: pointer;">Coba Lagi</button> <button onclick="skipLocation(\'' + type + '\')" style="margin-left: 5px; padding: 4px 8px; background: #EF4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Lewati</button>';
                } else {
                    statusEl.className = 'location-status location-invalid';
                    statusEl.innerHTML = errorMessage + ' <button onclick="skipLocation(\'' + type + '\')" style="margin-left: 10px; padding: 4px 8px; background: #EF4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Lewati Lokasi</button>';
                }
            },
            options
        );
    }

    // Skip location function
    function skipLocation(type) {
        const statusEl = type === 'checkIn' ? 
            document.getElementById('checkInLocationStatus') : 
            document.getElementById('checkOutLocationStatus');
        
        if (type === 'checkIn') {
            document.getElementById('checkInLat').value = '';
            document.getElementById('checkInLong').value = '';
        } else {
            document.getElementById('checkOutLat').value = '';
            document.getElementById('checkOutLong').value = '';
        }
        
        statusEl.className = 'location-status location-invalid';
        statusEl.innerHTML = 'Lokasi dilewati. Anda tetap bisa melanjutkan tanpa lokasi.';
        
        // Update overlay if camera is active
        if (overlayInterval) {
            startOverlayDrawing();
        }
    }

    // Check In functions
    function openCheckInModal() {
        document.getElementById('checkInModal').classList.add('active');
        resetCheckInForm();
    }

    function closeCheckInModal() {
        document.getElementById('checkInModal').classList.remove('active');
        resetCheckInForm();
    }

    function resetCheckInForm() {
        document.getElementById('checkInForm').reset();
        document.getElementById('checkInPhotoPreview').style.display = 'none';
        document.getElementById('checkInLocationStatus').style.display = 'none';
        currentPhoto = null;
    }

    async function submitCheckIn() {
        const karyawan = document.getElementById('checkInKaryawan').value;
        const lat = document.getElementById('checkInLat').value;
        const long = document.getElementById('checkInLong').value;
        const notes = document.getElementById('checkInNotes').value;
        
        if (!karyawan) {
            alert('Pilih karyawan terlebih dahulu');
            return;
        }
        
        if (!currentPhoto) {
            alert('Ambil foto selfie terlebih dahulu');
            return;
        }
        
        // Lokasi sekarang WAJIB
        if (!lat || !long) {
            alert('Lokasi wajib diisi untuk melakukan check in. Pastikan GPS/lokasi sudah diaktifkan dan coba ambil foto lagi.');
            return;
        }
        
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const formData = new FormData();
            formData.append('karyawan', karyawan);
            formData.append('check_in_photo', currentPhoto);
            formData.append('lat_check_in', lat);
            formData.append('long_check_in', long);
            if (notes) formData.append('notes', notes);
            
            const response = await fetch('/api/hr/absensi/check-in', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                closeCheckInModal();
                loadData(currentPage);
                alert(result.message);
            } else {
                alert(result.message || 'Terjadi kesalahan');
            }
        } catch (error) {
            console.error('Error submitting check in:', error);
            alert('Terjadi kesalahan saat menyimpan data');
        }
    }

    // Check Out functions
    function openCheckOutModal(id, karyawanId) {
        document.getElementById('checkOutAbsensiId').value = id;
        
        // Get karyawan data
        if (karyawanId) {
            currentCheckOutKaryawan = karyawanList.find(k => k.id == karyawanId);
        }
        
        document.getElementById('checkOutModal').classList.add('active');
        resetCheckOutForm();
    }

    function closeCheckOutModal() {
        document.getElementById('checkOutModal').classList.remove('active');
        resetCheckOutForm();
    }

    function resetCheckOutForm() {
        document.getElementById('checkOutForm').reset();
        document.getElementById('checkOutPhotoPreview').style.display = 'none';
        document.getElementById('checkOutLocationStatus').style.display = 'none';
        currentPhoto = null;
        currentCheckOutKaryawan = null;
    }

    async function submitCheckOut() {
        const absensiId = document.getElementById('checkOutAbsensiId').value;
        const lat = document.getElementById('checkOutLat').value;
        const long = document.getElementById('checkOutLong').value;
        const notes = document.getElementById('checkOutNotes').value;
        
        if (!currentPhoto) {
            alert('Ambil foto selfie terlebih dahulu');
            return;
        }
        
        if (!lat || !long) {
            const confirmSkip = confirm('Lokasi belum berhasil diambil secara otomatis. Apakah Anda ingin melanjutkan tanpa lokasi?');
            if (!confirmSkip) {
                return;
            }
        }
        
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const formData = new FormData();
            formData.append('check_out_photo', currentPhoto);
            formData.append('lat_check_out', lat);
            formData.append('long_check_out', long);
            if (notes) formData.append('notes', notes);
            
            const response = await fetch(`/api/hr/absensi/${absensiId}/check-out`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                closeCheckOutModal();
                loadData(currentPage);
                alert(result.message);
            } else {
                alert(result.message || 'Terjadi kesalahan');
            }
        } catch (error) {
            console.error('Error submitting check out:', error);
            alert('Terjadi kesalahan saat menyimpan data');
        }
    }

    // Event listeners
    document.getElementById('filterKaryawan').addEventListener('change', function(e) {
        filterKaryawan = e.target.value;
        currentPage = 1;
        loadData(1);
    });

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
        loadKaryawanList().then(() => {
            // Load data setelah karyawan list selesai dimuat
            loadData();
        });
    });
</script>
@endpush

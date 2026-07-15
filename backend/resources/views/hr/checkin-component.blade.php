@push('styles')
<style>
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

    .btn-success {
        background: var(--primary);
        color: white;
    }
</style>
@endpush

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
                <input type="hidden" id="checkInKaryawan">
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
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn" onclick="closeCheckOutModal()" style="background: var(--surface); border: 1px solid var(--border);">Batal</button>
            <button class="btn btn-success" onclick="submitCheckOut()">Check Out</button>
        </div>
    </div>
</div>

@push('scripts')
<script>
    // Check In Variables (isolated untuk avoid conflict)
    let checkInStream = null;
    let checkInPhotoType = '';
    let checkInPhoto = null;
    let checkInKaryawanId = null;
    let checkInKaryawanNama = '';
    let checkInOverlayInterval = null;

    // Initialize Check In
    function initCheckIn() {
        // Tidak perlu load karyawan list, akan diambil saat open modal
    }

    // Get karyawan by current user
    async function getCurrentUserKaryawan() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch('/api/hr/karyawan/by-current-user', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success && result.data) {
                checkInKaryawanId = result.data.id;
                checkInKaryawanNama = result.data.nama;
                const karyawanInput = document.getElementById('checkInKaryawan');
                if (karyawanInput) {
                    karyawanInput.value = checkInKaryawanId;
                }
                return true;
            } else {
                alert('Karyawan tidak ditemukan untuk akun Anda. Silakan hubungi admin.');
                return false;
            }
        } catch (error) {
            console.error('Error loading karyawan:', error);
            alert('Gagal memuat data karyawan. Silakan coba lagi.');
            return false;
        }
    }

    // Camera functions
    function openCamera(type) {
        checkInPhotoType = type;
        const video = document.getElementById('video');
        const container = document.getElementById('cameraContainer');
        
        // Otomatis ambil lokasi saat membuka kamera
        if (type === 'checkIn') {
            getCheckInLocationSilent(type);
        } else if (type === 'checkOut') {
            getCheckOutLocationSilent();
        }
        
        container.classList.add('active');
        
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
            .then(stream => {
                if (type === 'checkIn') {
                    checkInStream = stream;
                } else if (type === 'checkOut') {
                    checkOutStream = stream;
                }
                video.srcObject = stream;
                
                // Start drawing overlay when video is ready
                video.onloadedmetadata = () => {
                    if (type === 'checkIn') {
                        startCheckInOverlayDrawing();
                    } else if (type === 'checkOut') {
                        startCheckOutOverlayDrawing();
                    }
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
        if (checkInOverlayInterval) {
            clearInterval(checkInOverlayInterval);
            checkInOverlayInterval = null;
        }
        if (checkOutOverlayInterval) {
            clearInterval(checkOutOverlayInterval);
            checkOutOverlayInterval = null;
        }
        
        if (checkInStream) {
            checkInStream.getTracks().forEach(track => track.stop());
            checkInStream = null;
        }
        if (checkOutStream) {
            checkOutStream.getTracks().forEach(track => track.stop());
            checkOutStream = null;
        }
        
        if (video.srcObject) {
            video.srcObject = null;
        }
        
        container.classList.remove('active');
    }

    function startCheckInOverlayDrawing() {
        const video = document.getElementById('video');
        const overlayCanvas = document.getElementById('overlayCanvas');
        
        if (!overlayCanvas || !video) return;
        
        // Stop previous interval if exists
        if (checkInOverlayInterval) {
            clearInterval(checkInOverlayInterval);
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
                setTimeout(initOverlay, 100);
                return;
            }
        };
        
        initOverlay();
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
            
            if (checkInPhotoType === 'checkIn') {
                namaKaryawan = checkInKaryawanNama || '';
                lat = document.getElementById('checkInLat')?.value || '';
                long = document.getElementById('checkInLong')?.value || '';
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
        
        drawOverlay();
        checkInOverlayInterval = setInterval(drawOverlay, 100);
    }

    function capturePhoto() {
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        // Get watermark data - GUNAKAN LOKASI YANG SAMA DENGAN YANG DITAMPILKAN DI UI
        let namaKaryawan = '';
        let lat = '';
        let long = '';
        
        if (checkInPhotoType === 'checkIn') {
            namaKaryawan = checkInKaryawanNama || '';
            // Ambil dari input field yang sudah diisi oleh getCheckInLocationSilent
            lat = document.getElementById('checkInLat')?.value || '';
            long = document.getElementById('checkInLong')?.value || '';
            
            // Pastikan menggunakan lokasi yang sama dengan yang ditampilkan di UI
            console.log('Check In - Lokasi untuk watermark:', lat, long);
        } else if (checkInPhotoType === 'checkOut') {
            namaKaryawan = checkOutKaryawanNama || '';
            // Ambil dari input field yang sudah diisi oleh getCheckOutLocationSilent
            lat = document.getElementById('checkOutLat')?.value || '';
            long = document.getElementById('checkOutLong')?.value || '';
            
            // Pastikan menggunakan lokasi yang sama dengan yang ditampilkan di UI
            console.log('Check Out - Lokasi untuk watermark:', lat, long);
        }
        
        // Add watermark to photo dengan lokasi yang sama dengan yang ditampilkan di UI
        addCheckInWatermarkToPhoto(canvas, namaKaryawan, lat, long).then(watermarkedBlob => {
            const file = new File([watermarkedBlob], 'photo.jpg', { type: 'image/jpeg' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            if (checkInPhotoType === 'checkIn') {
                document.getElementById('checkInPhotoFile').files = dataTransfer.files;
                handlePhotoSelect({ target: { files: dataTransfer.files } }, 'checkIn');
            } else if (checkInPhotoType === 'checkOut') {
                document.getElementById('checkOutPhotoFile').files = dataTransfer.files;
                handlePhotoSelect({ target: { files: dataTransfer.files } }, 'checkOut');
            }
            
            closeCamera();
        });
    }

    async function addCheckInWatermarkToPhoto(sourceCanvas, namaKaryawan, lat, long) {
        return new Promise((resolve) => {
            const watermarkCanvas = document.getElementById('watermarkCanvas');
            const ctx = watermarkCanvas.getContext('2d');
            
            watermarkCanvas.width = sourceCanvas.width;
            watermarkCanvas.height = sourceCanvas.height;
            
            ctx.drawImage(sourceCanvas, 0, 0);
            
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
                timestamp,
                "One Dashboard - Ternak Properti"
            ];
            
            if (watermarkText[0] !== 'Unknown') {
                watermarkText[0] = watermarkText[0].replace(/\s+/g, '_');
            }
            
            const padding = 15;
            const fontSize = Math.max(14, sourceCanvas.width / 30);
            const lineHeight = fontSize * 1.3;
            const textX = padding;
            const textY = watermarkCanvas.height - (watermarkText.length * lineHeight) - padding;
            
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
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            watermarkText.forEach((text, index) => {
                ctx.fillText(text, textX, textY + (index * lineHeight));
            });
            
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
                checkInPhoto = file;
            } else if (type === 'checkOut') {
                document.getElementById('checkOutPhotoPreview').src = e.target.result;
                document.getElementById('checkOutPhotoPreview').style.display = 'block';
                checkOutPhoto = file;
            }
        };
        reader.readAsDataURL(file);
    }

    // Location functions - Silent version
    function getCheckInLocationSilent(type) {
        const statusEl = document.getElementById('checkInLocationStatus');
        
        if (!navigator.geolocation || !statusEl) {
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Simpan lokasi ke input field - INI YANG AKAN DIGUNAKAN UNTUK WATERMARK DAN SUBMIT
                document.getElementById('checkInLat').value = lat;
                document.getElementById('checkInLong').value = lng;
                
                // Tampilkan lokasi yang sama di UI
                statusEl.style.display = 'block';
                statusEl.className = 'location-status location-valid';
                statusEl.innerHTML = `Lokasi berhasil diambil (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
                
                // Debug: pastikan lokasi yang disimpan sama dengan yang ditampilkan
                console.log('Lokasi Check In disimpan:', lat, lng);
                
                if (checkInOverlayInterval) {
                    startCheckInOverlayDrawing();
                }
            },
            (error) => {
                statusEl.style.display = 'none';
                console.error('Error getting location:', error);
            },
            {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 60000
            }
        );
    }

    // Check In functions
    async function openCheckInModal() {
        // Ambil karyawan ID dari user yang login
        const karyawanLoaded = await getCurrentUserKaryawan();
        if (!karyawanLoaded) {
            return;
        }

        const modal = document.getElementById('checkInModal');
        if (modal) {
            modal.classList.add('active');
            resetCheckInForm();
        }
    }

    function closeCheckInModal() {
        const modal = document.getElementById('checkInModal');
        if (modal) {
            modal.classList.remove('active');
            resetCheckInForm();
        }
    }

    function resetCheckInForm() {
        const form = document.getElementById('checkInForm');
        const preview = document.getElementById('checkInPhotoPreview');
        const status = document.getElementById('checkInLocationStatus');
        
        if (form) form.reset();
        if (preview) preview.style.display = 'none';
        if (status) status.style.display = 'none';
        checkInPhoto = null;
    }

    async function submitCheckIn() {
        const karyawan = checkInKaryawanId;
        // GUNAKAN LOKASI YANG SAMA DENGAN YANG DITAMPILKAN DI UI
        const lat = document.getElementById('checkInLat')?.value;
        const long = document.getElementById('checkInLong')?.value;
        
        // Debug: tampilkan lokasi yang akan dikirim
        console.log('Check In - Lokasi yang akan dikirim:', lat, long);
        
        if (!karyawan) {
            alert('Karyawan tidak ditemukan. Silakan hubungi admin.');
            return;
        }
        
        if (!checkInPhoto) {
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
            formData.append('check_in_photo', checkInPhoto);
            // Pastikan menggunakan lokasi yang sama dengan yang ditampilkan di UI
            formData.append('lat_check_in', lat);
            formData.append('long_check_in', long);
            
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
                alert(result.message || 'Check in berhasil');
                // Reload page or update attendance card
                if (typeof loadDashboardData === 'function') {
                    loadDashboardData();
                } else if (typeof loadTodayAttendance === 'function') {
                    // Untuk dashboard sales
                    loadTodayAttendance();
                } else {
                    window.location.reload();
                }
            } else {
                // Tampilkan error message dengan jelas
                alert(result.message || 'Terjadi kesalahan saat melakukan check in');
            }
        } catch (error) {
            console.error('Error submitting check in:', error);
            alert('Terjadi kesalahan saat menyimpan data');
        }
    }

    // Check Out Variables
    let checkOutStream = null;
    let checkOutPhotoType = 'checkOut';
    let checkOutPhoto = null;
    let checkOutAbsensiId = null;
    let checkOutKaryawanNama = '';
    let checkOutOverlayInterval = null;

    // Check Out functions
    async function openCheckOutModalFromAbsensi(absensiId) {
        checkOutAbsensiId = absensiId;
        
        // Set absensi ID in hidden input
        const absensiIdInput = document.getElementById('checkOutAbsensiId');
        if (absensiIdInput) {
            absensiIdInput.value = absensiId;
        }
        
        // Get current user karyawan
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch('/api/hr/karyawan/by-current-user', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success && result.data) {
                checkOutKaryawanNama = result.data.nama;
            }
        } catch (error) {
            console.error('Error loading karyawan:', error);
        }

        const modal = document.getElementById('checkOutModal');
        if (modal) {
            modal.classList.add('active');
            resetCheckOutForm();
        } else {
            // If modal doesn't exist, redirect to absensi page
            window.location.href = '/user/absensi';
        }
    }

    // Make function available globally
    window.openCheckOutModalFromAbsensi = openCheckOutModalFromAbsensi;

    function closeCheckOutModal() {
        const modal = document.getElementById('checkOutModal');
        if (modal) {
            modal.classList.remove('active');
            resetCheckOutForm();
        }
    }

    function resetCheckOutForm() {
        const form = document.getElementById('checkOutForm');
        const preview = document.getElementById('checkOutPhotoPreview');
        const status = document.getElementById('checkOutLocationStatus');
        
        if (form) form.reset();
        if (preview) preview.style.display = 'none';
        if (status) status.style.display = 'none';
        checkOutPhoto = null;
    }

    function openCameraForCheckOut() {
        openCamera('checkOut');
    }

    async function submitCheckOut() {
        // GUNAKAN LOKASI YANG SAMA DENGAN YANG DITAMPILKAN DI UI
        const lat = document.getElementById('checkOutLat')?.value;
        const long = document.getElementById('checkOutLong')?.value;
        
        // Debug: tampilkan lokasi yang akan dikirim
        console.log('Check Out - Lokasi yang akan dikirim:', lat, long);
        
        if (!checkOutAbsensiId) {
            alert('ID absensi tidak ditemukan');
            return;
        }
        
        if (!checkOutPhoto) {
            alert('Ambil foto selfie terlebih dahulu');
            return;
        }
        
        // Lokasi sekarang WAJIB
        if (!lat || !long) {
            alert('Lokasi wajib diisi untuk melakukan check out. Pastikan GPS/lokasi sudah diaktifkan dan coba ambil foto lagi.');
            return;
        }
        
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const formData = new FormData();
            formData.append('check_out_photo', checkOutPhoto);
            // Pastikan menggunakan lokasi yang sama dengan yang ditampilkan di UI
            formData.append('lat_check_out', lat);
            formData.append('long_check_out', long);
            
            const response = await fetch(`/api/hr/absensi/${checkOutAbsensiId}/check-out`, {
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
                alert(result.message || 'Check out berhasil');
                // Reload page or update attendance card
                if (typeof loadDashboardData === 'function') {
                    setTimeout(() => loadDashboardData(), 500);
                } else {
                    window.location.reload();
                }
            } else {
                // Tampilkan error message dengan jelas
                alert(result.message || 'Terjadi kesalahan saat melakukan check out');
            }
        } catch (error) {
            console.error('Error submitting check out:', error);
            alert('Terjadi kesalahan saat menyimpan data');
        }
    }

    function startCheckOutOverlayDrawing() {
        const video = document.getElementById('video');
        const overlayCanvas = document.getElementById('overlayCanvas');
        
        if (!overlayCanvas || !video) return;
        
        // Stop previous interval if exists
        if (checkOutOverlayInterval) {
            clearInterval(checkOutOverlayInterval);
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
                setTimeout(initOverlay, 100);
                return;
            }
        };
        
        initOverlay();
        video.addEventListener('resize', updateCanvasSize);
        
        // Draw overlay continuously
        const drawOverlay = () => {
            if (!overlayCanvas || overlayCanvas.width === 0 || overlayCanvas.height === 0) {
                return;
            }
            
            const ctx = overlayCanvas.getContext('2d');
            ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            
            const namaKaryawan = checkOutKaryawanNama || '';
            const lat = document.getElementById('checkOutLat')?.value || '';
            const long = document.getElementById('checkOutLong')?.value || '';
            
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
        
        drawOverlay();
        checkOutOverlayInterval = setInterval(drawOverlay, 100);
    }

    function handlePhotoSelect(event, type) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            if (type === 'checkIn') {
                document.getElementById('checkInPhotoPreview').src = e.target.result;
                document.getElementById('checkInPhotoPreview').style.display = 'block';
                checkInPhoto = file;
            } else if (type === 'checkOut') {
                document.getElementById('checkOutPhotoPreview').src = e.target.result;
                document.getElementById('checkOutPhotoPreview').style.display = 'block';
                checkOutPhoto = file;
            }
        };
        reader.readAsDataURL(file);
    }

    // Update location function for check out
    function getCheckOutLocationSilent() {
        const statusEl = document.getElementById('checkOutLocationStatus');
        
        if (!navigator.geolocation || !statusEl) {
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Simpan lokasi ke input field - INI YANG AKAN DIGUNAKAN UNTUK WATERMARK DAN SUBMIT
                document.getElementById('checkOutLat').value = lat;
                document.getElementById('checkOutLong').value = lng;
                
                // Tampilkan lokasi yang sama di UI
                statusEl.style.display = 'block';
                statusEl.className = 'location-status location-valid';
                statusEl.innerHTML = `Lokasi berhasil diambil (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
                
                // Debug: pastikan lokasi yang disimpan sama dengan yang ditampilkan
                console.log('Lokasi Check Out disimpan:', lat, lng);
            },
            (error) => {
                statusEl.style.display = 'none';
                console.error('Error getting location:', error);
            },
            {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 60000
            }
        );
    }
</script>
@endpush


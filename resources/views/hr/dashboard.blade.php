@extends('layouts.hr')

@section('title', 'HR Dashboard')
@section('page_title', 'Dashboard HR')

@push('styles')
<style>
    :root {
        --theme-primary: #A78BFA;
        --theme-primary-dark: #8B5CF6;
        --theme-primary-light: #C4B5FD;
        --theme-primary-lighter: #F3E8FF;
    }

    .stat-card::before {
        background: linear-gradient(90deg, var(--theme-primary) 0%, var(--theme-primary-light) 100%);
    }

    .stat-icon {
        transition: all 0.3s ease;
    }

    .stat-card:hover .stat-icon {
        transform: scale(1.05);
    }
    
    .stat-card:hover .stat-icon[style] {
        opacity: 0.9;
        transform: scale(1.05);
    }

    .stat-icon {
        width: 40px;
        height: 40px;
    }

    .stat-icon svg {
        width: 20px;
        height: 20px;
    }

    .stat-value {
        font-size: 1.25rem;
    }

    .stat-label {
        font-size: 0.8125rem;
    }

    .stat-card {
        min-height: 140px;
    }

    .sidebar-link.active,
    .sidebar-link:hover {
        background: linear-gradient(135deg, rgba(167, 139, 250, 0.08) 0%, rgba(167, 139, 250, 0.03) 100%);
        color: var(--theme-primary-dark);
    }

    .sidebar-link.active::before {
        background: linear-gradient(180deg, var(--theme-primary) 0%, var(--theme-primary-dark) 100%);
    }

    .attendance-card {
        background: var(--surface);
        border-radius: var(--radius-lg);
        padding: 2rem;
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border);
        margin-bottom: 1.5rem;
    }

    .attendance-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .attendance-info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin-bottom: 1.5rem;
        padding: 1.5rem;
        background: var(--bg);
        border-radius: var(--radius-sm);
    }

    .attendance-time {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .attendance-time-label {
        font-size: 0.875rem;
        color: var(--text-muted);
    }

    .attendance-time-value {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--text);
    }

    .attendance-status {
        display: inline-block;
        padding: 0.5rem 1rem;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-weight: 500;
    }

    .status-hadir {
        background: #D1FAE5;
        color: #059669;
    }

    .status-telat {
        background: #FEF3C7;
        color: #D97706;
    }

    .status-belum {
        background: #E5E7EB;
        color: #6B7280;
    }

    .attendance-actions {
        display: flex;
        gap: 1rem;
    }

    .btn {
        padding: 0.75rem 1.5rem;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
        flex: 1;
    }

    .btn-primary {
        background: var(--primary);
        color: white;
    }

    .btn-primary:hover {
        background: var(--primary-dark);
    }

    .btn-primary:disabled {
        background: var(--border);
        color: var(--text-muted);
        cursor: not-allowed;
    }
</style>
@endpush

@section('content')
    <h2 style="margin-bottom: 1.5rem;">HR Dashboard</h2>

    <!-- Attendance Card -->
    <div class="attendance-card">
        <div class="attendance-header">
            <h3 style="margin: 0;">Absensi Hari Ini</h3>
            <span class="attendance-status" id="attendanceStatusBadge">-</span>
        </div>
        <div class="attendance-info">
            <div class="attendance-time">
                <span class="attendance-time-label">Check In</span>
                <span class="attendance-time-value" id="checkInTime">-</span>
            </div>
            <div class="attendance-time">
                <span class="attendance-time-label">Check Out</span>
                <span class="attendance-time-value" id="checkOutTime">-</span>
            </div>
        </div>
        <div class="attendance-actions">
            <button class="btn btn-primary" id="checkInBtn" onclick="openCheckInModal()">Check In</button>
            <button class="btn btn-primary" id="checkOutBtn" onclick="openCheckOutModal()" disabled>Check Out</button>
        </div>
    </div>

    <div class="card-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
            <div class="stat-icon" style="background: #F3E8FF; color: #8B5CF6;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Total Karyawan</span>
            <span class="stat-value" id="total-karyawan">0</span>
            <small class="text-muted">Keseluruhan</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #D1FAE5; color: #10B981;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12l4 4L19 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Karyawan Aktif</span>
            <span class="stat-value" id="karyawan-aktif">0</span>
            <small class="text-muted">Sedang bekerja</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #FFF4E5; color: #FFB84D;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9L11 5H19C19.5304 5 20.0391 5.21071 20.4142 5.58579C20.7893 5.96086 21 6.46957 21 7V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Karyawan Cuti</span>
            <span class="stat-value" id="karyawan-cuti">0</span>
            <small class="text-muted">Sedang cuti</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #E5F5FF; color: #4DA6FF;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8V12L16 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Karyawan Baru</span>
            <span class="stat-value" id="karyawan-baru">0</span>
            <small class="text-muted">Bulan ini</small>
        </div>
    </div>

    <div class="card-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
            <div class="stat-icon" style="background: #D1FAE5; color: #10B981;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 11L12 14L22 4M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Hadir Hari Ini</span>
            <span class="stat-value" id="hadir-hari-ini">0</span>
            <small class="text-muted" id="persentase-kehadiran">0% kehadiran</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #F0E5FF; color: #9D4DFF;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                    <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Lowongan Aktif</span>
            <span class="stat-value" id="lowongan-aktif">0</span>
            <small class="text-muted" id="kandidat-screening">0 kandidat</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="background: #FFF4E5; color: #FFB84D;">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 6.25278V19.2528M12 6.25278C10.8321 5.47686 9.24649 5 7.5 5C5.75351 5 4.16789 5.47686 3 6.25278V19.2528C4.16789 18.4769 5.75351 18 7.5 18C9.24649 18 10.8321 18.4769 12 19.2528M12 6.25278C13.1679 5.47686 14.7535 5 16.5 5C18.2465 5 19.8321 5.47686 21 6.25278V19.2528C19.8321 18.4769 18.2465 18 16.5 18C14.7535 18 13.1679 18.4769 12 19.2528" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <span class="stat-label">Program Training</span>
            <span class="stat-value" id="program-training">0</span>
            <small class="text-muted" id="peserta-training">0 peserta</small>
        </div>
    </div>

    <div class="card-grid" style="grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1.5rem;">
        <div class="card-table">
            <h3>Absensi Minggu Ini</h3>
            <canvas id="chartAbsensi" style="max-height: 300px;"></canvas>
        </div>
        <div class="card-table">
            <h3>Rekrutmen (6 Bulan)</h3>
            <canvas id="chartRekrutmen" style="max-height: 300px;"></canvas>
        </div>
    </div>

    <div class="card-table" style="margin-top: 1.5rem;">
        <h3>Karyawan Terbaru</h3>
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Nama</th>
                        <th>Posisi</th>
                        <th>Tanggal Bergabung</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="karyawan-table">
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 2rem;">Memuat data...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
@endsection

@push('scripts')
<script>
    let chartAbsensi = null;
    let chartRekrutmen = null;

    // Helper function untuk mendapatkan tanggal lokal Indonesia (format YYYY-MM-DD)
    function getTodayIndonesia() {
        const now = new Date();
        
        // Gunakan timezone Asia/Jakarta (WIB - UTC+7)
        // Jika browser tidak support Intl, fallback ke manual calculation
        try {
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Jakarta',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            return formatter.format(now);
        } catch (e) {
            // Fallback: konversi manual ke WIB (UTC+7)
            const offset = 7; // WIB (Western Indonesian Time)
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const indonesiaTime = new Date(utc + (3600000 * offset));
            
            const year = indonesiaTime.getFullYear();
            const month = String(indonesiaTime.getMonth() + 1).padStart(2, '0');
            const day = String(indonesiaTime.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        }
    }

    async function loadDashboardData() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch('/api/hr/dashboard', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                const data = result.data;
                
                // Helper function to safely update element
                function safeUpdateElement(id, value) {
                    const element = document.getElementById(id);
                    if (element) {
                        element.textContent = value;
                    }
                }
                
                // Update statistik
                safeUpdateElement('total-karyawan', data.statistik.total_karyawan ?? 0);
                safeUpdateElement('karyawan-aktif', data.statistik.karyawan_aktif ?? 0);
                safeUpdateElement('karyawan-cuti', data.statistik.karyawan_cuti ?? 0);
                safeUpdateElement('karyawan-baru', data.statistik.karyawan_baru_bulan_ini ?? 0);
                safeUpdateElement('hadir-hari-ini', data.absensi.hadir_hari_ini ?? 0);
                safeUpdateElement('persentase-kehadiran', (data.absensi.persentase_kehadiran ?? 0) + '% kehadiran');
                safeUpdateElement('lowongan-aktif', data.rekrutmen.lowongan_aktif ?? 0);
                safeUpdateElement('kandidat-screening', (data.rekrutmen.kandidat_screening ?? 0) + ' kandidat');
                safeUpdateElement('program-training', data.training.program_aktif ?? 0);
                safeUpdateElement('peserta-training', (data.training.peserta_training ?? 0) + ' peserta');

                // Update charts
                if (data.chart_absensi) {
                    updateChartAbsensi(data.chart_absensi);
                }
                if (data.chart_rekrutmen) {
                    updateChartRekrutmen(data.chart_rekrutmen);
                }
                if (data.karyawan_terbaru) {
                    updateKaryawanTable(data.karyawan_terbaru);
                }
            }

            // Load today's attendance - menggunakan waktu lokal Indonesia
            const today = getTodayIndonesia();
            const attendanceResponse = await fetch(`/api/hr/absensi/by-current-user?tanggal=${today}`, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            if (attendanceResponse.ok) {
                const attendanceResult = await attendanceResponse.json();
                if (attendanceResult.success && attendanceResult.data && attendanceResult.data.length > 0) {
                    const todayAttendance = attendanceResult.data[0];
                    updateAttendanceCard(todayAttendance);
                } else {
                    // No attendance today
                    updateAttendanceCard(null);
                }
            } else {
                updateAttendanceCard(null);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    function updateAttendanceCard(attendance) {
        const checkInTimeEl = document.getElementById('checkInTime');
        const checkOutTimeEl = document.getElementById('checkOutTime');
        const statusBadgeEl = document.getElementById('attendanceStatusBadge');
        const checkInBtn = document.getElementById('checkInBtn');
        const checkOutBtn = document.getElementById('checkOutBtn');

        if (!attendance) {
            // Belum check in
            checkInTimeEl.textContent = '-';
            checkOutTimeEl.textContent = '-';
            statusBadgeEl.textContent = 'Belum Check In';
            statusBadgeEl.className = 'attendance-status status-belum';
            checkInBtn.disabled = false;
            checkOutBtn.disabled = true;
        } else if (attendance.check_in && !attendance.check_out) {
            // Sudah check in, belum check out
            checkInTimeEl.textContent = attendance.check_in || '-';
            checkOutTimeEl.textContent = '-';
            
            // Determine status (Hadir/Telat)
            const status = attendance.status_absensi || 'Hadir';
            statusBadgeEl.textContent = status;
            statusBadgeEl.className = status === 'Telat' ? 'attendance-status status-telat' : 'attendance-status status-hadir';
            
            checkInBtn.disabled = true;
            checkOutBtn.disabled = false;
        } else if (attendance.check_out) {
            // Sudah check out
            checkInTimeEl.textContent = attendance.check_in || '-';
            checkOutTimeEl.textContent = attendance.check_out || '-';
            
            // Determine status (Hadir/Telat)
            const status = attendance.status_absensi || 'Hadir';
            statusBadgeEl.textContent = status;
            statusBadgeEl.className = status === 'Telat' ? 'attendance-status status-telat' : 'attendance-status status-hadir';
            
            checkInBtn.disabled = true;
            checkOutBtn.disabled = true;
        }
    }

    async function openCheckOutModal() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            // Get today's attendance ID - menggunakan waktu lokal Indonesia
            const today = getTodayIndonesia();
            const attendanceResponse = await fetch(`/api/hr/absensi/by-current-user?tanggal=${today}`, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            if (attendanceResponse.ok) {
                const attendanceResult = await attendanceResponse.json();
                if (attendanceResult.success && attendanceResult.data && attendanceResult.data.length > 0) {
                    const todayAttendance = attendanceResult.data[0];
                    if (todayAttendance.check_in && !todayAttendance.check_out) {
                        // Open check out modal from checkin-component
                        if (typeof openCheckOutModalFromAbsensi === 'function') {
                            openCheckOutModalFromAbsensi(todayAttendance.id);
                        } else {
                            // Fallback: redirect to absensi page
                            window.location.href = '{{ route('hr.absensi') }}';
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error opening check out modal:', error);
        }
    }

    // Make function available globally
    window.openCheckOutModal = openCheckOutModal;

    function updateChartAbsensi(data) {
        const canvas = document.getElementById('chartAbsensi');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (chartAbsensi) {
            chartAbsensi.destroy();
        }

        chartAbsensi = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                    label: 'Hadir',
                    data: data.map(item => item.hadir),
                    backgroundColor: '#8b5cf6',
                    borderRadius: 8,
                }, {
                    label: 'Tidak Hadir',
                    data: data.map(item => item.tidak_hadir),
                    backgroundColor: '#f43f5e',
                    borderRadius: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    function updateChartRekrutmen(data) {
        const canvas = document.getElementById('chartRekrutmen');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (chartRekrutmen) {
            chartRekrutmen.destroy();
        }

        chartRekrutmen = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.label),
                datasets: [{
                    label: 'Applied',
                    data: data.map(item => item.applied),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Hired',
                    data: data.map(item => item.hired),
                    borderColor: '#a78bfa',
                    backgroundColor: 'rgba(167, 139, 250, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function updateKaryawanTable(data) {
        const tbody = document.getElementById('karyawan-table');
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Tidak ada data</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${item.nama}</td>
                <td>${item.posisi}</td>
                <td>${item.tanggal_bergabung || '-'}</td>
                <td><span class="status-pill status-success">${item.status || 'Aktif'}</span></td>
            </tr>
        `).join('');
    }

    document.addEventListener('DOMContentLoaded', function() {
        loadDashboardData();
        initCheckIn();
    });
</script>

@include('hr.checkin-component')
@endpush


@extends('layouts.user')

@section('title', 'Dashboard')

@push('styles')
<style>
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

    .task-item {
        background: var(--surface);
        border-radius: var(--radius-sm);
        padding: 1rem;
        border: 1px solid var(--border);
        margin-bottom: 0.75rem;
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .task-status {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .task-status.pending {
        background: #F59E0B;
    }

    .task-status.progress {
        background: #3B82F6;
    }

    .task-status.completed {
        background: #10B981;
    }

    .performance-card {
        background: var(--surface);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border);
    }
</style>
@endpush

@section('content')
    <h2 style="margin-bottom: 1.5rem;">Dashboard</h2>

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

    <div class="card-grid" style="grid-template-columns: 2fr 1fr; gap: 1.5rem;">
        <!-- Task List -->
        <div class="card-table">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3>Task / List Saya</h3>
                <button class="btn btn-primary" onclick="window.location.href='{{ route('user.task') }}'">Lihat Semua</button>
            </div>
            <div id="taskList">
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">Memuat data...</div>
            </div>
        </div>

        <!-- Performance Card -->
        <div class="performance-card">
            <h3 style="margin: 0 0 1rem 0;">Performa</h3>
            <div style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="color: var(--text-muted); font-size: 0.875rem;">Task Selesai</span>
                    <span style="font-weight: 600;" id="completedTasks">0</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="color: var(--text-muted); font-size: 0.875rem;">Task Progress</span>
                    <span style="font-weight: 600;" id="progressTasks">0</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span style="color: var(--text-muted); font-size: 0.875rem;">Task Pending</span>
                    <span style="font-weight: 600;" id="pendingTasks">0</span>
                </div>
            </div>
            <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
                <div style="margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span style="color: var(--text-muted); font-size: 0.875rem;">Kehadiran Bulan Ini</span>
                        <span style="font-weight: 600;" id="attendanceCount">0</span>
                    </div>
                    <div style="background: var(--border); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div id="attendanceProgress" style="background: var(--primary); height: 100%; width: 0%; transition: width 0.3s;"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection

@push('scripts')
<script>
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

            // Load tasks
            const taskResponse = await fetch('/api/user/tasks?limit=5', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            if (taskResponse.ok) {
                const taskResult = await taskResponse.json();
                if (taskResult.success) {
                    renderTasks(taskResult.data);
                    updatePerformance(taskResult.statistics);
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

            // Load attendance statistics
            const statsResponse = await fetch('/api/user/attendance-stats', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            if (statsResponse.ok) {
                const statsResult = await statsResponse.json();
                if (statsResult.success) {
                    document.getElementById('attendanceCount').textContent = statsResult.data.attendance_count || 0;
                    const progress = statsResult.data.attendance_percentage || 0;
                    document.getElementById('attendanceProgress').style.width = progress + '%';
                }
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    function renderTasks(tasks) {
        const taskList = document.getElementById('taskList');
        if (!tasks || tasks.length === 0) {
            taskList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Tidak ada task</div>';
            return;
        }

        taskList.innerHTML = tasks.map(task => {
            const statusClass = task.status === 'completed' ? 'completed' : task.status === 'progress' ? 'progress' : 'pending';
            const statusText = task.status === 'completed' ? 'Selesai' : task.status === 'progress' ? 'Progress' : 'Pending';
            
            return `
                <div class="task-item">
                    <div class="task-status ${statusClass}"></div>
                    <div style="flex: 1;">
                        <div style="font-weight: 500; margin-bottom: 0.25rem;">${task.title || 'Task'}</div>
                        <div style="font-size: 0.875rem; color: var(--text-muted);">${task.description || ''}</div>
                    </div>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${statusText}</span>
                </div>
            `;
        }).join('');
    }

    function updatePerformance(stats) {
        if (stats) {
            document.getElementById('completedTasks').textContent = stats.completed || 0;
            document.getElementById('progressTasks').textContent = stats.progress || 0;
            document.getElementById('pendingTasks').textContent = stats.pending || 0;
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
                            window.location.href = '{{ route('user.absensi') }}';
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

    document.addEventListener('DOMContentLoaded', function() {
        loadDashboardData();
        initCheckIn();
    });
</script>

@include('hr.checkin-component')
@endpush


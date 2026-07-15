@extends('layouts.sales')

@section('title', 'Dashboard Sales')
@section('page_title', 'Dashboard Sales')

@push('styles')
<style>
    .page-header {
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
        border-radius: var(--radius-lg);
        padding: 1.5rem 2rem;
        color: white;
        margin-bottom: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .page-header h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .stat-card {
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .stat-card .label {
        font-size: 0.8125rem;
        color: var(--text-muted);
        font-weight: 500;
    }

    .stat-card .value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text);
    }

    .stat-card.new .value {
        color: #3b82f6;
    }

    .stat-card.contacted .value {
        color: #8b5cf6;
    }

    .stat-card.qualified .value {
        color: #10b981;
    }

    .stat-card.converted .value {
        color: #14b8a6;
    }

    .stat-card.lost .value {
        color: #ef4444;
    }

    .stat-card.active .value {
        color: var(--accent);
    }
</style>
@endpush

@section('content')
<div class="page-header">
    <div>
        <h1>Dashboard Sales</h1>
        <p style="margin: 0.25rem 0 0 0; opacity: 0.9; font-size: 0.875rem;">Selamat datang, <span id="userName">Sales</span></p>
    </div>
</div>

<!-- Attendance Card -->
<div class="attendance-card" style="background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); padding: 1.25rem; margin-bottom: 1.5rem;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="margin: 0; font-size: 1.125rem; font-weight: 600;">Absensi Hari Ini</h3>
        <span class="attendance-status" id="attendanceStatusBadge" style="padding: 0.375rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.75rem; font-weight: 600;">-</span>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
            <span style="display: block; font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.25rem;">Check In</span>
            <span style="display: block; font-size: 1.125rem; font-weight: 600;" id="checkInTime">-</span>
        </div>
        <div>
            <span style="display: block; font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.25rem;">Check Out</span>
            <span style="display: block; font-size: 1.125rem; font-weight: 600;" id="checkOutTime">-</span>
        </div>
    </div>
    <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-primary" id="checkInBtn" onclick="openCheckInModal()" style="flex: 1; background: var(--primary); padding: 0.625rem 1.25rem; border-radius: var(--radius-sm); border: none; color: white; cursor: pointer; font-weight: 500;">Check In</button>
        <button class="btn btn-primary" id="checkOutBtn" onclick="openCheckOutModal()" disabled style="flex: 1; background: var(--border); padding: 0.625rem 1.25rem; border-radius: var(--radius-sm); border: none; color: var(--text-muted); cursor: not-allowed; font-weight: 500; opacity: 0.6;">Check Out</button>
    </div>
</div>

<div class="stats-grid">
    <div class="stat-card">
        <div class="label">Total Leads</div>
        <div class="value" id="statTotal">0</div>
    </div>
    <div class="stat-card new">
        <div class="label">New Leads</div>
        <div class="value" id="statNew">0</div>
    </div>
    <div class="stat-card contacted">
        <div class="label">Contacted</div>
        <div class="value" id="statContacted">0</div>
    </div>
    <div class="stat-card qualified">
        <div class="label">Qualified</div>
        <div class="value" id="statQualified">0</div>
    </div>
    <div class="stat-card converted">
        <div class="label">Converted</div>
        <div class="value" id="statConverted">0</div>
    </div>
    <div class="stat-card lost">
        <div class="label">Lost</div>
        <div class="value" id="statLost">0</div>
    </div>
    <div class="stat-card active">
        <div class="label">Active Leads</div>
        <div class="value" id="statActive">0</div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    const API_BASE = '/api/sales';
    
    function getHeaders() {
        const token = localStorage.getItem('auth_token');
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    async function loadDashboard() {
        try {
            const response = await fetch(`${API_BASE}/dashboard`, { headers: getHeaders() });
            const result = await response.json();

            if (result.success) {
                const data = result.data;
                
                // Update user info
                if (data.user) {
                    document.getElementById('userName').textContent = data.user.nama || 'Sales';
                    document.getElementById('sidebarUserName').textContent = data.user.nama || 'Sales';
                    document.getElementById('sidebarUserRole').textContent = 'Sales';
                    document.getElementById('sidebarAvatar').textContent = (data.user.nama || 'S')[0].toUpperCase();
                }

                // Update statistics
                if (data.leads_statistics) {
                    const stats = data.leads_statistics;
                    document.getElementById('statTotal').textContent = stats.total_leads || 0;
                    document.getElementById('statNew').textContent = stats.new_leads || 0;
                    document.getElementById('statContacted').textContent = stats.contacted_leads || 0;
                    document.getElementById('statQualified').textContent = stats.qualified_leads || 0;
                    document.getElementById('statConverted').textContent = stats.converted_leads || 0;
                    document.getElementById('statLost').textContent = stats.lost_leads || 0;
                    document.getElementById('statActive').textContent = stats.active_leads || 0;
                }
                
                // Load attendance after dashboard data
                loadTodayAttendance();
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

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

    // Load today's attendance status
    async function loadTodayAttendance() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) return;

            // Menggunakan waktu lokal Indonesia
            const today = getTodayIndonesia();
            const response = await fetch(`/api/hr/absensi/by-current-user?tanggal=${today}`, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data && result.data.length > 0) {
                    const attendance = result.data[0];
                    updateAttendanceCard(attendance);
                } else {
                    // No attendance today
                    updateAttendanceCard(null);
                }
            } else {
                updateAttendanceCard(null);
            }
        } catch (error) {
            console.error('Error loading today attendance:', error);
            updateAttendanceCard(null);
        }
    }

    function updateAttendanceCard(attendance) {
        const checkInTimeEl = document.getElementById('checkInTime');
        const checkOutTimeEl = document.getElementById('checkOutTime');
        const statusBadgeEl = document.getElementById('attendanceStatusBadge');
        const checkInBtn = document.getElementById('checkInBtn');
        const checkOutBtn = document.getElementById('checkOutBtn');

        if (!attendance || !attendance.check_in) {
            // Belum check in - PASTIKAN check out disabled
            checkInTimeEl.textContent = '-';
            checkOutTimeEl.textContent = '-';
            statusBadgeEl.textContent = 'Belum Check In';
            statusBadgeEl.className = 'attendance-status';
            statusBadgeEl.style.background = '#FEE2E2';
            statusBadgeEl.style.color = '#DC2626';
            checkInBtn.disabled = false;
            checkOutBtn.disabled = true;
            // Update style untuk tombol disabled
            checkOutBtn.style.background = 'var(--border)';
            checkOutBtn.style.color = 'var(--text-muted)';
            checkOutBtn.style.cursor = 'not-allowed';
            checkOutBtn.style.opacity = '0.6';
        } else if (attendance.check_in && !attendance.check_out) {
            // Sudah check in, belum check out
            checkInTimeEl.textContent = attendance.check_in || '-';
            checkOutTimeEl.textContent = '-';
            
            // Determine status (Hadir/Telat)
            const status = attendance.status_absensi || 'Hadir';
            statusBadgeEl.textContent = status;
            if (status === 'Telat') {
                statusBadgeEl.style.background = '#FEF3C7';
                statusBadgeEl.style.color = '#D97706';
            } else {
                statusBadgeEl.style.background = '#D1FAE5';
                statusBadgeEl.style.color = '#059669';
            }
            
            checkInBtn.disabled = true;
            checkOutBtn.disabled = false;
            // Update style untuk tombol enabled
            checkOutBtn.style.background = 'var(--accent)';
            checkOutBtn.style.color = 'white';
            checkOutBtn.style.cursor = 'pointer';
            checkOutBtn.style.opacity = '1';
        } else if (attendance.check_out) {
            // Sudah check out
            checkInTimeEl.textContent = attendance.check_in || '-';
            checkOutTimeEl.textContent = attendance.check_out || '-';
            
            // Determine status (Hadir/Telat)
            const status = attendance.status_absensi || 'Hadir';
            statusBadgeEl.textContent = status;
            if (status === 'Telat') {
                statusBadgeEl.style.background = '#FEF3C7';
                statusBadgeEl.style.color = '#D97706';
            } else {
                statusBadgeEl.style.background = '#D1FAE5';
                statusBadgeEl.style.color = '#059669';
            }
            
            checkInBtn.disabled = true;
            checkOutBtn.disabled = true;
            // Update style untuk tombol disabled
            checkOutBtn.style.background = 'var(--border)';
            checkOutBtn.style.color = 'var(--text-muted)';
            checkOutBtn.style.cursor = 'not-allowed';
            checkOutBtn.style.opacity = '0.6';
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
                            window.location.href = '/sales/absensi';
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

    // Load on page load
    document.addEventListener('DOMContentLoaded', function() {
        loadDashboard();
        initCheckIn();
    });
</script>

@include('hr.checkin-component')
@endpush


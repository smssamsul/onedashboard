@extends('layouts.customer')

@section('title', 'Join Webinar')

@push('styles')
<style>
    .join-container {
        min-height: calc(100vh - 200px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    }

    .join-card {
        background: var(--surface);
        border-radius: 16px;
        box-shadow: var(--shadow-md);
        padding: 2.5rem;
        max-width: 500px;
        width: 100%;
        text-align: center;
    }

    .join-card h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--text);
    }

    .join-card p {
        margin: 0 0 2rem 0;
        color: var(--muted);
        font-size: 1rem;
    }

    .join-info {
        background: var(--bg);
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 2rem;
        text-align: left;
    }

    .join-info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--border);
    }

    .join-info-item:last-child {
        border-bottom: none;
    }

    .join-info-label {
        font-size: 0.875rem;
        color: var(--muted);
        font-weight: 500;
    }

    .join-info-value {
        font-size: 0.875rem;
        color: var(--text);
        font-weight: 600;
    }

    .btn-join {
        background: var(--primary);
        color: white;
        border: none;
        padding: 1rem 2rem;
        border-radius: 12px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        width: 100%;
    }

    .btn-join:hover {
        background: var(--primary-dark);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }

    .btn-join:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .running-text {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.85);
        color: #fff;
        overflow: hidden;
        padding: 8px 0;
        pointer-events: none;
    }

    .running-text span {
        display: inline-block;
        white-space: nowrap;
        padding-left: 100%;
        animation: ticker 18s linear infinite;
        font-size: 15px;
        letter-spacing: 0.5px;
    }

    @keyframes ticker {
        0% {
            transform: translateX(0);
        }
        100% {
            transform: translateX(-100%);
        }
    }

    #zmmtg-root {
        width: 100%;
        height: 100vh;
        visibility: hidden;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 1000;
    }

    .loading-state {
        text-align: center;
        padding: 1rem;
        color: var(--muted);
    }
</style>
@endpush

@section('content')
<div class="join-container">
    <div class="join-card" id="joinCard">
        <h2>Webinar Online</h2>
        <p>Bergabung ke webinar {{ $produkNama ?? 'One Dashboard' }}</p>
        
        <div class="join-info">
            <div class="join-info-item">
                <span class="join-info-label">Nama Peserta</span>
                <span class="join-info-value">{{ $userName ?? 'Peserta Webinar' }}</span>
            </div>
            <div class="join-info-item">
                <span class="join-info-label">Meeting ID</span>
                <span class="join-info-value">{{ $meetingNumber ?? '-' }}</span>
            </div>
        </div>

        <button id="joinBtn" class="btn-join">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 12L9 8V16L15 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            Join Meeting
        </button>
    </div>

    <div class="loading-state" id="loadingState" style="display: none;">
        <p>Memuat Zoom Meeting...</p>
    </div>
</div>

<div class="running-text">
    <span>Selamat datang di Webinar One Dashboard — Pastikan kamera dan mikrofon siap, gunakan koneksi internet stabil, dan hubungi host bila mengalami kendala.</span>
</div>

<div id="zmmtg-root"></div>
<div id="aria-notify-area"></div>
@endsection

@push('scripts')
{{-- Dependensi Zoom SDK terbaru --}}
<script src="https://source.zoom.us/4.0.5/lib/vendor/react.min.js"></script>
<script src="https://source.zoom.us/4.0.5/lib/vendor/react-dom.min.js"></script>
<script src="https://source.zoom.us/4.0.5/lib/vendor/redux.min.js"></script>
<script src="https://source.zoom.us/4.0.5/lib/vendor/redux-thunk.min.js"></script>
<script src="https://source.zoom.us/4.0.5/lib/vendor/lodash.min.js"></script>
<script src="https://source.zoom.us/zoom-meeting-4.0.5.min.js"></script>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const meetingNumber = "{{ $meetingNumber }}";
    const meetingPassword = "{{ $password }}";
    const userName = "{{ $userName ?? 'Peserta Webinar' }}";
    const userEmail = "{{ $userEmail ?? 'guest@example.com' }}";
    const sdkKey = "{{ $sdkKey }}";
    const signature = "{{ $signature }}";

    const joinBtn = document.getElementById('joinBtn');
    const joinCard = document.getElementById('joinCard');
    const loadingState = document.getElementById('loadingState');
    const zroot = document.getElementById('zmmtg-root');

    // Preload Zoom SDK
    ZoomMtg.preLoadWasm();
    ZoomMtg.prepareWebSDK();

    joinBtn.addEventListener('click', () => {
        joinBtn.disabled = true;
        joinBtn.textContent = 'Memuat...';
        joinCard.style.display = 'none';
        loadingState.style.display = 'block';

        // Show Zoom container
        zroot.style.visibility = 'visible';
        zroot.style.height = '100vh';

        ZoomMtg.init({
            leaveUrl: window.location.origin + '/customer/dashboard',
            success: () => {
                console.log('Zoom init success');
                
                ZoomMtg.join({
                    sdkKey: sdkKey,
                    signature: signature,
                    meetingNumber: meetingNumber,
                    userName: userName,
                    userEmail: userEmail,
                    passWord: meetingPassword,
                    success: (res) => {
                        console.log('Join meeting success', res);
                        loadingState.style.display = 'none';
                    },
                    error: (err) => {
                        console.error('Join meeting error', err);
                        alert('Terjadi kesalahan saat bergabung ke meeting. Silakan coba lagi.');
                        joinBtn.disabled = false;
                        joinBtn.textContent = 'Join Meeting';
                        joinCard.style.display = 'block';
                        loadingState.style.display = 'none';
                        zroot.style.visibility = 'hidden';
                    }
                });
            },
            error: (err) => {
                console.error('Init meeting error', err);
                alert('Terjadi kesalahan saat memuat Zoom. Silakan coba lagi.');
                joinBtn.disabled = false;
                joinBtn.textContent = 'Join Meeting';
                joinCard.style.display = 'block';
                loadingState.style.display = 'none';
                zroot.style.visibility = 'hidden';
            }
        });
    });
});
</script>
@endpush

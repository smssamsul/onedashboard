@extends('layouts.customer')

@section('title', 'Dashboard Customer')

@push('head')
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
@endpush

@section('content')
    <!-- Cosmic Background with Stars -->
    <div class="cosmic-background" id="cosmic-bg">
        <canvas id="stars-canvas"></canvas>
    </div>

    <!-- Hero Section -->
    <div class="hero-section">
        <div class="hero-content">
            <div class="hero-text">
                <h1 class="hero-title">Selamat Datang, <span id="welcome-name">...</span>!</h1>
                <button class="discover-btn" onclick="scrollToOrders()">Lihat Order</button>
            </div>
            
            <!-- Member Card - Visa Style with Glassmorphism -->
            <div class="member-card-wrapper">
                <div class="member-card" id="member-card">
                    <div class="card-background"></div>
                    <div class="card-content">
                        <!-- Card Top Section: Nama Ternak Properti & QR Code -->
                        <div class="card-top-section">
                            <div class="card-ternak-properti">
                                <span class="ternak-properti-name" id="ternak-properti-name">TERNAK PROPERTI</span>
                            </div>
                            <div class="card-qr-code" id="card-qr-code">
                                <!-- QR Code will be generated here -->
                            </div>
                        </div>
                        
                        <!-- Card Number -->
                        <span class="card-label">MEMBER ID</span>
                        <div class="card-number" id="member-id">
                       0000 0000 0000 0000</div>
                        
                        <!-- Card Holder Info -->
                        <div class="card-holder-section">
                            <div class="card-holder-info">
                                <span class="card-label">CARDHOLDER</span>
                                <span class="card-holder-name" id="member-name">YOUR NAME</span>
                            </div>
                            <div class="card-expiry">
                                <span class="card-label">MEMBER</span>
                                <span class="card-membership" id="member-title">BRONZE</span>
                            </div>
                        </div>
                        
                    </div>
                </div>
                
                <!-- Card Actions -->
                <div class="card-actions">
                    <button class="card-action-btn" onclick="downloadMemberCard()" title="Download Card">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Download
                    </button>
                 
                </div>
            </div>
        </div>
    </div>

    <!-- Stats Section -->
    <div class="stats-section">
        <div class="stat-cards">
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3h18v4H3z" stroke="currentColor" stroke-width="2" fill="none"/>
                    <path d="M5 7v14h14V7" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
            </div>
            <div class="stat-info">
                <span class="stat-label">Total Order</span>
                <span class="stat-value" id="total-order">0</span>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon" style="color: var(--success);">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12l4 4L19 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                </svg>
            </div>
            <div class="stat-info">
                <span class="stat-label">Order Aktif</span>
                <span class="stat-value" id="order-aktif">0</span>
            </div>
        </div>
    </div>

    <!-- Orders Section -->
    <div class="orders-section" id="orders-section">
        <h3 class="section-title">Order Aktif Saya</h3>
        
        <div id="orders-container" class="orders-grid">
            <div class="loading-state" style="text-align: center; padding: 3rem;">
                <p style="color: var(--muted);">Memuat data...</p>
            </div>
        </div>

        <div id="empty-state" class="empty-state" style="display: none; text-align: center; padding: 3rem; background: var(--surface); border-radius: 16px; box-shadow: var(--shadow-sm);">
            <svg style="width: 64px; height: 64px; margin: 0 auto 1rem; color: var(--muted);" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3h18v4H3z" stroke="currentColor" stroke-width="2" fill="none"/>
                <path d="M5 7v14h14V7" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
            <h4 style="margin: 0 0 0.5rem; color: var(--text);">Belum ada order aktif</h4>
            <p style="margin: 0; color: var(--muted);">Order yang sudah Anda bayar akan muncul di sini</p>
        </div>
    </div>
@endsection

@push('styles')
<style>
    /* Cosmic Background */
    .cosmic-background {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #000000;
        z-index: -1;
        overflow: hidden;
    }

    #stars-canvas {
        width: 100%;
        height: 100%;
    }

    /* Hero Section */
    .hero-section {
        position: relative;
        min-height: 80vh;
        display: flex;
        align-items: center;
        padding: 4rem 0;
        z-index: 1;
    }

    .hero-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4rem;
        align-items: center;
        width: 100%;
    }

    .hero-text {
        position: relative;
        z-index: 2;
    }

    .hero-subtitle {
        font-size: 0.875rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.7);
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 1rem;
    }

    .hero-title {
        font-size: 3.5rem;
        font-weight: 700;
        color: #ffffff;
        line-height: 1.2;
        margin-bottom: 2rem;
        text-shadow: 0 2px 20px rgba(249, 115, 22, 0.3);
    }

    .hero-title span {
        color: #f97316;
        text-shadow: 0 2px 20px rgba(249, 115, 22, 0.5);
    }

    .discover-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: #ffffff;
        padding: 1rem 2rem;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .discover-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
    }

    /* Member Card - Visa Style with Glassmorphism */
    .member-card-wrapper {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .member-card {
        width: 100%;
        max-width: 450px;
        aspect-ratio: 1.586 / 1;
        position: relative;
        perspective: 1000px;
        margin: 0 auto;
    }

    .card-background {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        border-radius: 20px;
        overflow: hidden;
    }

    .card-background::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(249, 115, 22, 0.15) 0%, transparent 70%);
        animation: rotate 20s linear infinite;
    }

    .card-background::after {
        content: '';
        position: absolute;
        bottom: -30%;
        left: -30%;
        width: 150%;
        height: 150%;
        background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
        animation: rotate 15s linear infinite reverse;
    }

    @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .card-content {
        position: relative;
        width: 100%;
        height: 100%;
        padding: 2rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        z-index: 2;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }

    /* Card Top Section: Nama Ternak Properti & QR Code */
    .card-top-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2rem;
        gap: 1rem;
    }

    .card-ternak-properti {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        flex: 1;
    }

    .ternak-properti-name {
        font-size: 1.5rem;
        font-weight: 700;
        color: #ffffff;
        text-transform: uppercase;
        letter-spacing: 1px;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        line-height: 1.3;
    }

    /* Card QR Code */
    .card-qr-code {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        border-radius: 8px;
        padding: 8px;
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .card-qr-code canvas,
    .card-qr-code img {
        width: 100% !important;
        height: 100% !important;
        border-radius: 4px;
    }

    /* Card Logo */
    .card-logo {
        position: absolute;
        top: 2rem;
        right: 2rem;
        opacity: 0.9;
    }

    /* Card Number */
    .card-number {
        font-size: 1.75rem;
        font-weight: 600;
        color: #ffffff;
        letter-spacing: 6px;
        font-family: 'Courier New', monospace;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        margin: 1rem 0;
    }

    /* Card Holder Section */
    .card-holder-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
    }

    .card-holder-info,
    .card-expiry {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .card-label {
        font-size: 0.625rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .card-holder-name {
        font-size: 1rem;
        font-weight: 600;
        color: #ffffff;
        text-transform: uppercase;
        letter-spacing: 1px;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    }

    .card-membership {
        font-size: 0.875rem;
        font-weight: 700;
        color: #fbbf24;
        text-transform: uppercase;
        letter-spacing: 2px;
        text-shadow: 0 2px 10px rgba(251, 191, 36, 0.5);
    }

    /* Card Hologram Effect */
    .card-hologram {
        position: absolute;
        top: 0;
        right: 0;
        width: 100px;
        height: 100px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
        border-radius: 0 20px 0 100px;
        pointer-events: none;
    }

    /* Card Actions */
    .card-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
    }

    .card-action-btn {
        background: rgba(249, 115, 22, 0.2);
        border: 1px solid rgba(249, 115, 22, 0.3);
        color: #f97316;
        padding: 0.75rem 1.5rem;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.875rem;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .card-action-btn:hover {
        background: rgba(249, 115, 22, 0.3);
        border-color: rgba(249, 115, 22, 0.5);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);
    }

    .card-action-btn svg {
        flex-shrink: 0;
    }

    /* Stats Section */
    .stats-section {
        position: relative;
        z-index: 1;
        margin-bottom: 4rem;
    }

    .stat-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 2rem;
    }

    .stat-card {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 2rem;
        border-radius: 20px;
        display: flex;
        align-items: center;
        gap: 1.5rem;
        transition: all 0.3s;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .stat-card:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-4px);
        box-shadow: 0 12px 40px rgba(249, 115, 22, 0.2);
        border-color: rgba(249, 115, 22, 0.3);
    }

    .stat-icon {
        width: 56px;
        height: 56px;
        padding: 0.875rem;
        background: rgba(249, 115, 22, 0.2);
        border-radius: 16px;
        color: #f97316;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border: 1px solid rgba(249, 115, 22, 0.3);
    }

    .stat-icon svg {
        width: 100%;
        height: 100%;
    }

    .stat-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .stat-label {
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .stat-value {
        font-size: 2rem;
        font-weight: 800;
        color: #ffffff;
        text-shadow: 0 2px 10px rgba(249, 115, 22, 0.3);
    }

    /* Orders Section */
    .orders-section {
        position: relative;
        z-index: 1;
    }

    .section-title {
        font-size: 2rem;
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 2rem;
        text-shadow: 0 2px 10px rgba(249, 115, 22, 0.3);
    }

    .orders-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 2rem;
    }

    .order-card {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        overflow: hidden;
        transition: all 0.3s;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .order-card:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-6px);
        box-shadow: 0 12px 40px rgba(249, 115, 22, 0.2);
        border-color: rgba(249, 115, 22, 0.3);
    }

    .order-image-container {
        position: relative;
        width: 100%;
        height: 200px;
        overflow: hidden;
        background: linear-gradient(135deg, var(--primary-lighter) 0%, #fff 100%);
    }

    .order-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .order-badge {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: var(--primary);
        color: white;
        padding: 0.375rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
    }

    .order-badge.ebook {
        background: var(--secondary);
    }

    .order-badge.seminar {
        background: var(--primary);
    }

    .order-content {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        flex: 1;
    }

    .order-header {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .order-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #ffffff;
        margin: 0;
    }

    .order-kode {
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.6);
        font-family: monospace;
    }

    .order-info {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1rem;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .order-info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .order-info-label {
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 500;
    }

    .order-info-value {
        font-size: 0.875rem;
        color: #ffffff;
        font-weight: 600;
    }

    .seminar-schedule {
        background: rgba(249, 115, 22, 0.1);
        border: 1px solid rgba(249, 115, 22, 0.2);
        padding: 1rem;
        border-radius: 12px;
        margin-top: 0.5rem;
    }

    .seminar-schedule-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: #ffffff;
        margin: 0 0 0.5rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .seminar-time {
        font-size: 1rem;
        font-weight: 700;
        color: #f97316;
        margin: 0;
        text-shadow: 0 2px 10px rgba(249, 115, 22, 0.3);
    }

    .order-actions {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-top: auto;
    }

    .btn-primary, .btn-secondary {
        padding: 0.875rem 1.5rem;
        border-radius: 12px;
        font-weight: 600;
        font-size: 0.9375rem;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
        border: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        text-decoration: none;
    }

    .btn-primary {
        background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
        color: white;
        border: none;
        box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);
    }

    .btn-primary:hover {
        background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(249, 115, 22, 0.4);
    }

    .btn-secondary {
        background: transparent;
        color: #f97316;
        border: 2px solid rgba(249, 115, 22, 0.5);
    }

    .btn-secondary:hover {
        background: rgba(249, 115, 22, 0.1);
        border-color: #f97316;
    }

    .loading-state {
        grid-column: 1 / -1;
        color: rgba(255, 255, 255, 0.6);
    }

    .empty-state {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.6);
    }

    .empty-state h4 {
        color: #ffffff;
    }

    .status-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
    }

    .status-badge.status-success {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .status-badge.status-warning {
        background: rgba(251, 191, 36, 0.2);
        color: #fbbf24;
        border: 1px solid rgba(251, 191, 36, 0.3);
    }

    .status-badge.status-pending {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
        border: 1px solid rgba(239, 68, 68, 0.3);
    }

    @media (max-width: 1024px) {
        .hero-content {
            grid-template-columns: 1fr;
            gap: 3rem;
        }

        .member-card {
            max-width: 100%;
        }
    }

    @media (max-width: 768px) {
        .hero-title {
            font-size: 2.5rem;
        }

        .hero-section {
            padding: 2rem 0;
        }
        .orders-grid {
            grid-template-columns: 1fr;
        }

        .stat-cards {
            grid-template-columns: 1fr;
        }

        .card-top-section {
            flex-direction: column;
            gap: 1rem;
        }

        .card-qr-code {
            width: 70px;
            height: 70px;
            align-self: flex-end;
        }

        .ternak-properti-name {
            font-size: 0.875rem;
        }
    }
</style>
@endpush

@push('scripts')
@verbatim
<script>
    let customerData = null;

    // Ensure QRCode library is loaded
    function ensureQRCodeLibrary() {
        if (typeof QRCode !== 'undefined' && typeof QRCode.toCanvas === 'function') {
            console.log('QRCode library is available');
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            console.log('Loading QRCode library...');
            
            // Try multiple CDN sources with different versions and paths
            const cdnSources = [
                'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
                'https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.3/qrcode.min.js',
                'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
                'https://unpkg.com/qrcode@1.5.0/build/qrcode.min.js',
                'https://cdn.jsdelivr.net/npm/qrcode@1.5.0/build/qrcode.min.js'
            ];

            let currentIndex = 0;
            let timeoutId = null;

            const tryLoad = () => {
                if (currentIndex >= cdnSources.length) {
                    // If all CDN failed, try to use QR code API as fallback
                    console.warn('All CDN sources failed, QR code will use API fallback');
                    resolve(); // Resolve anyway, we'll handle it in generate function
                    return;
                }

                const script = document.createElement('script');
                script.src = cdnSources[currentIndex];
                script.async = true; // Use async for better loading

                // Set timeout for each attempt (5 seconds)
                timeoutId = setTimeout(() => {
                    if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                    console.warn('Timeout loading from:', cdnSources[currentIndex]);
                    currentIndex++;
                    tryLoad();
                }, 5000);

                script.onload = () => {
                    clearTimeout(timeoutId);
                    // Wait a bit for library to initialize
                    setTimeout(() => {
                        if (typeof QRCode !== 'undefined' && typeof QRCode.toCanvas === 'function') {
                            console.log('QRCode library loaded from:', cdnSources[currentIndex]);
                            resolve();
                        } else {
                            console.warn('Library loaded but QRCode object not found');
                            currentIndex++;
                            tryLoad();
                        }
                    }, 100);
                };

                script.onerror = () => {
                    clearTimeout(timeoutId);
                    console.warn('Failed to load from:', cdnSources[currentIndex]);
                    currentIndex++;
                    tryLoad();
                };

                document.head.appendChild(script);
            };

            tryLoad();
        });
    }

    function scrollToOrders() {
        document.getElementById('orders-section').scrollIntoView({ behavior: 'smooth' });
    }

    function getStatusClass(statusOrder, statusPembayaran) {
        if (statusPembayaran === '1' || statusPembayaran === 1) {
            if (statusOrder === '2' || statusOrder === 2) {
                return 'success';
            }
            return 'warning';
        }
        return 'pending';
    }

    function getStatusText(statusOrder, statusPembayaran) {
        if (statusPembayaran === '1' || statusPembayaran === 1) {
            if (statusOrder === '2' || statusOrder === 2) {
                return 'Selesai';
            }
            return 'Diproses';
        }
        return 'Menunggu Pembayaran';
    }

    async function renderMemberCard(customer) {
        if (!customer) return;

        // Update member card data
        const memberName = (customer.nama || '-').toUpperCase();
        document.getElementById('member-name').textContent = memberName;
        
        const membership = (customer.keanggotaan || 'Bronze').toUpperCase();
        document.getElementById('member-title').textContent = membership;
        
        // Format member ID seperti nomor kartu (4 digit per grup)
        const memberID = customer.memberID || '0000000000000000';
        const formattedID = memberID.match(/.{1,4}/g)?.join(' ') || memberID;
        document.getElementById('member-id').textContent = formattedID;

        // Update nama ternak properti (hardcode)
        document.getElementById('ternak-properti-name').textContent = 'TERNAK PROPERTI';

        // Generate QR Code dengan warna kuning
        const qrCodeContainer = document.getElementById('card-qr-code');
        if (!qrCodeContainer) {
            console.error('QR Code container not found');
            return;
        }

        // Validate memberID
        if (!memberID || memberID === '0000000000000000') {
            console.warn('Invalid memberID:', memberID);
            qrCodeContainer.innerHTML = '<div style="color: #000; font-size: 10px; text-align: center; padding: 8px;">No ID</div>';
            return;
        }

        // Function to generate QR code using API fallback
        const generateQRCodeWithAPI = (memberID) => {
            // Use QR code API as fallback
            const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=64x64&data=${encodeURIComponent(memberID)}&color=000000&bgcolor=fbbf24`;
            const img = document.createElement('img');
            img.src = apiUrl;
            img.alt = 'QR Code';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.borderRadius = '4px';
            img.onload = () => {
                console.log('QR Code generated via API for memberID:', memberID);
            };
            img.onerror = () => {
                console.error('Failed to load QR code from API');
                qrCodeContainer.innerHTML = '<div style="color: #000; font-size: 10px; text-align: center; padding: 8px;">QR Error</div>';
            };
            qrCodeContainer.innerHTML = '';
            qrCodeContainer.appendChild(img);
        };

        // Function to generate QR code
        const generateQRCode = async () => {
            // Check if QRCode library is available
            if (typeof QRCode === 'undefined' || typeof QRCode.toCanvas !== 'function') {
                console.warn('QRCode library not available, attempting to load...');
                try {
                    await ensureQRCodeLibrary();
                } catch (error) {
                    console.error('Failed to load QRCode library:', error);
                }
                
                // If still not available after loading attempt, use API fallback
                if (typeof QRCode === 'undefined' || typeof QRCode.toCanvas !== 'function') {
                    console.log('Using API fallback for QR code generation');
                    generateQRCodeWithAPI(memberID);
                    return;
                }
            }

            try {
                // Clear container
                qrCodeContainer.innerHTML = '';
                
                // Create canvas element
                const canvas = document.createElement('canvas');
                qrCodeContainer.appendChild(canvas);
                
                // Generate QR code dengan warna kuning (hitam di atas kuning)
                QRCode.toCanvas(canvas, memberID, {
                    width: 64,
                    height: 64,
                    colorDark: '#000000',
                    colorLight: '#fbbf24',
                    margin: 1,
                    errorCorrectionLevel: 'M'
                }, function (error) {
                    if (error) {
                        console.error('Error generating QR code:', error);
                        // Fallback to API if canvas generation fails
                        generateQRCodeWithAPI(memberID);
                    } else {
                        console.log('QR Code generated successfully for memberID:', memberID);
                    }
                });
            } catch (error) {
                console.error('Exception generating QR code:', error);
                // Fallback to API if exception occurs
                generateQRCodeWithAPI(memberID);
            }
        };

        // Generate QR code
        generateQRCode();
    }

    // Download Member Card as Image
    async function downloadMemberCard() {
        try {
            const card = document.getElementById('member-card');
            if (!card) {
                alert('Kartu member tidak ditemukan');
                return;
            }

            // Check if html2canvas is loaded
            if (typeof html2canvas === 'undefined') {
                alert('Fitur download sedang dimuat, silakan coba lagi dalam beberapa saat');
                return;
            }

            // Show loading
            const btn = event.target.closest('.card-action-btn');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span>Memproses...</span>';

            // Capture card with html2canvas
            const canvas = await html2canvas(card, {
                backgroundColor: '#000000',
                scale: 3,
                logging: false,
                useCORS: true,
                allowTaint: false,
                width: card.offsetWidth,
                height: card.offsetHeight
            });

            // Convert to blob and download
            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const customerName = document.getElementById('welcome-name')?.textContent || 'member';
                link.download = `kartu-member-${customerName.replace(/\s+/g, '-')}-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                // Restore button
                btn.disabled = false;
                btn.innerHTML = originalText;
            }, 'image/png', 1.0);

        } catch (error) {
            console.error('Error downloading card:', error);
            alert('Terjadi kesalahan saat mengunduh kartu. Silakan coba lagi.');
            const btn = event.target.closest('.card-action-btn');
            if (btn) {
                btn.disabled = false;
            }
        }
    }



    // Enhanced Stars Animation
    function initStarsAnimation() {
        const canvas = document.getElementById('stars-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const stars = [];
        const numStars = 300;
        
        // Set canvas size
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Create stars with varying properties
        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.8 + 0.2,
                speed: Math.random() * 0.5 + 0.1,
                twinkleSpeed: Math.random() * 0.02 + 0.01
            });
        }
        
        // Animate stars
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            stars.forEach(star => {
                star.y += star.speed;
                if (star.y > canvas.height) {
                    star.y = 0;
                    star.x = Math.random() * canvas.width;
                }
                
                // Twinkle effect
                star.opacity += (Math.random() - 0.5) * star.twinkleSpeed;
                star.opacity = Math.max(0.2, Math.min(1, star.opacity));
                
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
                ctx.fill();
                
                // Add glow effect for brighter stars
                if (star.opacity > 0.7) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            });
            
            requestAnimationFrame(animate);
        }
        
        animate();
    }

    async function loadDashboardData() {
        try {
            const token = localStorage.getItem('customer_auth_token');
            if (!token) {
                window.location.href = '/customer/login';
                return;
            }

            const response = await fetch('/api/customer/dashboard', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('customer_auth_token');
                localStorage.removeItem('customer_data');
                window.location.href = '/customer/login';
                return;
            }

            // Check jika customer belum diverifikasi (403)
            if (response.status === 403) {
                const result = await response.json();
                if (result.verifikasi === false) {
                    // Redirect ke halaman verifikasi OTP
                    alert(result.message || 'Akun Anda belum diverifikasi. Silakan verifikasi OTP terlebih dahulu.');
                    window.location.href = result.redirect || '/customer/verify-otp';
                    return;
                }
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                const data = result.data;
                customerData = data;
                
                // Update header and welcome
                const customerName = data.customer.nama_panggilan || data.customer.nama;
                const customerNameEl = document.getElementById('customer-name');
                if (customerNameEl) {
                    customerNameEl.textContent = customerName;
                }
                const welcomeNameEl = document.getElementById('welcome-name');
                if (welcomeNameEl) {
                    welcomeNameEl.textContent = customerName;
                }

                // Update statistik
                document.getElementById('total-order').textContent = data.statistik.total_order ?? 0;
                document.getElementById('order-aktif').textContent = data.statistik.order_aktif ?? 0;

                // Render member card
                renderMemberCard(data.customer);

                // Render orders
                renderOrders(data.orders_aktif);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            document.getElementById('orders-container').innerHTML = 
                '<div class="loading-state"><p style="color: var(--danger);">Terjadi kesalahan saat memuat data</p></div>';
        }
    }

    function renderOrders(orders) {
        const container = document.getElementById('orders-container');
        const emptyState = document.getElementById('empty-state');

        if (!orders || orders.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'grid';
        emptyState.style.display = 'none';

        container.innerHTML = orders.map(order => {
            const isSeminar = order.tipe_produk === 'seminar';
            const isEbook = order.tipe_produk === 'ebook';
            
            // Ambil gambar pertama atau default
            const imageUrl = order.gambar && order.gambar.length > 0 
                ? order.gambar[0] 
                : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5NzMxNiIgZmlsbC1vcGFjaXR5PSIwLjEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxOHB4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iI2Y5NzMxNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

            let seminarInfo = '';
            let actionButtons = '';

            if (isSeminar && order.webinar) {
                const webinar = order.webinar;
                const startTime = webinar.start_time_formatted || webinar.start_time || 'Belum dijadwalkan';
                
                seminarInfo = `
                    <div class="seminar-schedule">
                        <div class="seminar-schedule-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Jadwal Seminar
                        </div>
                        <p class="seminar-time">${startTime}</p>
                    </div>
                `;

                if (webinar.join_url) {
                    const token = localStorage.getItem('customer_auth_token');
                    const joinUrl = token 
                        ? `/customer/order/${order.id}/join?token=${encodeURIComponent(token)}`
                        : `/customer/order/${order.id}/join`;
                    actionButtons = `
                        <a href="${joinUrl}" class="btn-primary">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 12L9 8V16L15 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                            </svg>
                            Join Seminar
                        </a>
                    `;
                }
            }

            if (isEbook && order.ebook_url) {
                actionButtons = `
                    <a href="${order.ebook_url}" target="_blank" class="btn-primary">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M4 6V19.5C4 20.163 4.26339 20.7989 4.73223 21.2678C5.20107 21.7366 5.83696 22 6.5 22H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M4 6C4 5.33696 4.26339 4.70107 4.73223 4.23223C5.20107 3.76339 5.83696 3.5 6.5 3.5H20V17H6.5C5.83696 17 5.20107 16.7366 4.73223 16.2678C4.26339 15.7989 4 15.163 4 14.5V6Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M8 8H16M8 12H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Buka Ebook
                    </a>
                `;
            }

            return `
                <div class="order-card">
                    <div class="order-image-container">
                        <img src="${imageUrl}" alt="${order.produk_nama || 'Produk'}" class="order-image" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5NzMxNiIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4='">
                        <span class="order-badge ${order.tipe_produk}">${order.tipe_produk === 'seminar' ? 'Seminar' : 'Ebook'}</span>
                    </div>
                    <div class="order-content">
                        <div class="order-header">
                            <h4 class="order-title">${order.produk_nama || 'Produk'}</h4>
                            <span class="order-kode">${order.produk_kode || '-'}</span>
                        </div>
                        <div class="order-info">
                            <div class="order-info-item">
                                <span class="order-info-label">Total Harga</span>
                                <span class="order-info-value">${order.total_harga_formatted}</span>
                            </div>
                            <div class="order-info-item">
                                <span class="order-info-label">Tanggal Order</span>
                                <span class="order-info-value">${order.tanggal_order || '-'}</span>
                            </div>
                            <div class="order-info-item">
                                <span class="order-info-label">Status</span>
                                <span class="order-info-value">
                                    <span class="status-badge status-${getStatusClass(order.status_order, order.status_pembayaran)}">
                                        ${getStatusText(order.status_order, order.status_pembayaran)}
                                    </span>
                                </span>
                            </div>
                        </div>
                        ${seminarInfo}
                        ${actionButtons ? '<div class="order-actions">' + actionButtons + '</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Check html2canvas availability
    function checkHtml2Canvas() {
        if (typeof html2canvas === 'undefined') {
            console.warn('html2canvas not loaded, download feature may not work');
            // Try to load it
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
            script.onload = function() {
                console.log('html2canvas loaded successfully');
            };
            document.head.appendChild(script);
        }
    }

    // Load data when page loads
    document.addEventListener('DOMContentLoaded', async function() {
        checkHtml2Canvas();
        initStarsAnimation();
        
        // Ensure QRCode library is loaded before loading dashboard data
        try {
            await ensureQRCodeLibrary();
        } catch (error) {
            console.error('Failed to load QRCode library:', error);
        }
        
        loadDashboardData();
    });
</script>
@endverbatim
@endpush


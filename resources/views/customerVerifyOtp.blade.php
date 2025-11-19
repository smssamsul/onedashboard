<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifikasi OTP - One Dashboard</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            min-height: 100vh;
            display: flex;
            overflow: hidden;
        }

        .login-wrapper {
            display: flex;
            width: 100%;
            min-height: 100vh;
        }

        /* Left Side - OTP Form */
        .login-form-section {
            width: 50%;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 3rem;
            overflow-y: auto;
        }

        .login-container {
            width: 100%;
            max-width: 450px;
        }

        .login-logo {
            margin-bottom: 1.5rem;
        }

        .login-logo h1 {
            font-size: 2rem;
            font-weight: 700;
            color: #1c1917;
            margin-bottom: 0.25rem;
        }

        .login-logo p {
            font-size: 0.9375rem;
            color: #78716c;
            margin: 0;
        }

        .login-container h2 {
            font-size: 1.75rem;
            font-weight: 600;
            color: #1c1917;
            margin-bottom: 0.5rem;
        }

        .login-description {
            font-size: 0.9375rem;
            color: #78716c;
            margin-bottom: 2rem;
            line-height: 1.6;
        }

        .otp-info {
            background: #fef3c7;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1.5rem;
            font-size: 0.875rem;
            color: #92400e;
        }

        .otp-info strong {
            display: block;
            margin-bottom: 0.25rem;
            color: #78350f;
        }

        .form-group {
            margin-bottom: 1.5rem;
        }

        .form-group label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: #1c1917;
            margin-bottom: 0.5rem;
        }

        .otp-input-container {
            display: flex;
            gap: 0.75rem;
            justify-content: center;
            margin-bottom: 1.5rem;
        }

        .otp-input {
            width: 50px;
            height: 60px;
            text-align: center;
            font-size: 1.5rem;
            font-weight: 600;
            color: #1c1917;
            background: #fafafa;
            border: 2px solid #e7e5e4;
            border-radius: 8px;
            outline: none;
            transition: all 0.2s;
        }

        .otp-input:focus {
            border-color: #f97316;
            background: #ffffff;
            box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
        }

        .otp-input.filled {
            border-color: #f97316;
            background: #fff7ed;
        }

        .resend-otp {
            text-align: center;
            margin-bottom: 1.5rem;
            font-size: 0.875rem;
            color: #78716c;
        }

        .resend-otp a {
            color: #f97316;
            text-decoration: none;
            font-weight: 500;
            cursor: pointer;
        }

        .resend-otp a:hover {
            text-decoration: underline;
        }

        .resend-otp a:disabled {
            color: #a8a29e;
            cursor: not-allowed;
            text-decoration: none;
        }

        .countdown {
            color: #f97316;
            font-weight: 600;
        }

        .login-btn {
            width: 100%;
            padding: 0.875rem 1.5rem;
            font-size: 1rem;
            font-weight: 600;
            color: #ffffff;
            background: #f97316;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 1.5rem;
        }

        .login-btn:hover {
            background: #ea580c;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }

        .login-btn:active {
            transform: translateY(0);
        }

        .login-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .error-message {
            color: #ef4444;
            background: #fef2f2;
            border: 1px solid #fecaca;
            padding: 0.875rem 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            font-size: 0.875rem;
            display: none;
        }

        .error-message.show {
            display: block;
        }

        .success-message {
            color: #22c55e;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            padding: 0.875rem 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            font-size: 0.875rem;
            display: none;
        }

        .success-message.show {
            display: block;
        }

        .loading {
            text-align: center;
            color: #78716c;
            margin-top: 1rem;
            font-size: 0.875rem;
            display: none;
        }

        .loading.show {
            display: block;
        }

        .back-link {
            text-align: center;
            font-size: 0.875rem;
            color: #78716c;
        }

        .back-link a {
            color: #f97316;
            text-decoration: none;
            font-weight: 500;
        }

        .back-link a:hover {
            text-decoration: underline;
        }

        /* Right Side - Slideshow */
        .slideshow-section {
            width: 50%;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            position: relative;
            overflow: hidden;
        }

        .slideshow-container {
            position: relative;
            width: 100%;
            height: 100%;
        }

        .slide {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            transition: opacity 1s ease-in-out;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem;
            color: #ffffff;
        }

        .slide.active {
            opacity: 1;
        }

        .slide-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 0;
            opacity: 0.3;
        }

        .slide-content {
            position: relative;
            z-index: 1;
            max-width: 500px;
            text-align: center;
        }

        .slide-content h3 {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 1rem;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }

        .slide-content p {
            font-size: 1.125rem;
            line-height: 1.8;
            opacity: 0.95;
            text-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
        }

        .slide-indicators {
            position: absolute;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 0.5rem;
            z-index: 2;
        }

        .indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            cursor: pointer;
            transition: all 0.3s;
        }

        .indicator.active {
            background: #ffffff;
            width: 30px;
            border-radius: 5px;
        }

        .slide-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: #ffffff;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            cursor: pointer;
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            backdrop-filter: blur(10px);
        }

        .slide-nav:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .slide-nav.prev {
            left: 2rem;
        }

        .slide-nav.next {
            right: 2rem;
        }

        .slide-nav svg {
            width: 24px;
            height: 24px;
        }

        /* Responsive */
        @media (max-width: 968px) {
            .login-wrapper {
                flex-direction: column;
            }

            .login-form-section {
                width: 100%;
                min-height: 60vh;
            }

            .slideshow-section {
                width: 100%;
                min-height: 40vh;
            }

            .slide-content h3 {
                font-size: 1.5rem;
            }

            .slide-content p {
                font-size: 1rem;
            }
        }

        @media (max-width: 640px) {
            .login-form-section {
                padding: 2rem 1.5rem;
            }

            .slideshow-section {
                min-height: 30vh;
            }

            .slide {
                padding: 2rem 1.5rem;
            }

            .slide-content h3 {
                font-size: 1.25rem;
            }

            .slide-content p {
                font-size: 0.9375rem;
            }

            .slide-nav {
                display: none;
            }

            .otp-input-container {
                gap: 0.5rem;
            }

            .otp-input {
                width: 45px;
                height: 55px;
                font-size: 1.25rem;
            }
        }
    </style>
</head>
<body>
    <div class="login-wrapper">
        <!-- Left Side - OTP Form -->
        <div class="login-form-section">
            <div class="login-container">
                <div class="login-logo">
                    <h1>One Dashboard</h1>
                    <p>Ternak Properti</p>
                </div>
                
                <h2>Verifikasi OTP</h2>
                <p class="login-description">Masukkan kode OTP 6 digit yang telah dikirim ke WhatsApp Anda untuk memverifikasi akun.</p>

                <div id="otpInfo" class="otp-info" style="display: none;">
                    <strong>Kode OTP telah dikirim ke:</strong>
                    <span id="phoneNumber"></span>
                </div>

                <div id="errorMessage" class="error-message"></div>
                <div id="successMessage" class="success-message"></div>
                <div id="loading" class="loading">Memproses...</div>

                <form id="verifyOtpForm">
                    <!-- Tidak perlu customer_id karena sudah login, ambil dari token -->

                    <div class="form-group">
                        <label for="otp">Kode OTP</label>
                        <div class="otp-input-container" id="otpContainer">
                            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off" id="otp1">
                            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off" id="otp2">
                            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off" id="otp3">
                            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off" id="otp4">
                            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off" id="otp5">
                            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" pattern="[0-9]" autocomplete="off" id="otp6">
                        </div>
                    </div>

                    <div class="resend-otp">
                        Tidak menerima kode? 
                        <a href="#" id="resendLink" onclick="resendOtp(event)">
                            Kirim ulang OTP
                        </a>
                        <span id="countdown" class="countdown" style="display: none;"></span>
                    </div>

                    <button type="submit" class="login-btn" id="submitBtn">Verifikasi</button>
                </form>

                <div class="back-link">
                    Kembali ke <a href="/customer/login">Halaman Login</a>
                </div>
            </div>
        </div>

        <!-- Right Side - Slideshow -->
        <div class="slideshow-section">
            <div class="slideshow-container">
                <!-- Slide 1 -->
                <div class="slide active">
                    <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Property Investment" class="slide-image">
                    <div class="slide-content">
                        <h3>Keamanan Akun Anda</h3>
                        <p>Verifikasi OTP memastikan keamanan akun Anda dan melindungi data penting dari akses tidak sah.</p>
                    </div>
                </div>

                <!-- Slide 2 -->
                <div class="slide">
                    <img src="https://images.unsplash.com/photo-1511578314322-379afb476865?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Property Seminar" class="slide-image">
                    <div class="slide-content">
                        <h3>Kode OTP Anda</h3>
                        <p>Kode OTP telah dikirim ke nomor WhatsApp Anda. Kode ini berlaku selama 5 menit.</p>
                    </div>
                </div>

                <!-- Slide 3 -->
                <div class="slide">
                    <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Property Resources" class="slide-image">
                    <div class="slide-content">
                        <h3>Akses Dashboard</h3>
                        <p>Setelah verifikasi, Anda dapat mengakses dashboard dan semua layanan yang tersedia untuk Anda.</p>
                    </div>
                </div>

                <!-- Slide 4 -->
                <div class="slide">
                    <img src="https://images.unsplash.com/photo-1497215842964-222b430dc094?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Success Stories" class="slide-image">
                    <div class="slide-content">
                        <h3>Keamanan Terjamin</h3>
                        <p>Jangan bagikan kode OTP Anda kepada siapapun untuk menjaga keamanan akun Anda.</p>
                    </div>
                </div>

                <!-- Navigation Buttons -->
                <button class="slide-nav prev" onclick="changeSlide(-1)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <button class="slide-nav next" onclick="changeSlide(1)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>

                <!-- Indicators -->
                <div class="slide-indicators">
                    <span class="indicator active" onclick="goToSlide(0)"></span>
                    <span class="indicator" onclick="goToSlide(1)"></span>
                    <span class="indicator" onclick="goToSlide(2)"></span>
                    <span class="indicator" onclick="goToSlide(3)"></span>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Slideshow functionality
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slide');
        const indicators = document.querySelectorAll('.indicator');
        const totalSlides = slides.length;

        function showSlide(index) {
            if (index >= totalSlides) {
                currentSlide = 0;
            } else if (index < 0) {
                currentSlide = totalSlides - 1;
            } else {
                currentSlide = index;
            }

            slides.forEach((slide, i) => {
                slide.classList.toggle('active', i === currentSlide);
            });

            indicators.forEach((indicator, i) => {
                indicator.classList.toggle('active', i === currentSlide);
            });
        }

        function changeSlide(direction) {
            showSlide(currentSlide + direction);
        }

        function goToSlide(index) {
            showSlide(index);
        }

        let slideInterval = setInterval(() => {
            changeSlide(1);
        }, 5000);

        const slideshowSection = document.querySelector('.slideshow-section');
        slideshowSection.addEventListener('mouseenter', () => {
            clearInterval(slideInterval);
        });

        slideshowSection.addEventListener('mouseleave', () => {
            slideInterval = setInterval(() => {
                changeSlide(1);
            }, 5000);
        });

        // OTP Input handling
        const otpInputs = document.querySelectorAll('.otp-input');
        
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', function(e) {
                if (this.value.length === 1) {
                    this.classList.add('filled');
                    if (index < otpInputs.length - 1) {
                        otpInputs[index + 1].focus();
                    }
                } else {
                    this.classList.remove('filled');
                }
            });

            input.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && this.value === '' && index > 0) {
                    otpInputs[index - 1].focus();
                    otpInputs[index - 1].value = '';
                    otpInputs[index - 1].classList.remove('filled');
                }
            });

            input.addEventListener('paste', function(e) {
                e.preventDefault();
                const paste = (e.clipboardData || window.clipboardData).getData('text');
                const digits = paste.replace(/\D/g, '').slice(0, 6);
                
                digits.split('').forEach((digit, i) => {
                    if (otpInputs[i]) {
                        otpInputs[i].value = digit;
                        otpInputs[i].classList.add('filled');
                    }
                });
                
                if (digits.length === 6) {
                    otpInputs[5].focus();
                } else if (digits.length > 0) {
                    otpInputs[digits.length].focus();
                }
            });
        });

        // Countdown timer
        let countdownTimer = null;
        let countdownSeconds = 60;

        function startCountdown() {
            const countdownEl = document.getElementById('countdown');
            const resendLink = document.getElementById('resendLink');
            
            countdownEl.style.display = 'inline';
            resendLink.style.display = 'none';
            resendLink.parentElement.style.pointerEvents = 'none';

            countdownTimer = setInterval(() => {
                countdownSeconds--;
                countdownEl.textContent = ` (${countdownSeconds}s)`;

                if (countdownSeconds <= 0) {
                    clearInterval(countdownTimer);
                    countdownEl.style.display = 'none';
                    resendLink.style.display = 'inline';
                    resendLink.parentElement.style.pointerEvents = 'auto';
                    countdownSeconds = 60;
                }
            }, 1000);
        }

        // Get OTP value
        function getOtpValue() {
            return Array.from(otpInputs).map(input => input.value).join('');
        }

        // Verify OTP
        document.getElementById('verifyOtpForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const errorMessage = document.getElementById('errorMessage');
            const successMessage = document.getElementById('successMessage');
            const loading = document.getElementById('loading');
            const otp = getOtpValue();

            // Cek token dari localStorage
            const token = localStorage.getItem('customer_auth_token') || sessionStorage.getItem('customer_auth_token');

            if (!token) {
                errorMessage.textContent = 'Anda belum login. Silakan login terlebih dahulu.';
                errorMessage.classList.add('show');
                setTimeout(() => {
                    window.location.href = '/customer/login';
                }, 2000);
                return;
            }

            if (otp.length !== 6) {
                errorMessage.textContent = 'Silakan masukkan kode OTP lengkap (6 digit)';
                errorMessage.classList.add('show');
                return;
            }

            errorMessage.classList.remove('show');
            successMessage.classList.remove('show');
            loading.classList.add('show');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Memverifikasi...';

            try {
                const response = await fetch('/api/customer/otp/verify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': 'Bearer ' + token,
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: JSON.stringify({
                        otp: otp
                    })
                });

                const data = await response.json();
                loading.classList.remove('show');

                if (response.status === 401) {
                    // Token expired atau tidak valid
                    errorMessage.textContent = 'Session Anda telah berakhir. Silakan login kembali.';
                    errorMessage.classList.add('show');
                    
                    // Clear token dan redirect
                    localStorage.removeItem('customer_auth_token');
                    sessionStorage.removeItem('customer_auth_token');
                    localStorage.removeItem('customer_data');
                    
                    setTimeout(() => {
                        window.location.href = '/customer/login';
                    }, 2000);
                    return;
                }

                if (response.ok && data.success) {
                    successMessage.textContent = data.message || 'Verifikasi berhasil! Mengalihkan...';
                    successMessage.classList.add('show');

                    setTimeout(() => {
                        window.location.href = '/customer/dashboard';
                    }, 1500);
                } else {
                    errorMessage.textContent = data.message || 'Kode OTP tidak valid';
                    errorMessage.classList.add('show');
                    
                    // Clear OTP inputs on error
                    otpInputs.forEach(input => {
                        input.value = '';
                        input.classList.remove('filled');
                    });
                    otpInputs[0].focus();
                    
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Verifikasi';
                }
            } catch (error) {
                loading.classList.remove('show');
                errorMessage.textContent = 'Terjadi kesalahan. Silakan coba lagi.';
                errorMessage.classList.add('show');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Verifikasi';
                console.error('Error:', error);
            }
        });

        // Resend OTP
        async function resendOtp(e) {
            e.preventDefault();
            
            const resendLink = document.getElementById('resendLink');
            const errorMessage = document.getElementById('errorMessage');
            const successMessage = document.getElementById('successMessage');
            const loading = document.getElementById('loading');
            
            // Cek token dari localStorage
            const token = localStorage.getItem('customer_auth_token') || sessionStorage.getItem('customer_auth_token');

            if (!token) {
                errorMessage.textContent = 'Anda belum login. Silakan login terlebih dahulu.';
                errorMessage.classList.add('show');
                setTimeout(() => {
                    window.location.href = '/customer/login';
                }, 2000);
                return;
            }

            resendLink.style.pointerEvents = 'none';
            resendLink.textContent = 'Mengirim...';
            loading.classList.add('show');

            try {
                const response = await fetch('/api/customer/otp/resend', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': 'Bearer ' + token,
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    }
                });

                const data = await response.json();
                loading.classList.remove('show');

                if (response.status === 401) {
                    // Token expired atau tidak valid
                    errorMessage.textContent = 'Session Anda telah berakhir. Silakan login kembali.';
                    errorMessage.classList.add('show');
                    
                    // Clear token dan redirect
                    localStorage.removeItem('customer_auth_token');
                    sessionStorage.removeItem('customer_auth_token');
                    localStorage.removeItem('customer_data');
                    
                    setTimeout(() => {
                        window.location.href = '/customer/login';
                    }, 2000);
                    return;
                }

                if (response.ok && data.success) {
                    successMessage.textContent = data.message || 'OTP baru berhasil dikirim';
                    successMessage.classList.add('show');
                    
                    // Reset countdown
                    clearInterval(countdownTimer);
                    countdownSeconds = 60;
                    startCountdown();
                    
                    // Clear OTP inputs
                    otpInputs.forEach(input => {
                        input.value = '';
                        input.classList.remove('filled');
                    });
                    otpInputs[0].focus();
                    
                    resendLink.style.pointerEvents = 'auto';
                    resendLink.textContent = 'Kirim ulang OTP';
                } else {
                    errorMessage.textContent = data.message || 'Gagal mengirim ulang OTP';
                    errorMessage.classList.add('show');
                    resendLink.style.pointerEvents = 'auto';
                    resendLink.textContent = 'Kirim ulang OTP';
                }
            } catch (error) {
                loading.classList.remove('show');
                errorMessage.textContent = 'Gagal mengirim ulang OTP. Silakan coba lagi.';
                errorMessage.classList.add('show');
                resendLink.style.pointerEvents = 'auto';
                resendLink.textContent = 'Kirim ulang OTP';
                console.error('Error:', error);
            }
        }


        // Check if user is logged in
        const token = localStorage.getItem('customer_auth_token') || sessionStorage.getItem('customer_auth_token');
        if (!token) {
            // Redirect to login if not logged in
            window.location.href = '/customer/login';
        } else {
            // Load customer data and show phone number
            const customerData = localStorage.getItem('customer_data');
            if (customerData) {
                try {
                    const customer = JSON.parse(customerData);
                    if (customer.wa) {
                        // Mask phone number
                        const phone = customer.wa;
                        const length = phone.length;
                        const visible = phone.substring(length - 3);
                        const masked = '*'.repeat(length - 3) + visible;
                        
                        document.getElementById('phoneNumber').textContent = masked;
                        document.getElementById('otpInfo').style.display = 'block';
                    }
                } catch (e) {
                    console.error('Error parsing customer data:', e);
                }
            }
            
            // Start countdown on page load
            startCountdown();

            // Auto focus first OTP input
            otpInputs[0].focus();
        }
    </script>
</body>
</html>


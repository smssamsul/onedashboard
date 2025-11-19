<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Customer - One Dashboard</title>
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

        /* Left Side - Login Form */
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

        .form-group input {
            width: 100%;
            padding: 0.875rem 1rem;
            font-size: 0.9375rem;
            color: #1c1917;
            background: #fafafa;
            border: 1px solid #e7e5e4;
            border-radius: 8px;
            outline: none;
            transition: all 0.2s;
        }

        .form-group input:focus {
            border-color: #f97316;
            background: #ffffff;
            box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
        }

        .form-group input::placeholder {
            color: #a8a29e;
        }

        .form-options {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            font-size: 0.875rem;
        }

        .remember-me {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #1c1917;
        }

        .remember-me input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: #f97316;
        }

        .forgot-password {
            color: #f97316;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
        }

        .forgot-password:hover {
            color: #ea580c;
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

        .register-link {
            text-align: center;
            font-size: 0.875rem;
            color: #78716c;
        }

        .register-link a {
            color: #f97316;
            text-decoration: none;
            font-weight: 500;
        }

        .register-link a:hover {
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
        }
    </style>
</head>
<body>
    <div class="login-wrapper">
        <!-- Left Side - Login Form -->
        <div class="login-form-section">
            <div class="login-container">
                <div class="login-logo">
                    <h1>One Dashboard</h1>
                    <p>Ternak Properti</p>
                </div>
                
                <h2>Login to Your Account</h2>
                <p class="login-description">Selamat datang kembali! Masuk ke akun Anda untuk mengakses dashboard dan layanan kami.</p>

                <div id="errorMessage" class="error-message"></div>
                <div id="successMessage" class="success-message"></div>
                <div id="loading" class="loading">Memproses...</div>

                <form id="loginForm">
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            placeholder="your-email@gmail.com" 
                            required
                            autofocus>
                    </div>

                    <div class="form-group">
                        <label for="password">Password</label>
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            placeholder="Your Password" 
                            required>
                    </div>

                    <div class="form-options">
                        <label class="remember-me">
                            <input type="checkbox" id="remember" checked>
                            <span>Remember me</span>
                        </label>
                        <a href="#" class="forgot-password">Forgot Password?</a>
                    </div>

                    <button type="submit" class="login-btn" id="submitBtn">Log In</button>
                </form>

                <div class="register-link">
                    Belum punya akun? <a href="#">Daftar Sekarang</a>
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
                        <h3>Investasi Properti yang Menguntungkan</h3>
                        <p>Pelajari strategi investasi properti yang terbukti menguntungkan dan bangun portofolio properti impian Anda bersama kami.</p>
                    </div>
                </div>

                <!-- Slide 2 -->
                <div class="slide">
                    <img src="https://images.unsplash.com/photo-1511578314322-379afb476865?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Property Seminar" class="slide-image">
                    <div class="slide-content">
                        <h3>Seminar & Workshop Terbaru</h3>
                        <p>Ikuti seminar dan workshop eksklusif dari para ahli properti untuk mengembangkan pengetahuan dan network bisnis Anda.</p>
                    </div>
                </div>

                <!-- Slide 3 -->
                <div class="slide">
                    <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Property Resources" class="slide-image">
                    <div class="slide-content">
                        <h3>Ebook & Materi Lengkap</h3>
                        <p>Akses ebook, panduan, dan materi lengkap tentang investasi properti yang dapat membantu kesuksesan investasi Anda.</p>
                    </div>
                </div>

                <!-- Slide 4 -->
                <div class="slide">
                    <img src="https://images.unsplash.com/photo-1497215842964-222b430dc094?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Success Stories" class="slide-image">
                    <div class="slide-content">
                        <h3>Kisah Sukses Member</h3>
                        <p>Dapatkan inspirasi dari kisah sukses member kami yang telah mencapai kebebasan finansial melalui investasi properti.</p>
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
            // Handle wrap-around
            if (index >= totalSlides) {
                currentSlide = 0;
            } else if (index < 0) {
                currentSlide = totalSlides - 1;
            } else {
                currentSlide = index;
            }

            // Update slides
            slides.forEach((slide, i) => {
                slide.classList.toggle('active', i === currentSlide);
            });

            // Update indicators
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

        // Auto-play slideshow
        let slideInterval = setInterval(() => {
            changeSlide(1);
        }, 5000);

        // Pause on hover
        const slideshowSection = document.querySelector('.slideshow-section');
        slideshowSection.addEventListener('mouseenter', () => {
            clearInterval(slideInterval);
        });

        slideshowSection.addEventListener('mouseleave', () => {
            slideInterval = setInterval(() => {
                changeSlide(1);
            }, 5000);
        });

        // Login form functionality
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const errorMessage = document.getElementById('errorMessage');
            const successMessage = document.getElementById('successMessage');
            const loading = document.getElementById('loading');
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Reset messages
            errorMessage.classList.remove('show');
            successMessage.classList.remove('show');
            loading.classList.add('show');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Memproses...';

            try {
                const response = await fetch('/api/customer/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                });

                const data = await response.json();
                loading.classList.remove('show');

                if (response.ok && data.success) {
                    // Store token in localStorage with customer prefix
                    if (data.token) {
                        localStorage.setItem('customer_auth_token', data.token);
                        localStorage.setItem('customer_data', JSON.stringify(data.user));
                    }

                    successMessage.textContent = data.message || 'Login berhasil! Mengalihkan...';
                    successMessage.classList.add('show');

                    // Redirect after 1 second
                    setTimeout(() => {
                        window.location.href = '/customer/dashboard';
                    }, 1000);
                } else {
                    // Show error message
                    let errorMsg = 'Email atau password salah';
                    
                    if (data.message) {
                        errorMsg = data.message;
                    } else if (data.errors) {
                        const errorKeys = Object.keys(data.errors);
                        if (errorKeys.length > 0) {
                            errorMsg = data.errors[errorKeys[0]][0];
                        }
                    }
                    
                    errorMessage.textContent = errorMsg;
                    errorMessage.classList.add('show');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Log In';
                }
            } catch (error) {
                loading.classList.remove('show');
                errorMessage.textContent = 'Terjadi kesalahan. Silakan coba lagi.';
                errorMessage.classList.add('show');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Log In';
                console.error('Error:', error);
            }
        });
    </script>
</body>
</html>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - One Dashboard</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --orange-soft: #fed7aa;
            --orange-light: #fb923c;
            --orange: #f97316;
            --orange-dark: #ea580c;
            --bg-gradient: linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%);
            --glass-bg: rgba(255, 255, 255, 0.7);
            --glass-border: rgba(255, 255, 255, 0.18);
            --text-primary: #1c1917;
            --text-secondary: #78716c;
            --shadow-sm: 0 2px 8px rgba(249, 115, 22, 0.08);
            --shadow-md: 0 8px 24px rgba(249, 115, 22, 0.12);
            --shadow-lg: 0 16px 48px rgba(249, 115, 22, 0.16);
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg-gradient);
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            position: relative;
            overflow: hidden;
        }

        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        /* Animated background shapes */
        .bg-shape {
            position: absolute;
            border-radius: 50%;
            opacity: 0.1;
            animation: float 20s ease-in-out infinite;
            pointer-events: none;
        }

        .bg-shape-1 {
            width: 400px;
            height: 400px;
            background: var(--orange);
            top: -200px;
            right: -200px;
            animation-delay: 0s;
        }

        .bg-shape-2 {
            width: 300px;
            height: 300px;
            background: var(--orange-light);
            bottom: -150px;
            left: -150px;
            animation-delay: 5s;
        }

        .bg-shape-3 {
            width: 200px;
            height: 200px;
            background: var(--orange-soft);
            top: 50%;
            left: 10%;
            animation-delay: 10s;
        }

        @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -30px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        .login-wrapper {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 480px;
            animation: fadeInUp 0.8s ease-out;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .login-container {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            padding: 3.5rem 3rem;
            border-radius: 24px;
            border: 1px solid var(--glass-border);
            box-shadow: var(--shadow-lg);
            position: relative;
            overflow: hidden;
        }

        .login-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--orange) 0%, var(--orange-light) 50%, var(--orange) 100%);
            background-size: 200% 100%;
            animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }

        .logo-section {
            text-align: center;
            margin-bottom: 2.5rem;
        }

        .logo-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 1.5rem;
            background: linear-gradient(135deg, var(--orange) 0%, var(--orange-light) 100%);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: var(--shadow-md);
            animation: pulse 3s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); box-shadow: var(--shadow-md); }
            50% { transform: scale(1.05); box-shadow: var(--shadow-lg); }
        }

        .logo-icon svg {
            width: 40px;
            height: 40px;
            fill: white;
        }

        .login-container h1 {
            font-size: 2rem;
            font-weight: 800;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, var(--orange-dark) 0%, var(--orange) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .login-container .subtitle {
            font-size: 0.95rem;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .form-group {
            margin-bottom: 1.5rem;
            position: relative;
        }

        .form-group label {
            display: block;
            color: var(--text-primary);
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 0.625rem;
            padding-left: 0.5rem;
        }

        .input-wrapper {
            position: relative;
        }

        .input-icon {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            width: 20px;
            height: 20px;
            color: var(--text-secondary);
            pointer-events: none;
            transition: color 0.3s ease;
        }

        .form-group input {
            width: 100%;
            padding: 0.875rem 1rem 0.875rem 3rem;
            border: 2px solid rgba(249, 115, 22, 0.1);
            border-radius: 12px;
            font-size: 0.95rem;
            outline: none;
            background: rgba(255, 255, 255, 0.8);
            color: var(--text-primary);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: inherit;
        }

        .form-group input:focus {
            border-color: var(--orange);
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.1);
            transform: translateY(-2px);
        }

        .form-group input:focus + .input-icon,
        .form-group input:not(:placeholder-shown) + .input-icon {
            color: var(--orange);
        }

        .form-group input::placeholder {
            color: var(--text-secondary);
            opacity: 0.6;
        }

        .login-btn {
            width: 100%;
            padding: 1rem;
            background: linear-gradient(135deg, var(--orange) 0%, var(--orange-dark) 100%);
            border: none;
            color: white;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: var(--shadow-md);
            margin-top: 0.5rem;
            position: relative;
            overflow: hidden;
        }

        .login-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.5s ease;
        }

        .login-btn:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .login-btn:hover::before {
            left: 100%;
        }

        .login-btn:active {
            transform: translateY(0);
        }

        .login-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
        }

        .alert {
            padding: 0.875rem 1rem;
            border-radius: 12px;
            margin-bottom: 1.25rem;
            font-size: 0.875rem;
            font-weight: 500;
            display: none;
            animation: slideDown 0.3s ease-out;
            border: 1px solid;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .alert.show {
            display: block;
        }

        .alert-error {
            background: rgba(239, 68, 68, 0.1);
            color: #dc2626;
            border-color: rgba(239, 68, 68, 0.2);
        }

        .alert-success {
            background: rgba(34, 197, 94, 0.1);
            color: #16a34a;
            border-color: rgba(34, 197, 94, 0.2);
        }

        .loading {
            display: none;
            text-align: center;
            color: var(--orange);
            margin-top: 1rem;
            font-size: 0.9rem;
            font-weight: 600;
        }

        .loading.show {
            display: block;
        }

        .loading::after {
            content: '...';
            animation: dots 1.5s steps(4, end) infinite;
        }

        @keyframes dots {
            0%, 20% { content: '.'; }
            40% { content: '..'; }
            60%, 100% { content: '...'; }
        }

        .footer-text {
            text-align: center;
            margin-top: 2rem;
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .footer-text a {
            color: var(--orange);
            text-decoration: none;
            font-weight: 600;
            transition: color 0.3s ease;
        }

        .footer-text a:hover {
            color: var(--orange-dark);
        }

        @media (max-width: 640px) {
            .login-container {
                padding: 2.5rem 2rem;
                border-radius: 20px;
            }

            .login-container h1 {
                font-size: 1.75rem;
            }

            .logo-icon {
                width: 70px;
                height: 70px;
            }

            .logo-icon svg {
                width: 35px;
                height: 35px;
            }
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 2rem 1.5rem;
            }

            .login-container h1 {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="bg-shape bg-shape-1"></div>
    <div class="bg-shape bg-shape-2"></div>
    <div class="bg-shape bg-shape-3"></div>

    <div class="login-wrapper">
        <div class="login-container">
            <div class="logo-section">
                <div class="logo-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <h1>One Dashboard</h1>
                <p class="subtitle">by Ternak Properti</p>
            </div>
            
            <div id="errorMessage" class="alert alert-error"></div>
            <div id="successMessage" class="alert alert-success"></div>
            <div id="loading" class="loading">Memproses</div>

            <form id="loginForm">
                <div class="form-group">
                    <label for="email">Email </label>
                    <div class="input-wrapper">
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            placeholder="admin@example.com" 
                            required
                            autofocus>
                        <svg class="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M22 6L12 13L2 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <div class="input-wrapper">
                        <input 
                            type="password" 
                            id="password" 
                            name="password" 
                            placeholder="Enter your password" 
                            required>
                        <svg class="input-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
                <button type="submit" class="login-btn" id="submitBtn">
                    <span id="btnText">Sign In</span>
                </button>
            </form>

            <div class="footer-text">
                <p>One Dashboard by <a href="#" target="_blank">Ternak Properti</a></p>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            const btnText = document.getElementById('btnText');
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
            btnText.textContent = 'Memproses...';

            try {
                const response = await fetch('/api/login', {
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
                    // Store token in localStorage
                    if (data.token) {
                        localStorage.setItem('auth_token', data.token);
                        localStorage.setItem('user_data', JSON.stringify(data.user));
                    }

                    successMessage.textContent = 'Login berhasil! Mengalihkan...';
                    successMessage.classList.add('show');

                    // Redirect after 1 second
                    setTimeout(() => {
                        window.location.href = '/sales/dashboard';
                    }, 1000);
                } else {
                    // Show error message
                    const errorMsg = data.message || 'Email atau password salah';
                    errorMessage.textContent = errorMsg;
                    errorMessage.classList.add('show');
                    submitBtn.disabled = false;
                    btnText.textContent = 'Sign In';
                }
            } catch (error) {
                loading.classList.remove('show');
                errorMessage.textContent = 'Terjadi kesalahan. Silakan coba lagi.';
                errorMessage.classList.add('show');
                submitBtn.disabled = false;
                btnText.textContent = 'Sign In';
                console.error('Error:', error);
            }
        });
    </script>
</body>
</html>

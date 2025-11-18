<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Customer Login - Neomorphism UI</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #e0e5ec;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .login-container {
            background: #e0e5ec;
            padding: 3rem 2.5rem;
            border-radius: 30px;
            width: 100%;
            max-width: 420px;
            box-shadow: 
                20px 20px 60px #bec4d0,
                -20px -20px 60px #ffffff;
        }

        .login-container h2 {
            margin-bottom: 2rem;
            color: #4a5568;
            text-align: center;
            font-weight: 700;
            font-size: 2rem;
            letter-spacing: -0.5px;
            text-shadow: 
                2px 2px 4px rgba(190, 196, 208, 0.5),
                -2px -2px 4px rgba(255, 255, 255, 0.8);
        }

        .form-group {
            margin-bottom: 1.75rem;
            position: relative;
        }

        .form-group label {
            display: block;
            color: #4a5568;
            font-size: 0.9rem;
            margin-bottom: 0.75rem;
            font-weight: 600;
            padding-left: 0.5rem;
        }

        .form-group input {
            width: 100%;
            padding: 1rem 1.25rem;
            border: none;
            border-radius: 20px;
            font-size: 1rem;
            outline: none;
            background: #e0e5ec;
            color: #4a5568;
            box-shadow: 
                inset 8px 8px 16px #bec4d0,
                inset -8px -8px 16px #ffffff;
            transition: all 0.3s ease;
        }

        .form-group input:focus {
            box-shadow: 
                inset 4px 4px 8px #bec4d0,
                inset -4px -4px 8px #ffffff;
        }

        .form-group input::placeholder {
            color: #a0aec0;
        }

        .login-btn {
            width: 100%;
            padding: 1.1rem;
            background: #e0e5ec;
            border: none;
            color: #4a5568;
            border-radius: 20px;
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 
                8px 8px 16px #bec4d0,
                -8px -8px 16px #ffffff;
            margin-top: 0.5rem;
        }

        .login-btn:hover {
            box-shadow: 
                4px 4px 8px #bec4d0,
                -4px -4px 8px #ffffff;
        }

        .login-btn:active {
            box-shadow: 
                inset 4px 4px 8px #bec4d0,
                inset -4px -4px 8px #ffffff;
        }

        .login-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .error-message {
            color: #e53e3e;
            text-align: center;
            margin-bottom: 1rem;
            font-size: 0.9rem;
            padding: 0.75rem 1rem;
            background: #e0e5ec;
            border-radius: 15px;
            box-shadow: 
                inset 4px 4px 8px #bec4d0,
                inset -4px -4px 8px #ffffff;
            display: none;
        }

        .error-message.show {
            display: block;
        }

        .success-message {
            color: #38a169;
            text-align: center;
            margin-bottom: 1rem;
            font-size: 0.9rem;
            padding: 0.75rem 1rem;
            background: #e0e5ec;
            border-radius: 15px;
            box-shadow: 
                inset 4px 4px 8px #bec4d0,
                inset -4px -4px 8px #ffffff;
            display: none;
        }

        .success-message.show {
            display: block;
        }

        .loading {
            display: none;
            text-align: center;
            color: #4a5568;
            margin-top: 1rem;
            font-size: 0.9rem;
        }

        .loading.show {
            display: block;
        }

        .icon-wrapper {
            display: flex;
            justify-content: center;
            margin-bottom: 1.5rem;
        }

        .icon-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #e0e5ec;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 
                8px 8px 16px #bec4d0,
                -8px -8px 16px #ffffff;
        }

        .icon-circle svg {
            width: 40px;
            height: 40px;
            fill: #4a5568;
        }

        .register-link {
            text-align: center;
            margin-top: 1.5rem;
            color: #4a5568;
            font-size: 0.9rem;
        }

        .register-link a {
            color: #4a5568;
            text-decoration: none;
            font-weight: 600;
            padding: 0.5rem 1rem;
            border-radius: 15px;
            display: inline-block;
            box-shadow: 
                4px 4px 8px #bec4d0,
                -4px -4px 8px #ffffff;
            transition: all 0.3s ease;
        }

        .register-link a:hover {
            box-shadow: 
                2px 2px 4px #bec4d0,
                -2px -2px 4px #ffffff;
        }

        .register-link a:active {
            box-shadow: 
                inset 2px 2px 4px #bec4d0,
                inset -2px -2px 4px #ffffff;
        }

        @media (max-width: 480px) {
            .login-container {
                padding: 2rem 1.5rem;
                border-radius: 25px;
            }

            .login-container h2 {
                font-size: 1.75rem;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="icon-wrapper">
            <div class="icon-circle">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
            </div>
        </div>
        <h2>Customer Login</h2>
        
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
                    placeholder="you@example.com" 
                    required
                    autofocus>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    placeholder="Enter your password" 
                    required>
            </div>
            <button type="submit" class="login-btn" id="submitBtn">Login</button>
        </form>

        <div class="register-link">
            Belum punya akun? <a href="#">Daftar Sekarang</a>
        </div>
    </div>

    <script>
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
                        // Redirect to customer dashboard or adjust this URL based on your application needs
                        window.location.href = '/api/customer/dashboard';
                    }, 1000);
                } else {
                    // Show error message
                    let errorMsg = 'Email atau password salah';
                    
                    if (data.message) {
                        errorMsg = data.message;
                    } else if (data.errors) {
                        // Handle validation errors
                        const errorKeys = Object.keys(data.errors);
                        if (errorKeys.length > 0) {
                            errorMsg = data.errors[errorKeys[0]][0];
                        }
                    }
                    
                    errorMessage.textContent = errorMsg;
                    errorMessage.classList.add('show');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Login';
                }
            } catch (error) {
                loading.classList.remove('show');
                errorMessage.textContent = 'Terjadi kesalahan. Silakan coba lagi.';
                errorMessage.classList.add('show');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
                console.error('Error:', error);
            }
        });
    </script>
</body>
</html>


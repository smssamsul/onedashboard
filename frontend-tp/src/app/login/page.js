'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import '@/styles/login.css';
import { setToken } from '@/lib/storage';
import { getDivisionHome } from '@/lib/divisionRoutes';
import { isTokenExpired } from '@/lib/checkToken';

const API_URL = '/api/login';

// ✅ FIX: Pisahkan komponen yang menggunakan useSearchParams untuk Suspense boundary
function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checked, setChecked] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);

  // === CEK LOGIN ===
  useEffect(() => {
    const token = localStorage.getItem('token');
    const loginTime = localStorage.getItem('login_time');

    if (token && loginTime && !isTokenExpired()) {
      // ✅ FIX: Gunakan getDivisionHome berdasarkan user data, bukan hardcode /admin
      const userData = localStorage.getItem('user');
      let targetRoute = null;

      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          const userDivisi = parsedUser?.divisi;
          const userLevel = parsedUser?.level ? Number(parsedUser.level) : null;

          // ✅ Gunakan getDivisionHome untuk mendapatkan route yang benar
          // Sales level 1 → /sales
          // Sales level 2 → /sales/staff
          // Finance level 1 → /finance
          // Finance level 2 → /finance/staff
          // Admin → /admin
          // dll
          targetRoute = getDivisionHome(userDivisi, userLevel);

          console.log('[Login] User sudah login, redirect ke:', {
            divisi: userDivisi,
            level: userLevel,
            targetRoute
          });
        } catch (error) {
          console.error('[Login] Error parsing user data:', error);
          // Fallback ke division_home jika ada
          const divisionHome = localStorage.getItem('division_home');
          if (divisionHome) {
            targetRoute = divisionHome;
          }
        }
      } else {
        // Jika user data tidak ada, coba gunakan division_home yang sudah disimpan
        const divisionHome = localStorage.getItem('division_home');
        if (divisionHome) {
          targetRoute = divisionHome;
        }
      }

      // ✅ FIX: Jika fallback gagal (tidak ada targetRoute), clear dan redirect ke login
      if (!targetRoute) {
        console.warn('[Login] Tidak dapat menentukan route, clear session dan redirect ke login');
        localStorage.clear();
        // Tidak perlu redirect karena sudah di halaman login
        return;
      }

      router.replace(targetRoute);
    }
  }, [router]);

  // === HANDLE UNHANDLED ERRORS ===
  useEffect(() => {
    // Handle unhandled promise rejections - suppress network errors on page load
    const handleUnhandledRejection = (event) => {
      // Suppress network errors that occur on page load (before user attempts login)
      if (
        event.reason instanceof TypeError &&
        (event.reason.message === "Failed to fetch" ||
          event.reason.message === "NetworkError when attempting to fetch resource" ||
          event.reason.message?.includes("fetch"))
      ) {
        // Prevent default error logging for network errors on page load
        event.preventDefault();
        return;
      }
    };

    // Handle general errors - suppress network errors on page load
    const handleError = (event) => {
      // Suppress network errors that occur on page load (before user attempts login)
      if (
        event.error instanceof TypeError &&
        (event.error.message === "Failed to fetch" ||
          event.error.message === "NetworkError when attempting to fetch resource" ||
          event.error.message?.includes("fetch"))
      ) {
        // Prevent default error logging for network errors on page load
        event.preventDefault();
        return;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  // === AUTO-MODAL kalau dari middleware ===
  useEffect(() => {
    const unauthorized = searchParams.get('unauthorized');
    if (unauthorized) {
      setErrorMsg('Sesi kamu sudah habis atau belum login.');
      setShowError(true);
    }
  }, [searchParams]);

  // === HANDLE LOGIN ===
  const handleLogin = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setHasAttemptedLogin(true); // Mark that user has attempted login

    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout (slightly longer than server)

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If response is not JSON, it's likely a network or server error
        setErrorMsg('Server tidak merespons dengan benar. Coba lagi nanti.');
        setShowError(true);
        return;
      }

      // Check if response is ok
      if (!response.ok) {
        let errorMessage = data?.message || `HTTP ${response.status}: ${data?.error || 'Login gagal'}`;

        // Add helpful hints for specific error codes
        if (response.status === 504) {
          errorMessage += ' (Timeout - Backend mungkin tidak dapat diakses dari Vercel server)';
        } else if (response.status === 503) {
          errorMessage += ' (Network Error - Cek firewall/security group backend)';
        }

        setErrorMsg(errorMessage);
        setShowError(true);
        return;
      }

      // Success case - sesuai dokumentasi: { success: true, user: {...}, token: "..." }
      if (data?.success === true && data?.token) {
        setToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('division', data.user?.divisi || '');
        localStorage.setItem('level', data.user?.level || '');

        // ✅ Simpan cookie yang bisa dibaca middleware (token berlaku 1 hari)
        // ✅ FIX: Pastikan divisi di-set sebagai string untuk konsistensi
        const userDivisiStr = String(data.user?.divisi || '');
        const userLevelStr = String(data.user?.level || '');
        document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        document.cookie = `user_divisi=${userDivisiStr}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        document.cookie = `user_level=${userLevelStr}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;

        // Get route based on division and level
        const targetRoute = getDivisionHome(data.user?.divisi, data.user?.level);
        localStorage.setItem('division_home', targetRoute);
        router.replace(targetRoute);
      } else if (data?.token) {
        // Fallback: jika ada token meskipun success tidak true
        setToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('division', data.user?.divisi || '');
        localStorage.setItem('level', data.user?.level || '');

        // ✅ FIX: Pastikan divisi di-set sebagai string untuk konsistensi
        const userDivisiStr = String(data.user?.divisi || '');
        const userLevelStr = String(data.user?.level || '');
        document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        document.cookie = `user_divisi=${userDivisiStr}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
        document.cookie = `user_level=${userLevelStr}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;

        // Get route based on division and level
        const targetRoute = getDivisionHome(data.user?.divisi, data.user?.level);
        localStorage.setItem('division_home', targetRoute);
        router.replace(targetRoute);
      } else {
        // No token in response
        const errorMessage = data?.message || 'Email atau password salah.';

        // If email not found, check if it might be a sync issue
        if (errorMessage.includes('tidak terdaftar') || errorMessage.includes('Email tidak terdaftar')) {
          setErrorMsg(
            'Email tidak terdaftar. Jika email baru saja diubah oleh admin, coba login dengan email lama terlebih dahulu.'
          );
        } else {
          setErrorMsg(errorMessage);
        }
        setShowError(true);
      }
    } catch (error) {
      // Only log error to console if user has attempted login
      // This prevents error spam on page load
      // Note: hasAttemptedLogin is set to true at the start of handleLogin
      if (hasAttemptedLogin) {
        // Only log non-network errors to avoid console spam
        if (
          !(error instanceof TypeError &&
            (error.message === "Failed to fetch" ||
              error.message === "NetworkError when attempting to fetch resource" ||
              error.message.includes("fetch")))
        ) {
          console.error('Login error:', error);
        }
      }
      // If hasAttemptedLogin is false, don't log anything (suppress errors on page load)

      // Handle timeout errors
      if (error.name === 'AbortError' || error?.message?.includes('timeout')) {
        setErrorMsg('Request timeout. Server tidak merespons. Jika backend berjalan di Postman, pastikan backend dapat diakses dari Vercel server (bukan hanya dari browser). Cek firewall/security group backend.');
        setShowError(true);
        return;
      }

      // Handle network errors specifically
      if (
        error instanceof TypeError &&
        (error.message === "Failed to fetch" ||
          error.message === "NetworkError when attempting to fetch resource" ||
          error.message.includes("fetch"))
      ) {
        setErrorMsg('Tidak dapat terhubung ke server. Backend mungkin memblokir request dari Vercel. Pastikan server backend dapat diakses dari Vercel server (bukan hanya dari browser/Postman).');
      } else {
        // Use error message from API response if available
        const errorMessage = error?.message || data?.message || 'Gagal terhubung ke server. Coba lagi nanti.';
        setErrorMsg(errorMessage);
      }
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const helperMessage = 'Gunakan akun yang diberikan admin untuk mengakses dashboard.';

  // === UI ===
  return (
    <div className="login-container">
      {/* === LEFT PANEL === */}
      <div className="login-left">
        <div className="login-box">
          <div className="login-logo">
            <img src="/assets/logo.png" alt="Logo" className="login-logo__img" />
          </div>
          <h3>Welcome to One Dashboard</h3>
          <p>Sign in to your account</p>

          {showError && <div className="login-alert">{errorMsg}</div>}

          <form onSubmit={handleLogin} className="login-form" autoComplete="off" data-form-type="other">
            <div className="login-form-group">
              <label>Email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (showError) setShowError(false);
                }}
                placeholder="admin@gmail.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="login-form-group">
              <label>Password</label>
              <div className="login-password-wrapper">
                <input
                  id="password"
                  type={showPasswordField ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (showError) setShowError(false);
                  }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPasswordField((prev) => !prev)}
                  aria-label={showPasswordField ? 'Hide password' : 'Show password'}
                >
                  {showPasswordField ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="login-remember-forgot">
              <label>
                <input
                  id="remember"
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                Remember me
              </label>
              <a href="mailto:support@onedashboard.id">Forgot password?</a>
            </div>

            <button type="submit" className="login-btn-signin" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="login-footer">{helperMessage}</p>
        </div>
      </div>

      {/* === RIGHT PANEL === */}
      <div className="login-right">
        <div className="login-overlay-content">
          <Image
            src="/assets/login.png"
            alt="One Dashboard"
            width={700}
            height={500}
            className="login-overlay-image"
            priority
          />
        </div>
      </div>
    </div>
  );
}

// ✅ FIX: Wrap dengan Suspense untuk useSearchParams (Next.js requirement)
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <p>Loading...</p>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import "@/styles/customer/cstlogin.css";
import { getCustomerSession } from "@/lib/customerAuth";

// === FOUNDER IMAGES ===
const founders = [
  "/assets/Dimas Dwi Ananto.png",
  "/assets/Salvian Kumara.png",
  "/assets/Rhesa Yogaswara.png",
  "/assets/Stephanus P H A S.png",
  "/assets/Theo Ariandyen.png",
  "/assets/Erzon Djazai.png",
];

// === STEPS ===
// 'phone'         → Input nomor HP
// 'otp_setup'     → Input OTP + Set Password (first time / forgot)
// 'password'      → Input Password (returning user)

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState("phone");
  const [slideDir, setSlideDir] = useState("forward"); // 'forward' | 'backward'
  const [animating, setAnimating] = useState(false);

  // Form state
  const [phone, setPhone] = useState("");
  const [customerId, setCustomerId] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [waMasked, setWaMasked] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isForgotMode, setIsForgotMode] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 menit
  const [timerActive, setTimerActive] = useState(false);

  // Founder rotate
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const otpRefs = useRef([]);

  // === CEK LOGIN ===
  useEffect(() => {
    const session = getCustomerSession();
    if (session.isAuthenticated && session.token) {
      router.replace("/customer/dashboard");
    }
  }, [router]);

  // === AUTO ROTATE FOUNDER IMAGES ===
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % founders.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // === FADE EFFECT ===
  useEffect(() => {
    setLoaded(false);
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, [current]);

  // === OTP TIMER ===
  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  const formatTime = () => {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const s = (timeLeft % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // === SLIDE TRANSITION ===
  const goToStep = (nextStep, direction = "forward") => {
    setAnimating(true);
    setSlideDir(direction);
    setErrorMsg("");
    setTimeout(() => {
      setStep(nextStep);
      setAnimating(false);
    }, 350);
  };

  // === HANDLE OTP INPUT ===
  const handleOtpChange = (e, index) => {
    const value = e.target.value.replace(/\D/g, "");
    if (!value) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      const newOtp = [...otp];
      pasted.split("").forEach((c, i) => { if (i < 6) newOtp[i] = c; });
      setOtp(newOtp);
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  // ===========================
  // STEP HANDLERS
  // ===========================

  // Step 1: Cek nomor HP
  const handleCheckPhone = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/customer/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ no_telp: phone }),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || "Nomor tidak terdaftar.");
        return;
      }

      setCustomerId(data.customer_id);
      setCustomerName(data.nama || "");
      setWaMasked(data.wa_masked || "");

      if (data.has_password) {
        // Returning user → step password
        setIsForgotMode(false);
        goToStep("password");
      } else {
        // First time → kirim OTP dulu, lalu pindah step
        const otpRes = await fetch("/api/customer/send-otp-by-phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ no_telp: phone }),
        });
        const otpData = await otpRes.json();
        if (otpData.success) {
          setTimeLeft(300);
          setTimerActive(true);
          toast.success("OTP dikirim ke WhatsApp Anda!");
          goToStep("otp_setup");
        } else {
          setErrorMsg(otpData.message || "Gagal mengirim OTP.");
        }
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Kirim OTP ke nomor HP
  const sendOtpToPhone = async () => {
    const res = await fetch("/api/customer/send-otp-by-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ no_telp: phone }),
    });
    const data = await res.json();
    if (data.success) {
      setTimeLeft(300);
      setTimerActive(true);
      toast.success("OTP dikirim ke WhatsApp Anda!");
    } else {
      toast.error(data.message || "Gagal mengirim OTP.");
    }
    return data;
  };

  // Step 2a: Login dengan password
  const handleLoginPassword = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/customer/login-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ no_telp: phone, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || "Password salah.");
        return;
      }

      // Simpan token & user
      localStorage.setItem("customer_token", data.token);
      localStorage.setItem("customer_user", JSON.stringify(data.user));
      toast.success("Login berhasil!");
      setTimeout(() => router.replace("/customer/dashboard"), 300);
    } catch (err) {
      setErrorMsg("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2a: Lupa password → masuk ke mode OTP
  const handleForgotPassword = async () => {
    setIsForgotMode(true);
    setOtp(["", "", "", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
    setErrorMsg("");
    const result = await sendOtpToPhone();
    if (result.success) {
      goToStep("otp_setup");
    }
  };

  // Step 2b: Verifikasi OTP + set password
  const handleVerifyAndSetPassword = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const code = otp.join("");
    if (code.length < 6) {
      setErrorMsg("Masukkan 6 digit kode OTP.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("Password minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/customer/verify-otp-set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          otp: code,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || "Verifikasi gagal.");
        return;
      }

      localStorage.setItem("customer_token", data.token);
      localStorage.setItem("customer_user", JSON.stringify(data.user));
      toast.success(isForgotMode ? "Password berhasil direset!" : "Akun berhasil diaktifkan!");
      setTimeout(() => router.replace("/customer/dashboard"), 300);
    } catch (err) {
      setErrorMsg("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setOtp(["", "", "", "", "", ""]);
    setErrorMsg("");
    await sendOtpToPhone();
  };

  // === SLIDE CLASS ===
  const slideClass = animating
    ? slideDir === "forward"
      ? "card-slide-exit-left"
      : "card-slide-exit-right"
    : slideDir === "forward"
    ? "card-slide-enter-right"
    : "card-slide-enter-left";

  // === UI ===
  return (
    <div className="login-container">
      {/* === LEFT PANEL === */}
      <div className="login-left">
        <div className="login-box">
          {/* Logo */}
          <div className="logo">
            <img src="/assets/logo.png" alt="Logo" className="login-logo" />
          </div>

          {/* ============================================================
              CARD CONTAINER – semua step ada di sini dengan slide animation
          ============================================================ */}
          <div className="login-card-wrapper">

            {/* ---- STEP: phone ---- */}
            {step === "phone" && (
              <div key="phone" className={`login-card-inner ${slideClass}`}>
                <h3>Masuk ke Akun Member</h3>
                <p>Masukkan nomor WhatsApp yang terdaftar</p>

                <form onSubmit={handleCheckPhone} autoComplete="off">
                  <div className="form-group">
                    <label>Nomor WhatsApp</label>
                    <div className="input-with-icon">
                      <span className="input-prefix">🇮🇩 +62</span>
                      <input
                        type="tel"
                        placeholder="812 3456 7890"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setErrorMsg("");
                        }}
                        required
                        autoComplete="tel"
                        className="input-phone"
                      />
                    </div>
                  </div>

                  {errorMsg && <div className="form-error">{errorMsg}</div>}

                  <button
                    type="submit"
                    className="btn-signin"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="btn-spinner">
                        <span className="spinner-dot" />
                        Memeriksa...
                      </span>
                    ) : (
                      "Lanjutkan →"
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ---- STEP: password (returning user) ---- */}
            {step === "password" && (
              <div key="password" className={`login-card-inner ${slideClass}`}>
                <button
                  className="btn-back"
                  onClick={() => goToStep("phone", "backward")}
                >
                  ← Ganti Nomor
                </button>

                <div className="step-user-info">
                  <div className="user-avatar">
                    {customerName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="user-greeting">Halo, <strong>{customerName || "Member"}</strong>!</p>
                    <p className="user-phone">{waMasked}</p>
                  </div>
                </div>

                <h3>Masukkan Password</h3>
                <p>Gunakan password yang sudah kamu buat sebelumnya</p>

                <form onSubmit={handleLoginPassword} autoComplete="off">
                  <div className="form-group">
                    <label>Password</label>
                    <div className="input-password-wrap">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Masukkan password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setErrorMsg("");
                        }}
                        required
                        autoComplete="current-password"
                        data-1p-ignore
                        data-lpignore="true"
                      />
                      <button
                        type="button"
                        className="btn-eye"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  {errorMsg && <div className="form-error">{errorMsg}</div>}

                  <button
                    type="submit"
                    className="btn-signin"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="btn-spinner">
                        <span className="spinner-dot" />
                        Masuk...
                      </span>
                    ) : (
                      "Masuk"
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn-forgot"
                    onClick={handleForgotPassword}
                    disabled={isSubmitting}
                  >
                    Lupa Password? Reset via OTP WhatsApp
                  </button>
                </form>
              </div>
            )}

            {/* ---- STEP: otp_setup (first-time atau forgot password) ---- */}
            {step === "otp_setup" && (
              <div key="otp_setup" className={`login-card-inner ${slideClass}`}>
                <button
                  className="btn-back"
                  onClick={() => {
                    setIsForgotMode(false);
                    goToStep("phone", "backward");
                  }}
                >
                  ← Kembali
                </button>

                <div className="otp-header-info">
                  <div className="otp-icon">💬</div>
                  <h3>{isForgotMode ? "Reset Password" : "Aktivasi Akun Member"}</h3>
                  <p>
                    Kode OTP telah dikirim ke WhatsApp{" "}
                    <strong>{waMasked || phone}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerifyAndSetPassword} autoComplete="off">
                  {/* OTP INPUT */}
                  <div className="form-group">
                    <label>Kode OTP (6 digit)</label>
                    <div className="otp-inputs" onPaste={handleOtpPaste}>
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          type="text"
                          inputMode="numeric"
                          maxLength="1"
                          value={digit}
                          onChange={(e) => handleOtpChange(e, i)}
                          onKeyDown={(e) => handleOtpKeyDown(e, i)}
                          ref={(el) => (otpRefs.current[i] = el)}
                          className={`otp-box ${digit ? "otp-filled" : ""}`}
                          placeholder="—"
                        />
                      ))}
                    </div>

                    {/* Timer */}
                    <div className="otp-timer">
                      <span className={`timer-dot ${timeLeft > 0 ? "active" : "expired"}`} />
                      {timeLeft > 0 ? (
                        <span>Berlaku <strong>{formatTime()}</strong></span>
                      ) : (
                        <span className="expired-text">Kode kedaluwarsa</span>
                      )}
                      {!timerActive && (
                        <button type="button" className="btn-resend" onClick={handleResendOtp}>
                          Kirim Ulang
                        </button>
                      )}
                    </div>
                  </div>

                  {/* NEW PASSWORD */}
                  <div className="form-group">
                    <label>{isForgotMode ? "Password Baru" : "Buat Password"}</label>
                    <div className="input-password-wrap">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Minimal 6 karakter"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setErrorMsg("");
                        }}
                        required
                        autoComplete="new-password"
                        data-1p-ignore
                        data-lpignore="true"
                      />
                      <button
                        type="button"
                        className="btn-eye"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Konfirmasi Password</label>
                    <div className="input-password-wrap">
                      <input
                        type="password"
                        placeholder="Ulangi password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setErrorMsg("");
                        }}
                        required
                        autoComplete="new-password"
                        data-1p-ignore
                        data-lpignore="true"
                      />
                    </div>
                  </div>

                  {errorMsg && <div className="form-error">{errorMsg}</div>}

                  <button
                    type="submit"
                    className="btn-signin"
                    disabled={isSubmitting || timeLeft === 0}
                  >
                    {isSubmitting ? (
                      <span className="btn-spinner">
                        <span className="spinner-dot" />
                        Memproses...
                      </span>
                    ) : isForgotMode ? (
                      "Reset Password & Masuk"
                    ) : (
                      "Aktifkan Akun & Masuk"
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
          {/* end .login-card-wrapper */}
        </div>
      </div>

      {/* === RIGHT PANEL === */}
      <div className="login-right">
        <div className="overlay-content">
          <h1>TEMPAT TERBAIK UNTUK BELAJAR DARI PRAKTISI PROPERTI</h1>
          <h3>
            Komunitas properti eksklusif — belajar langsung dari pelaku lapangan
            yang sudah buktiin strategi cuan properti, bukan teori doang!
          </h3>

          {/* === Founder Image Fade === */}
          <div className="founder-section">
            <div className="image-stack">
              {founders.map((src, i) => (
                <Image
                  key={i}
                  src={src}
                  alt="Founder"
                  width={250}
                  height={125}
                  className={`founder-full ${
                    i === current ? "fade-active" : "fade-inactive"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

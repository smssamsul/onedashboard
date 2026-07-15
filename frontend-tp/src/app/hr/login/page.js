"use client";

import "@/styles/hrlogin.css";

export default function HRLoginPage() {
  return (
    <div className="hr-login-container">
      {/* === LEFT PANEL === */}
      <div className="hr-login-left">
        <div className="hr-login-box">
          <div className="hr-logo">
            <img src="/assets/logo.png" alt="Logo" className="hr-login-logo" />
          </div>
          <h3>Welcome to One Dashboard</h3>
          <p>Sign in to your HR account</p>

          <form autoComplete="off" data-form-type="other">
            <div className="hr-form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="Email address"
                required
                autoComplete="email"
              />
            </div>

            <div className="hr-form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
              />
            </div>

            <div className="hr-remember-forgot">
              <label>
                <input type="checkbox" /> Remember me
              </label>
              <a href="#">Forgot password?</a>
            </div>

            <button type="submit" className="hr-btn-signin">
              Sign In
            </button>
          </form>
        </div>
      </div>

      {/* === RIGHT PANEL === */}
      <div className="hr-login-right">
        <div className="hr-overlay-content">
          <h1>HR MANAGEMENT PORTAL</h1>
          <h3>
            Manage your workforce efficiently with our comprehensive HR dashboard.
            Access employee data, track performance, and streamline operations.
          </h3>
        </div>
      </div>
    </div>
  );
}


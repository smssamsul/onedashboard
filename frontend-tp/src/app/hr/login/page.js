"use client";

import { Mail, Lock } from "lucide-react";
import "@/styles/hrlogin.css";

export default function HRLoginPage() {
  return (
    <div className="hr-login-container">
      <div className="hr-login-bg-shape hr-login-bg-shape--1" />
      <div className="hr-login-bg-shape hr-login-bg-shape--2" />
      <div className="hr-login-bg-shape hr-login-bg-shape--3" />

      <div className="hr-login-wrapper">
        <div className="hr-login-box">
          <div className="hr-logo">
            <div className="hr-logo-badge">
              <img src="/assets/logo-boosterin.png" alt="Logo" className="hr-login-logo" />
            </div>
            <h3>HR Management Portal</h3>
            <p>Sign in to your HR account</p>
          </div>

          <form autoComplete="off" data-form-type="other">
            <div className="hr-form-group">
              <label>Email</label>
              <div className="hr-input-wrapper">
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  required
                  autoComplete="email"
                />
                <Mail className="hr-input-icon" size={18} />
              </div>
            </div>

            <div className="hr-form-group">
              <label>Password</label>
              <div className="hr-input-wrapper">
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
                <Lock className="hr-input-icon" size={18} />
              </div>
            </div>

            <button type="submit" className="hr-btn-signin">
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


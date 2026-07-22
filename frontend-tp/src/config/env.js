/**
 * Environment Configuration
 * Centralized configuration untuk semua environment variables
 * Mudah dipindahkan ke environment manapun dengan mengubah .env file
 */

// Get environment variables with fallbacks
const getEnv = (key, defaultValue = '') => {
  if (typeof window !== 'undefined') {
    // Client-side: use public env vars (NEXT_PUBLIC_*)
    return process.env[`NEXT_PUBLIC_${key}`] || defaultValue;
  }
  // Server-side: use all env vars
  return process.env[key] || process.env[`NEXT_PUBLIC_${key}`] || defaultValue;
};

// Backend URL - Menggunakan environment variable
// Fallback ke domain produksi (bukan localhost) supaya deployment yang lupa
// set NEXT_PUBLIC_BACKEND_URL (mis. project Vercel baru) tidak diam-diam
// coba connect ke localhost:8000 yang jelas tidak ada di server manapun.
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.ternakproperti.com';

export const config = {
  // Backend API URL - Hardcode ke URL backend yang ditentukan
  backendUrl: BACKEND_URL,

  // API Base Path (untuk Next.js proxy)
  apiBasePath: getEnv('API_BASE_PATH', '/api'),

  // Featured security keys
  otpSecret: getEnv('OTP_SECRET_KEY', 'default_secret_key'),

  // Environment
  env: getEnv('NODE_ENV', 'development'),
  isDevelopment: getEnv('NODE_ENV', 'development') === 'development',
  isProduction: getEnv('NODE_ENV', 'development') === 'production',

  // App Info
  appName: getEnv('APP_NAME', 'One Dashboard'),
  appUrl: getEnv('APP_URL', 'http://localhost:3000'),

  // Feature Flags (optional)
  features: {
    enableLogging: getEnv('ENABLE_API_LOGGING', 'true') === 'true',
    enableToast: getEnv('ENABLE_TOAST', 'true') === 'true',
  },
};

// Export untuk easy access
export default config;


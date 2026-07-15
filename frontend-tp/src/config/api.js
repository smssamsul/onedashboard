/**
 * API Configuration
 * Centralized API endpoints configuration
 * Mudah diubah dan scalable
 */

import config from './env';

/**
 * API Endpoints
 * Semua endpoint didefinisikan di sini untuk mudah diubah
 */
export const API_ENDPOINTS = {
  // Auth
  auth: {
    login: '/login',
    logout: '/logout',
  },

  // Admin
  admin: {
    users: '/admin/users',
    userById: (id) => `/admin/users/${id}`,
    customers: '/admin/customer',
    customerById: (id) => `/admin/customer/${id}`,
    products: '/admin/produk',
    productById: (id) => `/admin/produk/${id}`,
    categories: '/admin/kategori-produk',
    categoryById: (id) => `/admin/kategori-produk/${id}`,
    orders: '/admin/order',
    orderById: (id) => `/admin/order/${id}`,
    dashboard: '/admin/sales/dashboard',
  },

  // Sales
  sales: {
    customers: '/sales/customer',
    products: '/sales/produk',
    categories: '/sales/kategori-produk',
    categoryById: (id) => `/sales/kategori-produk/${id}`,
    orders: '/sales/order',
    dashboard: '/sales/dashboard',
    aiSetting: '/sales/ai-setting',
    aiSettingById: (id) => `/sales/ai-setting/${id}`,
  },

  // Customer
  customer: {
    login: '/customer',
    register: '/customer/register',
    profile: '/customer',
    dashboard: '/customer/dashboard',
    orders: '/customer/order',
    otp: {
      send: '/customer/otp/send',
      verify: '/customer/otp/verify',
      resend: '/customer/otp/resend',
    },
  },

  // Followup
  followup: {
    templates: '/admin/followup',
    templateById: (id) => `/admin/followup/${id}`,
    logs: '/admin/logs-followup',
    report: '/admin/followup/report',
  },

  // Landing & Orders
  landing: {
    product: (kode) => `/landing/${kode}`,
  },

  order: {
    create: '/order',
    createAdmin: '/order-admin',
  },

  // Midtrans Payment
  midtrans: {
    createSnapCC: '/midtrans/create-snap-cc',
    createSnapEwallet: '/midtrans/create-snap-ewallet',
    createSnapVA: '/midtrans/create-snap-va',
  },
};

/**
 * Get full API URL
 * @param {string} endpoint - API endpoint
 * @returns {string} Full URL
 */
export const getApiUrl = (endpoint) => {
  // Remove leading slash if exists
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // Use Next.js proxy in client-side, direct URL in server-side
  if (typeof window !== 'undefined') {
    return `${config.apiBasePath}/${cleanEndpoint}`;
  }
  
  return `${config.backendUrl}/api/${cleanEndpoint}`;
};

/**
 * Get backend URL directly (for server-side only)
 */
export const getBackendUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${config.backendUrl}/api/${cleanEndpoint}`;
};

export default API_ENDPOINTS;


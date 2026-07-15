/**
 * Centralized Toast Notification System
 * Simple, no icons, industrial theme
 * Only shows toast if status is 200
 */

let toastContainer = null;
let currentToast = null;
let toastTimeout = null;

// Initialize toast container
function initToastContainer() {
  if (typeof document === "undefined") return;
  
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }
}

// Show toast notification
export function showToast(message, type = "success", status = null) {
  // Only show if status is 200 (or null/undefined for manual calls)
  if (status !== null && status !== 200) {
    return;
  }

  initToastContainer();
  
  // Clear existing toast
  if (currentToast) {
    currentToast.remove();
    currentToast = null;
  }
  
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  // Icon mapping
  const icons = {
    success: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
    </svg>`,
    error: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>`,
    warning: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>`,
    info: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>`,
  };
  
  // Close button
  const closeIcon = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>`;
  
  // Build toast HTML
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" aria-label="Close">${closeIcon}</button>
    <div class="toast-progress"></div>
  `;
  
  // Add close button handler
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.classList.remove("toast-show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
      if (currentToast === toast) {
        currentToast = null;
      }
      if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
      }
    }, 300);
  });
  
  // Add to container
  toastContainer.appendChild(toast);
  currentToast = toast;

  // Trigger animation
  setTimeout(() => {
    toast.classList.add("toast-show");
  }, 10);

  // Auto remove after 3 seconds
  toastTimeout = setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
      if (currentToast === toast) {
        currentToast = null;
      }
    }, 300);
  }, 3000);
}

// Success toast
export function toastSuccess(message, status = null) {
  showToast(message, "success", status);
}

// Error toast
export function toastError(message, status = null) {
  showToast(message, "error", status);
}

// Warning toast
export function toastWarning(message, status = null) {
  showToast(message, "warning", status);
}

// Export all for convenience
export default {
  success: toastSuccess,
  error: toastError,
  warning: toastWarning,
  info: toastInfo,
  show: showToast,
};

// Info toast
export function toastInfo(message, status = null) {
  showToast(message, "info", status);
}

// Helper for API responses
export function handleApiResponse(response, successMessage = null, errorMessage = null) {
  if (response?.status === 200 || response?.statusCode === 200) {
    const message = successMessage || response?.message || "Operasi berhasil";
    toastSuccess(message, 200);
    return true;
  } else {
    const message = errorMessage || response?.message || "Terjadi kesalahan";
    toastError(message, response?.status || response?.statusCode);
    return false;
  }
}

// Helper for fetch responses
export async function handleFetchResponse(response, successMessage = null, errorMessage = null) {
  try {
    const data = await response.json();
    if (response.status === 200) {
      const message = successMessage || data?.message || "Operasi berhasil";
      toastSuccess(message, 200);
      return { success: true, data };
    } else {
      const message = errorMessage || data?.message || "Terjadi kesalahan";
      toastError(message, response.status);
      return { success: false, data };
    }
  } catch (error) {
    const message = errorMessage || "Terjadi kesalahan";
    toastError(message, response.status);
    return { success: false, data: null };
  }
}


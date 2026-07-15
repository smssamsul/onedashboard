// Admin Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 1024) {
                if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }

    // Dropdown Toggle
    const dropdowns = document.querySelectorAll('[data-dropdown]');
    
    dropdowns.forEach(function(dropdown) {
        const triggerId = dropdown.getAttribute('data-dropdown');
        const menu = document.getElementById(triggerId);
        
        if (menu) {
            dropdown.addEventListener('click', function(e) {
            e.stopPropagation();
                
                // Close other dropdowns
                document.querySelectorAll('.dropdown-menu.open').forEach(function(openMenu) {
                    if (openMenu !== menu) {
                        openMenu.classList.remove('open');
                    }
                });
                
                menu.classList.toggle('open');
            });
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        document.querySelectorAll('.dropdown-menu.open').forEach(function(menu) {
            if (!menu.contains(e.target)) {
                menu.classList.remove('open');
            }
        });
    });

    // Initialize Charts if Chart.js is available
    if (typeof Chart !== 'undefined') {
        initializeCharts();
    }
});

// Initialize Dashboard Charts
function initializeCharts() {
    // Example chart configuration
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        family: 'Plus Jakarta Sans',
                        size: 12
                    },
                    color: '#64748b'
                }
            },
            y: {
                grid: {
                    color: '#e2e8f0'
                },
                ticks: {
                    font: {
                        family: 'Plus Jakarta Sans',
                        size: 12
                    },
                    color: '#64748b'
                }
            }
        }
    };

    // Bar Chart
    const barCtx = document.getElementById('barChart');
    if (barCtx) {
        new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
                datasets: [{
                    label: 'Data',
                    data: [12, 19, 15, 17, 14, 22],
                    backgroundColor: '#1e3a5f',
                    borderRadius: 6,
                    barThickness: 32
                }]
            },
            options: chartOptions
        });
    }

    // Line Chart
    const lineCtx = document.getElementById('lineChart');
    if (lineCtx) {
        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
                datasets: [{
                    label: 'Trend',
                    data: [3.5, 3.7, 3.8, 3.6, 3.9, 3.7],
                    borderColor: '#1e3a5f',
                    backgroundColor: 'rgba(30, 58, 95, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#1e3a5f',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y: {
                        ...chartOptions.scales.y,
                        min: 0,
                        max: 4.5,
                        ticks: {
                            stepSize: 0.5
                        }
                    }
                }
            }
        });
    }
}

// Format Number with Separator
function formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(num);
}

// Format Currency
function formatCurrency(num) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
}

// API Helper
async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('auth_token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, mergedOptions);
        
        if (response.status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            window.location.href = '/login';
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Toast Notification
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add styles if not exist
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast {
                position: fixed;
                bottom: 1.5rem;
                right: 1.5rem;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                color: white;
                display: flex;
                align-items: center;
                gap: 1rem;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease;
                z-index: 9999;
            }
            .toast button {
                background: none;
                border: none;
                color: white;
                font-size: 1.25rem;
                cursor: pointer;
                padding: 0;
                line-height: 1;
            }
            .toast-success { background: #10b981; }
            .toast-error { background: #ef4444; }
            .toast-warning { background: #f59e0b; }
            .toast-info { background: #3b82f6; }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 4000);
}

// Loading State Helper
function setLoading(element, isLoading, loadingText = 'Loading...') {
    if (isLoading) {
        element.dataset.originalText = element.innerHTML;
        element.innerHTML = loadingText;
        element.disabled = true;
        element.style.opacity = '0.7';
    } else {
        element.innerHTML = element.dataset.originalText || element.innerHTML;
        element.disabled = false;
        element.style.opacity = '1';
    }
}

// Confirm Dialog
function confirmDialog(message) {
    return new Promise((resolve) => {
        const result = confirm(message);
        resolve(result);
    });
}

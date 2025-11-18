document.addEventListener('DOMContentLoaded', () => {
    // Sidebar Toggle
    const sidebar = document.querySelector('.sidebar');
    const toggleButton = document.querySelector('[data-toggle="sidebar"]');
    const sidebarOverlay = document.createElement('div');
    sidebarOverlay.className = 'sidebar-overlay';
    sidebarOverlay.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 25;
        backdrop-filter: blur(4px);
    `;
    document.body.appendChild(sidebarOverlay);

    function toggleSidebar() {
        if (sidebar) {
            sidebar.classList.toggle('open');
            if (sidebar.classList.contains('open')) {
                sidebarOverlay.style.display = 'block';
            } else {
                sidebarOverlay.style.display = 'none';
            }
        }
    }

    if (toggleButton) {
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    sidebarOverlay.addEventListener('click', () => {
        toggleSidebar();
    });

    // Close sidebar on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    });

    // Dropdown Menu
    const dropdownTriggers = document.querySelectorAll('[data-dropdown]');
    dropdownTriggers.forEach(trigger => {
        const menuId = trigger.getAttribute('data-dropdown');
        const menu = document.getElementById(menuId);
        
        if (!menu) return;

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = menu.classList.contains('open');
            
            // Close all other dropdowns
            document.querySelectorAll('.dropdown-menu').forEach(m => {
                if (m !== menu) {
                    m.classList.remove('open');
                }
            });
            
            // Toggle current dropdown
            menu.classList.toggle('open', !isOpen);
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (event) => {
        if (!event.target.closest('[data-dropdown]') && !event.target.closest('.dropdown-menu')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('open');
            });
        }
    });

    // Search functionality
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('focus', function() {
            this.parentElement.style.zIndex = '10';
        });
        
        searchInput.addEventListener('blur', function() {
            this.parentElement.style.zIndex = '1';
        });
    }

    // Smooth scroll for sidebar
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Remove active class from all links
            sidebarLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            this.classList.add('active');
        });
    });

    // Table row hover effect enhancement
    const tableRows = document.querySelectorAll('tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.2s ease';
        });
    });

    // Stat cards animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease-out';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.stat-card').forEach(card => {
        observer.observe(card);
    });
});


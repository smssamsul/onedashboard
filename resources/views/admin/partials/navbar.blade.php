<nav class="admin-navbar">
    <div class="navbar-left">
        <button class="sidebar-toggle" data-toggle="sidebar" aria-label="Toggle sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20M4 12H20M4 18H14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
        <span class="page-title">@yield('page_title', 'Dashboard')</span>
    </div>
    <div class="navbar-actions">
        <div class="search-bar">
            <input type="text" placeholder="Search..." aria-label="Search" />
        </div>
        <div class="user-dropdown" data-dropdown="userMenu">
            <div class="avatar" id="userAvatar">AD</div>
        </div>
        <div id="userMenu" class="dropdown-menu">
            <a href="#" onclick="event.preventDefault(); alert('Profile feature coming soon!')">Profile</a>
            <a href="#" onclick="event.preventDefault(); alert('Settings feature coming soon!')">Settings</a>
            <form method="POST" action="/api/admin/logout" id="logoutForm">
                @csrf
                <button type="button" onclick="handleLogout()">Logout</button>
            </form>
        </div>
    </div>
</nav>

<script>
    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    const userName = userData.name || 'Admin';
    const initials = userName.substring(0, 2).toUpperCase();
    const avatarElement = document.getElementById('userAvatar');
    if (avatarElement) {
        avatarElement.textContent = initials;
    }

    // Handle logout
    function handleLogout() {
        const token = localStorage.getItem('auth_token');
        
        fetch('/api/admin/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + token,
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
            }
        })
        .then(response => {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            window.location.href = '/login';
        })
        .catch(error => {
            console.error('Logout error:', error);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            window.location.href = '/login';
        });
    }
</script>


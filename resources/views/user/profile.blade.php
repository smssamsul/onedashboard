@extends('layouts.user')

@section('title', 'Profile')

@push('styles')
<style>
    .profile-card {
        background: var(--surface);
        border-radius: var(--radius-lg);
        padding: 2rem;
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border);
        max-width: 600px;
        margin: 0 auto;
    }

    .profile-header {
        text-align: center;
        margin-bottom: 2rem;
    }

    .profile-avatar {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: var(--primary);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        font-weight: 600;
        margin: 0 auto 1rem;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: var(--text);
    }

    .form-group input,
    .form-group textarea {
        width: 100%;
        padding: 0.625rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        background: var(--surface);
    }

    .form-group input:disabled {
        background: var(--background);
        color: var(--text-muted);
    }
</style>
@endpush

@section('content')
    <h2 style="margin-bottom: 1.5rem;">Profile</h2>

    <div class="profile-card">
        <div class="profile-header">
            <div class="profile-avatar" id="profileAvatar">U</div>
            <h3 id="profileName">User</h3>
            <p style="color: var(--text-muted); margin: 0;" id="profileEmail">-</p>
        </div>

        <form id="profileForm">
            <div class="form-group">
                <label>Nama</label>
                <input type="text" id="nama" disabled>
            </div>

            <div class="form-group">
                <label>Email</label>
                <input type="email" id="email" disabled>
            </div>

            <div class="form-group">
                <label>No. Telepon</label>
                <input type="text" id="no_telp" disabled>
            </div>

            <div class="form-group">
                <label>Alamat</label>
                <textarea id="alamat" rows="3" disabled></textarea>
            </div>

            <div class="form-group">
                <label>Divisi</label>
                <input type="text" id="divisi" disabled>
            </div>

            <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border);">
                <h4 style="margin-bottom: 1rem;">Ubah Password</h4>
                <div class="form-group">
                    <label>Password Baru</label>
                    <input type="password" id="newPassword" placeholder="Masukkan password baru">
                </div>
                <div class="form-group">
                    <label>Konfirmasi Password</label>
                    <input type="password" id="confirmPassword" placeholder="Konfirmasi password baru">
                </div>
                <button type="button" class="btn btn-primary" onclick="updatePassword()">Ubah Password</button>
            </div>
        </form>
    </div>
@endsection

@push('scripts')
<script>
    async function loadProfile() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            // Load from localStorage first
            const userDataStr = localStorage.getItem('user_data');
            if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                document.getElementById('profileAvatar').textContent = (userData.nama || userData.name || 'U').charAt(0).toUpperCase();
                document.getElementById('profileName').textContent = userData.nama || userData.name || 'User';
                document.getElementById('profileEmail').textContent = userData.email || '-';
                document.getElementById('nama').value = userData.nama || userData.name || '';
                document.getElementById('email').value = userData.email || '';
                document.getElementById('no_telp').value = userData.no_telp || '';
                document.getElementById('alamat').value = userData.alamat || '';
                document.getElementById('divisi').value = userData.divisi || '';
            }

            // Load from API for complete data
            const response = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    const data = result.data;
                    document.getElementById('profileAvatar').textContent = (data.nama || 'U').charAt(0).toUpperCase();
                    document.getElementById('profileName').textContent = data.nama || 'User';
                    document.getElementById('profileEmail').textContent = data.email || '-';
                    document.getElementById('nama').value = data.nama || '';
                    document.getElementById('email').value = data.email || '';
                    document.getElementById('no_telp').value = data.no_telp || '';
                    document.getElementById('alamat').value = data.alamat || '';
                    document.getElementById('divisi').value = data.divisi || '';
                }
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    async function updatePassword() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!newPassword || !confirmPassword) {
            alert('Harap isi semua field password');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('Password tidak cocok');
            return;
        }

        if (newPassword.length < 6) {
            alert('Password minimal 6 karakter');
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch('/api/user/change-password', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    password: newPassword,
                    password_confirmation: confirmPassword
                })
            });

            const result = await response.json();
            
            if (result.success) {
                alert('Password berhasil diubah');
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            } else {
                alert(result.message || 'Gagal mengubah password');
            }
        } catch (error) {
            console.error('Error updating password:', error);
            alert('Terjadi kesalahan saat mengubah password');
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        loadProfile();
    });
</script>
@endpush


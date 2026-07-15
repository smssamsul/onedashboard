@extends('layouts.customer')

@section('title', 'Profile')

@section('content')
    <div class="profile-container">
        <div class="profile-header">
            <h2>Edit Profile</h2>
            <p class="text-muted">Kelola informasi profil Anda</p>
        </div>

        <div class="profile-form-card">
            <form id="profileForm">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="nama">Nama Lengkap *</label>
                        <input type="text" id="nama" name="nama" required>
                    </div>

                    <div class="form-group">
                        <label for="nama_panggilan">Nama Panggilan</label>
                        <input type="text" id="nama_panggilan" name="nama_panggilan">
                    </div>

                    <div class="form-group">
                        <label for="email">Email *</label>
                        <input type="email" id="email" name="email" required readonly>
                        <small class="form-hint">Email tidak dapat diubah</small>
                    </div>

                    <div class="form-group">
                        <label for="wa">Nomor WhatsApp</label>
                        <input type="text" id="wa" name="wa" placeholder="08xxxxxxxxxx">
                    </div>

                    <div class="form-group">
                        <label for="instagram">Instagram</label>
                        <input type="text" id="instagram" name="instagram" placeholder="@username">
                    </div>

                    <div class="form-group">
                        <label for="profesi">Profesi</label>
                        <input type="text" id="profesi" name="profesi">
                    </div>

                    <div class="form-group">
                        <label for="pendapatan_bln">Pendapatan per Bulan</label>
                        <input type="number" id="pendapatan_bln" name="pendapatan_bln" placeholder="0">
                    </div>

                    <div class="form-group">
                        <label for="industri_pekerjaan">Industri Pekerjaan</label>
                        <input type="text" id="industri_pekerjaan" name="industri_pekerjaan">
                    </div>

                    <div class="form-group">
                        <label for="jenis_kelamin">Jenis Kelamin</label>
                        <select id="jenis_kelamin" name="jenis_kelamin">
                            <option value="">Pilih</option>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="tanggal_lahir">Tanggal Lahir</label>
                        <input type="date" id="tanggal_lahir" name="tanggal_lahir">
                    </div>

                    <div class="form-group full-width">
                        <label for="alamat">Alamat</label>
                        <textarea id="alamat" name="alamat" rows="3"></textarea>
                    </div>

                    <div class="form-group full-width">
                        <label for="password">Password Baru</label>
                        <input type="password" id="password" name="password" placeholder="Kosongkan jika tidak ingin mengubah">
                        <small class="form-hint">Minimal 6 karakter</small>
                    </div>

                    <div class="form-group full-width">
                        <label for="password_confirmation">Konfirmasi Password Baru</label>
                        <input type="password" id="password_confirmation" name="password_confirmation" placeholder="Kosongkan jika tidak ingin mengubah">
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="window.location.href='/customer/dashboard'">Batal</button>
                    <button type="submit" class="btn-primary" id="submitBtn">Simpan Perubahan</button>
                </div>
            </form>
        </div>
    </div>
@endsection

@push('styles')
<style>
    .profile-container {
        max-width: 900px;
        margin: 0 auto;
    }

    .profile-header {
        margin-bottom: 2rem;
    }

    .profile-header h2 {
        margin: 0 0 0.5rem 0;
        font-size: 2rem;
        font-weight: 800;
        color: var(--text);
    }

    .profile-form-card {
        background: var(--surface);
        border-radius: 16px;
        padding: 2rem;
        box-shadow: var(--shadow-sm);
    }

    .form-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .form-group.full-width {
        grid-column: 1 / -1;
    }

    .form-group label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text);
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
        padding: 0.875rem 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 0.9375rem;
        color: var(--text);
        background: var(--bg);
        transition: all 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
    }

    .form-group input[readonly] {
        background: #f3f4f6;
        cursor: not-allowed;
    }

    .form-group textarea {
        resize: vertical;
        min-height: 100px;
    }

    .form-hint {
        font-size: 0.75rem;
        color: var(--muted);
    }

    .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        padding-top: 1.5rem;
        border-top: 1px solid var(--border);
    }

    .btn-primary,
    .btn-secondary {
        padding: 0.875rem 2rem;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.9375rem;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
    }

    .btn-primary {
        background: var(--primary);
        color: white;
    }

    .btn-primary:hover {
        background: var(--primary-dark);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }

    .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }

    .btn-secondary {
        background: var(--surface);
        color: var(--text);
        border: 2px solid var(--border);
    }

    .btn-secondary:hover {
        background: var(--bg);
    }

    .alert {
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        display: none;
    }

    .alert.show {
        display: block;
    }

    .alert-success {
        background: #d1fae5;
        color: #065f46;
        border: 1px solid #a7f3d0;
    }

    .alert-error {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #fecaca;
    }

    @media (max-width: 768px) {
        .form-grid {
            grid-template-columns: 1fr;
        }

        .form-actions {
            flex-direction: column-reverse;
        }

        .btn-primary,
        .btn-secondary {
            width: 100%;
        }
    }
</style>
@endpush

@push('scripts')
<script>
    let customerData = null;

    async function loadProfileData() {
        try {
            const token = localStorage.getItem('customer_auth_token');
            if (!token) {
                window.location.href = '/customer/login';
                return;
            }

            const response = await fetch('/api/customer/dashboard', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('customer_auth_token');
                localStorage.removeItem('customer_data');
                window.location.href = '/customer/login';
                return;
            }

            const result = await response.json();
            
            if (result.success && result.data) {
                customerData = result.data.customer;
                populateForm(customerData);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            showAlert('Terjadi kesalahan saat memuat data profil', 'error');
        }
    }

    function populateForm(data) {
        document.getElementById('nama').value = data.nama || '';
        document.getElementById('nama_panggilan').value = data.nama_panggilan || '';
        document.getElementById('email').value = data.email || '';
        document.getElementById('wa').value = data.wa || '';
        document.getElementById('instagram').value = data.instagram || '';
        document.getElementById('profesi').value = data.profesi || '';
        document.getElementById('pendapatan_bln').value = data.pendapatan_bln || '';
        document.getElementById('industri_pekerjaan').value = data.industri_pekerjaan || '';
        document.getElementById('jenis_kelamin').value = data.jenis_kelamin || '';
        
        if (data.tanggal_lahir) {
            const date = new Date(data.tanggal_lahir);
            document.getElementById('tanggal_lahir').value = date.toISOString().split('T')[0];
        }
        
        document.getElementById('alamat').value = data.alamat || '';
    }

    function showAlert(message, type = 'success') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} show`;
        alertDiv.textContent = message;
        
        const formCard = document.querySelector('.profile-form-card');
        formCard.insertBefore(alertDiv, formCard.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    document.getElementById('profileForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Menyimpan...';

        const password = document.getElementById('password').value;
        const passwordConfirmation = document.getElementById('password_confirmation').value;

        if (password && password.length < 6) {
            showAlert('Password minimal 6 karakter', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Simpan Perubahan';
            return;
        }

        if (password && password !== passwordConfirmation) {
            showAlert('Password dan konfirmasi password tidak cocok', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Simpan Perubahan';
            return;
        }

        try {
            const token = localStorage.getItem('customer_auth_token');
            const formData = {
                nama_panggilan: document.getElementById('nama_panggilan').value,
                instagram: document.getElementById('instagram').value,
                profesi: document.getElementById('profesi').value,
                pendapatan_bln: document.getElementById('pendapatan_bln').value || null,
                industri_pekerjaan: document.getElementById('industri_pekerjaan').value,
                jenis_kelamin: document.getElementById('jenis_kelamin').value || null,
                tanggal_lahir: document.getElementById('tanggal_lahir').value || null,
                alamat: document.getElementById('alamat').value,
                wa: document.getElementById('wa').value || null,
            };

            if (password) {
                formData.password = password;
            }

            const response = await fetch('/api/customer/customer', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showAlert('Profile berhasil diperbarui', 'success');
                setTimeout(() => {
                    window.location.href = '/customer/dashboard';
                }, 1500);
            } else {
                let errorMsg = 'Gagal memperbarui profile';
                if (result.message) {
                    errorMsg = result.message;
                } else if (result.errors) {
                    const errorKeys = Object.keys(result.errors);
                    if (errorKeys.length > 0) {
                        errorMsg = result.errors[errorKeys[0]][0];
                    }
                }
                showAlert(errorMsg, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Simpan Perubahan';
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showAlert('Terjadi kesalahan saat memperbarui profile', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Simpan Perubahan';
        }
    });

    // Load data when page loads
    document.addEventListener('DOMContentLoaded', function() {
        loadProfileData();
    });
</script>
@endpush


@extends('layouts.sales')

@section('title', 'AI Prompt')
@section('page_title', 'Manajemen AI Prompt')

@push('styles')
<style>
    :root {
        --theme-primary: #3B82F6;
        --theme-primary-dark: #2563EB;
        --theme-primary-light: #60A5FA;
    }

    .page-header {
        background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-light) 100%);
        border-radius: var(--radius-lg);
        padding: 1.5rem 2rem;
        color: white;
        margin-bottom: 1.5rem;
    }

    .prompt-container {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 2rem;
        margin-bottom: 1.5rem;
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

    .form-group textarea {
        width: 100%;
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-family: 'Courier New', monospace;
        resize: vertical;
        min-height: 300px;
    }

    .form-group small {
        display: block;
        margin-top: 0.5rem;
        color: var(--text-muted);
        font-size: 0.75rem;
    }

    .btn {
        padding: 0.625rem 1.25rem;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
    }

    .btn-primary {
        background: var(--primary);
        color: white;
    }

    .btn-primary:hover {
        background: var(--primary-dark);
    }

    .btn-secondary {
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
    }

    .btn-secondary:hover {
        background: var(--background);
    }

    .info-box {
        background: #E0F2FE;
        border: 1px solid #0EA5E9;
        border-radius: var(--radius-sm);
        padding: 1rem;
        margin-bottom: 1.5rem;
    }

    .info-box h4 {
        margin: 0 0 0.5rem 0;
        color: #0369A1;
        font-size: 0.875rem;
        font-weight: 600;
    }

    .info-box p {
        margin: 0;
        color: #075985;
        font-size: 0.75rem;
        line-height: 1.5;
    }

    .loading-state {
        text-align: center;
        padding: 2rem;
        color: var(--text-muted);
    }
</style>
@endpush

@section('content')
<div id="loadingState" class="loading-state">Memuat data...</div>

<div id="promptContent" style="display: none;">
    <div class="info-box">
        <h4>💡 Informasi</h4>
        <p>Prompt ini akan digunakan sebagai system prompt untuk AI. Pastikan prompt jelas dan sesuai dengan kebutuhan bisnis Anda. Prompt yang baik akan membantu AI memberikan respons yang lebih akurat dan relevan.</p>
    </div>

    <div class="prompt-container">
        <form id="promptForm">
            <div class="form-group">
                <label>AI System Prompt *</label>
                <textarea id="prompt" required placeholder="Masukkan system prompt untuk AI..."></textarea>
                <small>Prompt ini akan digunakan sebagai instruksi dasar untuk AI dalam merespons pertanyaan pengguna.</small>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
                <button type="button" class="btn btn-secondary" onclick="resetPrompt()">Reset</button>
                <button type="button" class="btn btn-primary" onclick="savePrompt()">Simpan Prompt</button>
            </div>
        </form>
    </div>
</div>
@endsection

@push('scripts')
<script>
    let currentPrompt = null;

    async function loadPrompt() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch('/api/sales/ai-setting', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }

            const result = await response.json();
            
            if (result.success) {
                if (result.data) {
                    currentPrompt = result.data;
                    document.getElementById('prompt').value = result.data.prompt || '';
                } else {
                    document.getElementById('prompt').value = '';
                }
                
                document.getElementById('loadingState').style.display = 'none';
                document.getElementById('promptContent').style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading prompt:', error);
            alert('Terjadi kesalahan saat memuat data');
        }
    }

    async function savePrompt() {
        const prompt = document.getElementById('prompt').value.trim();

        if (!prompt) {
            alert('Prompt tidak boleh kosong');
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const url = currentPrompt ? `/api/sales/ai-setting/${currentPrompt.id}` : '/api/sales/ai-setting';
            const method = currentPrompt ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt
                })
            });

            const result = await response.json();
            
            if (result.success) {
                currentPrompt = result.data;
                alert(result.message || 'Prompt berhasil disimpan');
            } else {
                alert(result.message || 'Terjadi kesalahan');
            }
        } catch (error) {
            console.error('Error saving prompt:', error);
            alert('Terjadi kesalahan saat menyimpan prompt');
        }
    }

    function resetPrompt() {
        if (confirm('Apakah Anda yakin ingin mereset prompt? Perubahan yang belum disimpan akan hilang.')) {
            document.getElementById('prompt').value = currentPrompt ? currentPrompt.prompt : '';
        }
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        loadPrompt();
    });
</script>
@endpush

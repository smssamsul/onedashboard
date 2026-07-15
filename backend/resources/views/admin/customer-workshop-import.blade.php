@extends('layouts.admin')

@section('title', 'Import Customer Workshop')
@section('page_title', 'Import Customer Workshop')

@push('styles')
<style>
    .import-container {
        max-width: 640px;
    }

    .upload-area {
        background: var(--surface);
        border: 2px dashed var(--border);
        border-radius: var(--radius);
        padding: 2.5rem;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .upload-area:hover {
        border-color: var(--accent);
        background: var(--bg);
    }

    .upload-area.dragover {
        border-color: var(--accent);
        background: rgba(20, 184, 166, 0.05);
    }

    .upload-icon {
        width: 64px;
        height: 64px;
        background: var(--bg);
        border-radius: var(--radius);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1rem;
    }

    .upload-icon svg {
        width: 32px;
        height: 32px;
        color: var(--primary);
    }

    .upload-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text);
        margin: 0 0 0.5rem 0;
    }

    .upload-text {
        font-size: 0.875rem;
        color: var(--text-muted);
        margin: 0;
    }

    .upload-text a {
        color: var(--accent);
        font-weight: 600;
    }

    .file-input {
        display: none;
    }

    .file-preview {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: var(--bg);
        border-radius: var(--radius-sm);
        margin-top: 1.5rem;
    }

    .file-preview-icon {
        width: 48px;
        height: 48px;
        background: #d1fae5;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .file-preview-icon svg {
        width: 24px;
        height: 24px;
        color: #059669;
    }

    .file-preview-info {
        flex: 1;
    }

    .file-preview-name {
        font-weight: 600;
        color: var(--text);
        margin-bottom: 0.25rem;
    }

    .file-preview-size {
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .btn-remove {
        background: transparent;
        border: none;
        color: #ef4444;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: var(--radius-sm);
        transition: background 0.2s;
    }

    .btn-remove:hover {
        background: #fee2e2;
    }

    .btn-import {
        width: 100%;
        margin-top: 1rem;
        padding: 0.75rem 1.5rem;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: var(--radius);
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
    }

    .btn-import:hover:not(:disabled) {
        background: var(--primary-dark);
    }

    .btn-import:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .import-result {
        margin-top: 1.5rem;
    }

    .result-card {
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        padding: 1.5rem;
    }

    .result-card.success {
        border-color: #10b981;
        background: #f0fdf4;
    }

    .result-card.error {
        border-color: #ef4444;
        background: #fef2f2;
    }

    .result-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        margin-bottom: 1rem;
        color: var(--text);
    }

    .result-card.success .result-title {
        color: #059669;
    }

    .result-card.error .result-title {
        color: #dc2626;
    }

    .result-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }

    .result-stat {
        text-align: center;
    }

    .result-stat .value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--text);
    }

    .result-stat .label {
        font-size: 0.75rem;
        color: var(--text-secondary);
        text-transform: uppercase;
    }

    .info-section {
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        padding: 1.25rem;
        margin-top: 1.5rem;
    }

    .info-section h4 {
        margin: 0 0 1rem 0;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text);
    }

    .info-list {
        margin: 0;
        padding-left: 1.25rem;
        font-size: 0.875rem;
        color: var(--text-secondary);
    }

    .info-list li {
        margin-bottom: 0.5rem;
    }

    .info-list strong {
        color: var(--text);
    }

    .processing {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: var(--radius-sm);
        color: #0369a1;
        font-size: 0.875rem;
    }

    .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid #bae6fd;
        border-top-color: #0369a1;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .warning-box {
        background: #fef3c7;
        border: 1px solid #fbbf24;
        border-radius: var(--radius-sm);
        padding: 1rem;
        margin-bottom: 1.5rem;
        color: #92400e;
        font-size: 0.875rem;
    }

    .warning-box strong {
        display: block;
        margin-bottom: 0.5rem;
    }
</style>
@endpush

@section('content')
    <div class="import-container">
        <!-- Page Header -->
        <div class="page-header" style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%); border-radius: var(--radius-lg); padding: 1.5rem 2rem; color: white; margin-bottom: 1.5rem;">
            <div>
                <h1 style="margin: 0; font-size: 1.5rem; font-weight: 700;">Import Customer Workshop</h1>
                <p style="margin: 0.25rem 0 0 0; opacity: 0.8; font-size: 0.875rem;">Upload file Excel untuk import data customer workshop</p>
            </div>
        </div>

        <!-- Warning Box -->
        <div class="warning-box">
            <strong>⚠️ Penting:</strong>
            <ul style="margin: 0.5rem 0 0 0; padding-left: 1.25rem;">
                <li>Hanya data dengan produk yang mengandung keyword "workshop" yang akan diimport</li>
                <li>Jika produk belum ada, akan otomatis dibuat dengan kategori Workshop (6)</li>
                <li>Keanggotaan akan ditentukan berdasarkan harga: 0-2jt (Bronze), 3-4jt (Silver), 5-6jt (Gold), >7jt (Platinum)</li>
            </ul>
        </div>

        <!-- Upload Area -->
        <form id="importForm">
            <div class="upload-area" id="uploadArea">
                <input type="file" id="fileInput" class="file-input" name="file" accept=".xlsx,.xls,.csv" required />
                <div class="upload-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                </div>
                <h3 class="upload-title">Upload File Excel</h3>
                <p class="upload-text">Drag & drop file disini atau <a href="javascript:void(0)">browse</a></p>
                <p class="upload-text" style="margin-top: 0.5rem;">.xlsx, .xls, .csv (max 10MB)</p>
            </div>

            <!-- File Preview -->
            <div class="file-preview" id="filePreview" style="display: none;">
                <div class="file-preview-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                    </svg>
                </div>
                <div class="file-preview-info">
                    <div class="file-preview-name" id="fileName"></div>
                    <div class="file-preview-size" id="fileSize"></div>
                </div>
                <button type="button" class="btn-remove" id="removeFile">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>

            <div style="margin-top: 1rem;">
                <button type="submit" class="btn-import" id="btnImport" disabled>
                    Import Data
                </button>
            </div>
        </form>

        <!-- Result -->
        <div class="import-result" id="importResult"></div>

        <!-- Info Section -->
        <div class="info-section">
            <h4>Format File Excel</h4>
            <ul class="info-list">
                <li><strong>Kolom A:</strong> Phone (Nomor WhatsApp)</li>
                <li><strong>Kolom B:</strong> Name (Nama Lengkap)</li>
                <li><strong>Kolom C:</strong> Sapaan (Contoh: Kak, Pak, Bu)</li>
                <li><strong>Kolom D:</strong> Panggilan (Nama Panggilan)</li>
                <li><strong>Kolom E:</strong> (Kosong - merged cell untuk header)</li>
                <li><strong>Kolom F:</strong> Product (Nama Produk - harus mengandung "workshop")</li>
                <li><strong>Kolom G:</strong> Harga (Format: Rp100,000 atau angka)</li>
            </ul>
            <p style="margin-top: 1rem; font-size: 0.875rem; color: var(--text-secondary);">
                <strong>Catatan:</strong> Baris pertama biasanya header, data dimulai dari baris ke-2 atau ke-3.
            </p>
        </div>
    </div>

    <script>
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const filePreview = document.getElementById('filePreview');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const removeFile = document.getElementById('removeFile');
        const btnImport = document.getElementById('btnImport');
        const importResult = document.getElementById('importResult');

        // Click to upload
        uploadArea.addEventListener('click', () => fileInput.click());

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length) {
                fileInput.files = files;
                handleFileSelect(files[0]);
            }
        });

        // File select
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleFileSelect(e.target.files[0]);
            }
        });

        function handleFileSelect(file) {
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            uploadArea.style.display = 'none';
            filePreview.style.display = 'flex';
            btnImport.disabled = false;
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // Remove file
        removeFile.addEventListener('click', () => {
            fileInput.value = '';
            uploadArea.style.display = 'block';
            filePreview.style.display = 'none';
            btnImport.disabled = true;
            importResult.innerHTML = '';
        });

        // Form submit
        document.getElementById('importForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const token = localStorage.getItem('auth_token');
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            btnImport.disabled = true;
            btnImport.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div> Processing...';

            importResult.innerHTML = `
                <div class="processing">
                    <div class="spinner"></div>
                    Mengupload dan memproses data, mohon tunggu...
                </div>
            `;

            try {
                const response = await fetch('/api/sales/customer/import-workshop', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': token ? 'Bearer ' + token : ''
                    },
                    body: formData
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    importResult.innerHTML = `
                        <div class="result-card error">
                            <div class="result-title">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <line x1="15" y1="9" x2="9" y2="15"/>
                                    <line x1="9" y1="9" x2="15" y2="15"/>
                                </svg>
                                Import Gagal
                            </div>
                            <p style="margin:0;font-size:0.875rem;">${data.message || 'Terjadi kesalahan saat import'}</p>
                        </div>
                    `;
                    btnImport.disabled = false;
                    btnImport.innerHTML = 'Import Data';
                    return;
                }

                const summary = data.data || {};
                const hasErrors = summary.errors && summary.errors.length > 0;

                importResult.innerHTML = `
                    <div class="result-card ${hasErrors ? '' : 'success'}">
                        <div class="result-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                ${hasErrors ? 
                                    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' :
                                    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
                                }
                            </svg>
                            ${hasErrors ? 'Import Selesai dengan Peringatan' : 'Import Berhasil'}
                        </div>
                        <div class="result-stats">
                            <div class="result-stat">
                                <div class="value" style="color: #10b981;">${summary.created || 0}</div>
                                <div class="label">Created</div>
                            </div>
                            <div class="result-stat">
                                <div class="value" style="color: #3b82f6;">${summary.updated || 0}</div>
                                <div class="label">Updated</div>
                            </div>
                            <div class="result-stat">
                                <div class="value" style="color: #f59e0b;">${summary.skipped || 0}</div>
                                <div class="label">Skipped</div>
                            </div>
                            <div class="result-stat">
                                <div class="value" style="color: #8b5cf6;">${summary.products_created || 0}</div>
                                <div class="label">Products Created</div>
                            </div>
                        </div>
                        ${hasErrors ? `
                            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">
                                <strong style="font-size: 0.875rem; color: var(--text);">Errors:</strong>
                                <ul style="margin: 0.5rem 0 0 0; padding-left: 1.25rem; font-size: 0.75rem; color: var(--text-secondary);">
                                    ${summary.errors.slice(0, 10).map(err => `<li>Row ${err.row}: ${err.reason}</li>`).join('')}
                                    ${summary.errors.length > 10 ? `<li>... dan ${summary.errors.length - 10} error lainnya</li>` : ''}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                `;

                btnImport.disabled = false;
                btnImport.innerHTML = 'Import Data';

            } catch (error) {
                importResult.innerHTML = `
                    <div class="result-card error">
                        <div class="result-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="15" y1="9" x2="9" y2="15"/>
                                <line x1="9" y1="9" x2="15" y2="15"/>
                            </svg>
                            Error
                        </div>
                        <p style="margin:0;font-size:0.875rem;">Terjadi kesalahan: ${error.message}</p>
                    </div>
                `;
                btnImport.disabled = false;
                btnImport.innerHTML = 'Import Data';
            }
        });
    </script>
@endsection

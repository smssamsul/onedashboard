@extends('layouts.admin')

@section('title', 'Import Customer')
@section('page_title', 'Import Customer')

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
        font-size: 0.9375rem;
        color: var(--text);
    }

    .file-preview-size {
        font-size: 0.8125rem;
        color: var(--text-muted);
    }

    .file-preview-remove {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 0.5rem;
    }

    .file-preview-remove:hover {
        color: var(--danger);
    }

    .import-actions {
        margin-top: 1.5rem;
        display: flex;
        gap: 1rem;
    }

    .import-result {
        margin-top: 1.5rem;
    }

    .result-card {
        border-radius: var(--radius);
        padding: 1.25rem;
    }

    .result-card.success {
        background: #d1fae5;
        border: 1px solid #a7f3d0;
    }

    .result-card.error {
        background: #fee2e2;
        border: 1px solid #fecaca;
    }

    .result-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 600;
        font-size: 1rem;
        margin-bottom: 0.75rem;
    }

    .result-card.success .result-title {
        color: #065f46;
    }

    .result-card.error .result-title {
        color: #991b1b;
    }

    .result-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        margin-top: 1rem;
    }

    .result-stat {
        text-align: center;
        padding: 0.75rem;
        background: rgba(255, 255, 255, 0.5);
        border-radius: var(--radius-sm);
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
</style>
@endpush

@section('content')
    <div class="import-container">
        <!-- Page Header -->
        <div class="page-header" style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%); border-radius: var(--radius-lg); padding: 1.5rem 2rem; color: white; margin-bottom: 1.5rem;">
            <div>
                <h1 style="margin: 0; font-size: 1.5rem; font-weight: 700;">Import Customer</h1>
                <p style="margin: 0.25rem 0 0 0; opacity: 0.8; font-size: 0.875rem;">Upload file Excel untuk import data customer</p>
            </div>
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
                    <div class="file-preview-name" id="fileName">filename.xlsx</div>
                    <div class="file-preview-size" id="fileSize">0 KB</div>
                </div>
                <button type="button" class="file-preview-remove" id="removeFile">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>

            <!-- Actions -->
            <div class="import-actions">
                <button type="submit" class="btn btn-primary" id="btnImport" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Import Sekarang
                </button>
            </div>
        </form>

        <!-- Result -->
        <div class="import-result" id="importResult"></div>

        <!-- Info Section -->
        <div class="info-section">
            <h4>Format File yang Didukung</h4>
            <ul class="info-list">
                <li>Kolom A: Tanggal (create_at)</li>
                <li>Kolom B: Email</li>
                <li>Kolom C: Nama</li>
                <li>Kolom D: Kota</li>
                <li>Kolom E: Provinsi</li>
                <li>Kolom F: Alamat</li>
                <li>Kolom G: Alamat 2</li>
                <li>Kolom H: Tanggal Lahir</li>
                <li>Kolom I: NIK</li>
                <li>Kolom J: Status Pernikahan</li>
                <li>Kolom K: Pekerjaan</li>
                <li>Kolom L: Jabatan</li>
                <li>Kolom M: Nama Perusahaan</li>
                <li>Kolom N: Pendapatan (klasifikasi akan dihitung otomatis)</li>
                <li>Kolom O: Jenis Kelamin (L/P akan di-convert)</li>
                <li>Kolom P: Telepon</li>
                <li>Kolom Q: WhatsApp</li>
            </ul>
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
                const response = await fetch('/api/sales/customer/import-excel', {
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
                    return;
                }

                const summary = data.data || {};
                importResult.innerHTML = `
                    <div class="result-card success">
                        <div class="result-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            Import Berhasil!
                        </div>
                        <p style="margin:0;font-size:0.875rem;">Data customer berhasil diimport ke database.</p>
                        <div class="result-stats">
                            <div class="result-stat">
                                <div class="value">${summary.created || 0}</div>
                                <div class="label">Created</div>
                            </div>
                            <div class="result-stat">
                                <div class="value">${summary.updated || 0}</div>
                                <div class="label">Updated</div>
                            </div>
                            <div class="result-stat">
                                <div class="value">${summary.skipped || 0}</div>
                                <div class="label">Skipped</div>
                            </div>
                        </div>
                    </div>
                `;

                // Reset form
                fileInput.value = '';
                uploadArea.style.display = 'block';
                filePreview.style.display = 'none';

            } catch (error) {
                console.error('Import error:', error);
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
                        <p style="margin:0;font-size:0.875rem;">Terjadi kesalahan saat menghubungi server.</p>
                    </div>
                `;
            } finally {
                btnImport.disabled = false;
                btnImport.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Import Sekarang
                `;
            }
        });
    </script>
@endsection

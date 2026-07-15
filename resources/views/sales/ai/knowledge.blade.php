@extends('layouts.sales')

@section('title', 'AI Knowledge')
@section('page_title', 'Manajemen Knowledge AI')

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

    .action-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
    }

    .search-input {
        position: relative;
    }

    .search-input input {
        padding: 0.625rem 1rem 0.625rem 2.5rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        width: 280px;
        background: var(--surface);
    }

    .filter-select {
        padding: 0.625rem 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        background: var(--surface);
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

    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        overflow-y: auto;
        padding: 1rem;
    }

    .modal-overlay.active {
        display: flex;
    }

    .modal {
        background: var(--surface);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 800px;
        box-shadow: var(--shadow-lg);
        margin: auto;
    }

    .modal-header {
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-body {
        padding: 1.5rem;
        max-height: 70vh;
        overflow-y: auto;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
        width: 100%;
        padding: 0.625rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
    }

    .form-group textarea {
        resize: vertical;
        min-height: 150px;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .modal-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
    }

    .badge {
        padding: 0.25rem 0.75rem;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: 500;
    }

    .badge-master {
        background: #DBEAFE;
        color: #1E40AF;
    }

    .badge-product {
        background: #D1FAE5;
        color: #059669;
    }
</style>
@endpush

@section('content')
<div class="action-bar">
    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <div class="search-input">
            <input type="text" id="searchInput" placeholder="Cari knowledge...">
        </div>
        <select class="filter-select" id="filterType" style="width: 150px;">
            <option value="">Semua Tipe</option>
            <option value="master">Master</option>
            <option value="product">Product</option>
        </select>
    </div>
    <button class="btn btn-primary" onclick="openModal()">+ Tambah Knowledge</button>
</div>

<div class="card-table">
    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Judul</th>
                    <th>Tipe</th>
                    <th>Chunks</th>
                    <th>Tanggal</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                <tr>
                    <td colspan="6" style="text-align: center; padding: 2rem;">Memuat data...</td>
                </tr>
            </tbody>
        </table>
    </div>
    <div class="pagination" id="pagination"></div>
</div>

<!-- Modal -->
<div class="modal-overlay" id="modalOverlay" onclick="closeModal()">
    <div class="modal" onclick="event.stopPropagation()">
        <div class="modal-header">
            <h3 id="modalTitle">Tambah Knowledge</h3>
            <button onclick="closeModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
        </div>
        <div class="modal-body">
            <form id="knowledgeForm">
                <input type="hidden" id="knowledgeId">
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Tipe *</label>
                        <select id="type" required>
                            <option value="">Pilih Tipe</option>
                            <option value="master">Master</option>
                            <option value="product">Product</option>
                        </select>
                    </div>
                    <div class="form-group" id="productIdGroup" style="display: none;">
                        <label>Product ID</label>
                        <input type="number" id="product_id" placeholder="ID Produk">
                    </div>
                </div>

                <div class="form-group">
                    <label>Judul *</label>
                    <input type="text" id="title" required placeholder="Judul knowledge">
                </div>

                <div class="form-group">
                    <label>Konten *</label>
                    <textarea id="content" required placeholder="Masukkan konten knowledge..."></textarea>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="auto_chunk" checked style="width: auto; margin-right: 0.5rem;">
                            Auto Chunk
                        </label>
                    </div>
                </div>

                <div class="form-row" id="chunkSettings" style="display: none;">
                    <div class="form-group">
                        <label>Chunk Size</label>
                        <input type="number" id="chunk_size" value="500" min="100" max="2000">
                    </div>
                    <div class="form-group">
                        <label>Chunk Overlap</label>
                        <input type="number" id="chunk_overlap" value="50" min="0" max="200">
                    </div>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn" onclick="closeModal()" style="background: var(--surface); border: 1px solid var(--border);">Batal</button>
            <button class="btn btn-primary" onclick="saveKnowledge()">Simpan</button>
        </div>
    </div>
</div>
@endsection

@push('scripts')
<script>
    let currentPage = 1;
    let searchTerm = '';
    let filterType = '';

    // Toggle chunk settings
    document.getElementById('auto_chunk').addEventListener('change', function(e) {
        document.getElementById('chunkSettings').style.display = e.target.checked ? 'grid' : 'none';
    });

    // Toggle product_id field
    document.getElementById('type').addEventListener('change', function(e) {
        const productIdGroup = document.getElementById('productIdGroup');
        if (e.target.value === 'product') {
            productIdGroup.style.display = 'block';
        } else {
            productIdGroup.style.display = 'none';
            document.getElementById('product_id').value = '';
        }
    });

    async function loadData(page = 1) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            let url = `/api/knowledge-source?page=${page}`;
            if (searchTerm) {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }
            if (filterType) {
                url += `&type=${filterType}`;
            }

            const response = await fetch(url, {
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
                renderTable(result.data, result.pagination);
                renderPagination(result.pagination);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    function renderTable(data, pagination = null) {
        const tbody = document.getElementById('tableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Tidak ada data</td></tr>';
            return;
        }

        const perPage = pagination ? pagination.per_page : 15;
        const startNumber = pagination ? (pagination.current_page - 1) * perPage + 1 : 1;

        tbody.innerHTML = data.map((item, index) => {
            const typeClass = item.type === 'master' ? 'badge-master' : 'badge-product';
            const chunksCount = item.chunks ? item.chunks.length : 0;
            const date = new Date(item.created_at).toLocaleDateString('id-ID');
            
            return `
                <tr>
                    <td>${startNumber + index}</td>
                    <td>${item.title || '-'}</td>
                    <td><span class="badge ${typeClass}">${item.type || '-'}</span></td>
                    <td>${chunksCount}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn" onclick="editKnowledge(${item.id})" style="background: var(--primary); color: white; padding: 0.375rem 0.75rem; font-size: 0.75rem;">Edit</button>
                        <button class="btn" onclick="deleteKnowledge(${item.id})" style="background: var(--primary); color: white; padding: 0.375rem 0.75rem; font-size: 0.75rem;">Hapus</button>
                        <button class="btn" onclick="regenerateEmbeddings(${item.id})" style="background: #059669; color: white; padding: 0.375rem 0.75rem; font-size: 0.75rem;">Regenerate</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderPagination(pagination) {
        const paginationEl = document.getElementById('pagination');
        if (!pagination || pagination.last_page <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        paginationEl.innerHTML = `
            <button onclick="loadData(${pagination.current_page - 1})" ${pagination.current_page === 1 ? 'disabled' : ''}>Sebelumnya</button>
            <span>Halaman ${pagination.current_page} dari ${pagination.last_page}</span>
            <button onclick="loadData(${pagination.current_page + 1})" ${pagination.current_page === pagination.last_page ? 'disabled' : ''}>Selanjutnya</button>
        `;
    }

    function openModal(id = null) {
        const modal = document.getElementById('modalOverlay');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('knowledgeForm');
        
        if (id) {
            title.textContent = 'Edit Knowledge';
            loadKnowledge(id);
        } else {
            title.textContent = 'Tambah Knowledge';
            form.reset();
            document.getElementById('knowledgeId').value = '';
            document.getElementById('auto_chunk').checked = true;
            document.getElementById('chunkSettings').style.display = 'grid';
            document.getElementById('productIdGroup').style.display = 'none';
        }
        
        modal.classList.add('active');
    }

    function closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    }

    async function loadKnowledge(id) {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch(`/api/knowledge-source/${id}`, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success) {
                const data = result.data;
                document.getElementById('knowledgeId').value = data.id;
                document.getElementById('type').value = data.type || '';
                document.getElementById('product_id').value = data.product_id || '';
                document.getElementById('title').value = data.title || '';
                document.getElementById('content').value = data.content || '';
                
                if (data.type === 'product') {
                    document.getElementById('productIdGroup').style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error loading knowledge:', error);
        }
    }

    async function saveKnowledge() {
        const id = document.getElementById('knowledgeId').value;
        const type = document.getElementById('type').value;
        const product_id = document.getElementById('product_id').value;
        const title = document.getElementById('title').value;
        const content = document.getElementById('content').value;
        const auto_chunk = document.getElementById('auto_chunk').checked;
        const chunk_size = document.getElementById('chunk_size').value;
        const chunk_overlap = document.getElementById('chunk_overlap').value;

        if (!type || !title || !content) {
            alert('Tipe, Judul, dan Konten harus diisi');
            return;
        }

        if (type === 'product' && !product_id) {
            alert('Product ID wajib diisi untuk tipe product');
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const url = id ? `/api/knowledge-source/${id}` : '/api/knowledge-source';
            const method = id ? 'PUT' : 'POST';

            const payload = {
                type,
                title,
                content,
                auto_chunk,
                chunk_size: parseInt(chunk_size),
                chunk_overlap: parseInt(chunk_overlap)
            };

            if (type === 'product' && product_id) {
                payload.product_id = parseInt(product_id);
            }

            if (id) {
                payload.regenerate_embeddings = false;
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (result.success) {
                closeModal();
                loadData(currentPage);
                alert(result.message || 'Data berhasil disimpan');
            } else {
                alert(result.message || 'Terjadi kesalahan');
            }
        } catch (error) {
            console.error('Error saving knowledge:', error);
            alert('Terjadi kesalahan saat menyimpan data');
        }
    }

    async function deleteKnowledge(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus knowledge ini?')) {
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch(`/api/knowledge-source/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                loadData(currentPage);
                alert(result.message || 'Data berhasil dihapus');
            } else {
                alert(result.message || 'Terjadi kesalahan');
            }
        } catch (error) {
            console.error('Error deleting knowledge:', error);
            alert('Terjadi kesalahan saat menghapus data');
        }
    }

    async function regenerateEmbeddings(id) {
        if (!confirm('Apakah Anda yakin ingin regenerate embeddings? Proses ini akan menghapus chunks lama dan membuat yang baru.')) {
            return;
        }

        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch(`/api/knowledge-source/${id}/regenerate-embeddings`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                loadData(currentPage);
                alert(result.message || 'Embeddings berhasil di-regenerate');
            } else {
                alert(result.message || 'Terjadi kesalahan');
            }
        } catch (error) {
            console.error('Error regenerating embeddings:', error);
            alert('Terjadi kesalahan saat regenerate embeddings');
        }
    }

    function editKnowledge(id) {
        openModal(id);
    }

    // Event listeners
    document.getElementById('searchInput').addEventListener('input', function(e) {
        searchTerm = e.target.value;
        currentPage = 1;
        loadData(1);
    });

    document.getElementById('filterType').addEventListener('change', function(e) {
        filterType = e.target.value;
        currentPage = 1;
        loadData(1);
    });

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        loadData();
    });
</script>
@endpush

@extends('layouts.admin')

@section('title', 'RabbitMQ Dashboard')
@section('page_title', 'RabbitMQ Dashboard')

@push('styles')
<style>
    .rabbitmq-dashboard {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
    }

    .status-badge.connected {
        background: #D1FAE5;
        color: #065F46;
    }

    .status-badge.disconnected {
        background: #FEE2E2;
        color: #991B1B;
    }

    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
    }

    .status-dot.online {
        background: #10B981;
        animation: pulse 2s infinite;
    }

    .status-dot.offline {
        background: #EF4444;
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .stat-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 0.75rem;
        padding: 1.5rem;
        box-shadow: var(--shadow-sm);
        transition: all 0.3s ease;
    }

    .stat-card:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
    }

    .stat-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
    }

    .stat-card-title {
        font-size: 0.875rem;
        color: var(--muted);
        font-weight: 500;
    }

    .stat-card-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text);
        margin: 0;
    }

    .stat-card-change {
        font-size: 0.75rem;
        color: var(--muted);
        margin-top: 0.25rem;
    }

    .queue-table {
        background: var(--surface);
        border-radius: 0.75rem;
        overflow: hidden;
        box-shadow: var(--shadow-sm);
    }

    .queue-table-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .queue-table-header h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
    }

    .refresh-btn {
        background: var(--primary);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.3s ease;
    }

    .refresh-btn:hover {
        background: var(--primary-dark);
    }

    .refresh-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .refresh-btn .spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .table-responsive {
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    thead {
        background: #f9fafb;
    }

    th {
        padding: 1rem;
        text-align: left;
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    td {
        padding: 1rem;
        border-top: 1px solid var(--border);
        font-size: 0.875rem;
    }

    tbody tr:hover {
        background: #f9fafb;
    }

    .badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 500;
    }

    .badge-success {
        background: #D1FAE5;
        color: #065F46;
    }

    .badge-warning {
        background: #FEF3C7;
        color: #92400E;
    }

    .badge-danger {
        background: #FEE2E2;
        color: #991B1B;
    }

    .badge-info {
        background: #DBEAFE;
        color: #1E40AF;
    }

    .queue-name {
        font-weight: 600;
        color: var(--text);
    }

    .queue-actions {
        display: flex;
        gap: 0.5rem;
    }

    .btn-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.75rem;
        border-radius: 0.375rem;
        border: none;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
    }

    .btn-view {
        background: #DBEAFE;
        color: #1E40AF;
    }

    .btn-view:hover {
        background: #BFDBFE;
    }

    .btn-purge {
        background: #FEE2E2;
        color: #991B1B;
    }

    .btn-purge:hover {
        background: #FECACA;
    }

    .error-message {
        background: #FEF2F2;
        border: 1px solid #FEE2E2;
        color: #991B1B;
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
    }

    .loading {
        text-align: center;
        padding: 3rem;
        color: var(--muted);
    }

    .empty-state {
        text-align: center;
        padding: 3rem;
        color: var(--muted);
    }

    .empty-state svg {
        width: 64px;
        height: 64px;
        margin-bottom: 1rem;
        opacity: 0.5;
    }

    .auto-refresh-info {
        font-size: 0.75rem;
        color: var(--muted);
        margin-top: 0.5rem;
    }
</style>
@endpush

@section('content')
<div class="rabbitmq-dashboard">
    <!-- Status Header -->
    <div class="stat-card">
        <div class="stat-card-header">
            <div>
                <h3 style="margin: 0 0 0.5rem 0;">RabbitMQ Status</h3>
                <div id="status-badge" class="status-badge disconnected">
                    <span class="status-dot offline"></span>
                    <span id="status-text">Checking...</span>
                </div>
            </div>
            <button class="refresh-btn" id="refresh-btn" onclick="loadDashboard()">
                <span id="refresh-icon">↻</span>
                <span>Refresh</span>
            </button>
        </div>
        <div id="connection-info" style="margin-top: 1rem; font-size: 0.875rem; color: var(--muted);">
            Host: <strong>{{ env('RABBITMQ_HOST', 'localhost') }}</strong> | 
            Port: <strong>{{ env('RABBITMQ_MANAGEMENT_PORT', 15672) }}</strong>
        </div>
        <div class="auto-refresh-info">
            Auto-refresh setiap 30 detik
        </div>
    </div>

    <!-- Error Message -->
    <div id="error-message" class="error-message" style="display: none;"></div>

    <!-- Stats Grid -->
    <div id="stats-container" class="stats-grid" style="display: none;">
        <div class="stat-card">
            <div class="stat-card-header">
                <span class="stat-card-title">Total Queues</span>
            </div>
            <p class="stat-card-value" id="stat-queues">0</p>
        </div>
        <div class="stat-card">
            <div class="stat-card-header">
                <span class="stat-card-title">Total Messages</span>
            </div>
            <p class="stat-card-value" id="stat-messages">0</p>
            <p class="stat-card-change" id="stat-messages-detail">0 ready, 0 unacked</p>
        </div>
        <div class="stat-card">
            <div class="stat-card-header">
                <span class="stat-card-title">Consumers</span>
            </div>
            <p class="stat-card-value" id="stat-consumers">0</p>
        </div>
        <div class="stat-card">
            <div class="stat-card-header">
                <span class="stat-card-title">Connections</span>
            </div>
            <p class="stat-card-value" id="stat-connections">0</p>
        </div>
        <div class="stat-card">
            <div class="stat-card-header">
                <span class="stat-card-title">Channels</span>
            </div>
            <p class="stat-card-value" id="stat-channels">0</p>
        </div>
        <div class="stat-card">
            <div class="stat-card-header">
                <span class="stat-card-title">Failed Jobs</span>
            </div>
            <p class="stat-card-value" id="stat-failed-jobs">0</p>
        </div>
    </div>

    <!-- Queues Table -->
    <div class="queue-table" id="queues-container" style="display: none;">
        <div class="queue-table-header">
            <h3>Queues</h3>
        </div>
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Queue Name</th>
                        <th>Messages</th>
                        <th>Ready</th>
                        <th>Unacked</th>
                        <th>Consumers</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="queues-tbody">
                    <tr>
                        <td colspan="6" class="loading">Loading...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal untuk View Messages -->
<div id="messages-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; overflow-y: auto;">
    <div style="max-width: 900px; margin: 50px auto; background: white; border-radius: 8px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 1.5rem; font-weight: 600;">Queue Messages</h2>
            <button onclick="closeMessagesModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6B7280;">&times;</button>
        </div>
        
        <div id="messages-loading" style="text-align: center; padding: 40px; color: #6B7280;">
            <p>Loading messages...</p>
        </div>
        
        <div id="messages-content" style="display: none;">
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Jumlah message (max 10):</label>
                <input type="number" id="messages-count" value="1" min="1" max="10" style="padding: 8px; border: 1px solid #D1D5DB; border-radius: 4px; width: 100px;">
                <button onclick="loadQueueMessages()" style="margin-left: 8px; padding: 8px 16px; background: #3B82F6; color: white; border: none; border-radius: 4px; cursor: pointer;">Load</button>
            </div>
            <div id="messages-list"></div>
        </div>
        
        <div id="messages-error" style="display: none; padding: 16px; background: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 4px; color: #991B1B;"></div>
    </div>
</div>
@endsection

@push('scripts')
<script>
let autoRefreshInterval;

// Load dashboard data
async function loadDashboard() {
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const errorMsg = document.getElementById('error-message');
    
    // Disable button and show loading
    refreshBtn.disabled = true;
    refreshIcon.innerHTML = '<span class="spinner"></span>';
    errorMsg.style.display = 'none';

    try {
        const response = await fetch('/api/admin/rabbitmq/stats');
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Gagal mengambil data');
        }

        const data = result.data;

        // Update status badge
        const statusBadge = document.getElementById('status-badge');
        const statusText = document.getElementById('status-text');
        const statusDot = statusBadge.querySelector('.status-dot');

        if (data.connected) {
            statusBadge.className = 'status-badge connected';
            statusDot.className = 'status-dot online';
            statusText.textContent = 'Connected';
            document.getElementById('stats-container').style.display = 'grid';
            document.getElementById('queues-container').style.display = 'block';
        } else {
            statusBadge.className = 'status-badge disconnected';
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Disconnected';
            errorMsg.textContent = data.error || 'Tidak dapat terhubung ke RabbitMQ';
            errorMsg.style.display = 'block';
            document.getElementById('stats-container').style.display = 'none';
            document.getElementById('queues-container').style.display = 'none';
            return;
        }

        // Update stats
        if (data.stats) {
            document.getElementById('stat-queues').textContent = data.stats.total_queues || 0;
            document.getElementById('stat-messages').textContent = data.stats.total_messages || 0;
            document.getElementById('stat-messages-detail').textContent = 
                `${data.stats.total_messages_ready || 0} ready, ${data.stats.total_messages_unacked || 0} unacked`;
            document.getElementById('stat-consumers').textContent = data.stats.total_consumers || 0;
            document.getElementById('stat-connections').textContent = data.stats.total_connections || 0;
            document.getElementById('stat-channels').textContent = data.stats.total_channels || 0;
            document.getElementById('stat-failed-jobs').textContent = data.failed_jobs_count || 0;
        }

        // Update queues table
        updateQueuesTable(data.queues || []);

    } catch (error) {
        console.error('Error loading dashboard:', error);
        errorMsg.textContent = 'Error: ' + error.message;
        errorMsg.style.display = 'block';
        
        // Update status to disconnected
        const statusBadge = document.getElementById('status-badge');
        const statusText = document.getElementById('status-text');
        const statusDot = statusBadge.querySelector('.status-dot');
        statusBadge.className = 'status-badge disconnected';
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Error';
    } finally {
        refreshBtn.disabled = false;
        refreshIcon.textContent = '↻';
    }
}

// Update queues table
function updateQueuesTable(queues) {
    const tbody = document.getElementById('queues-tbody');
    
    if (queues.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12c0 1.2-4.03 6-9 6s-9-4.8-9-6 4.03-6 9-6 9 4.8 9 6z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <p>No queues found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = queues.map(queue => {
        const vhost = queue.vhost || '/';
        const name = queue.name || 'unknown';
        const messages = queue.messages || 0;
        const ready = queue.messages_ready || 0;
        const unacked = queue.messages_unacknowledged || 0;
        const consumers = queue.consumers || 0;

        // Get badge class based on message count
        let badgeClass = 'badge-success';
        if (messages > 100) {
            badgeClass = 'badge-danger';
        } else if (messages > 10) {
            badgeClass = 'badge-warning';
        }

        return `
            <tr>
                <td>
                    <span class="queue-name">${name}</span>
                    <br>
                    <small style="color: var(--muted);">vhost: ${vhost}</small>
                </td>
                <td><span class="badge ${badgeClass}">${messages}</span></td>
                <td>${ready}</td>
                <td>${unacked}</td>
                <td>
                    ${consumers > 0 ? 
                        `<span class="badge badge-info">${consumers}</span>` : 
                        '<span class="badge" style="background: #F3F4F6; color: #6B7280;">0</span>'
                    }
                </td>
                <td>
                    <div class="queue-actions">
                        <button class="btn-sm btn-view" onclick="viewQueueDetail('${vhost}', '${name}')">
                            View
                        </button>
                        ${messages > 0 ? `
                            <button class="btn-sm btn-view" onclick="viewQueueMessages('${vhost}', '${name}')" style="background: #F59E0B; color: white;">
                                Messages
                            </button>
                            <button class="btn-sm btn-purge" onclick="purgeQueue('${vhost}', '${name}')">
                                Purge
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// View queue detail
function viewQueueDetail(vhost, queueName) {
    window.open(`http://localhost:15672/#/queues/${encodeURIComponent(vhost)}/${encodeURIComponent(queueName)}`, '_blank');
}

// Variables untuk messages modal
let currentQueueVhost = null;
let currentQueueName = null;

// View queue messages
function viewQueueMessages(vhost, queueName) {
    currentQueueVhost = vhost;
    currentQueueName = queueName;
    document.getElementById('messages-modal').style.display = 'block';
    document.getElementById('messages-loading').style.display = 'block';
    document.getElementById('messages-content').style.display = 'none';
    document.getElementById('messages-error').style.display = 'none';
    loadQueueMessages();
}

// Close messages modal
function closeMessagesModal() {
    document.getElementById('messages-modal').style.display = 'none';
    currentQueueVhost = null;
    currentQueueName = null;
}

// Load queue messages
async function loadQueueMessages() {
    if (!currentQueueVhost || !currentQueueName) return;
    
    const count = parseInt(document.getElementById('messages-count').value) || 1;
    const loading = document.getElementById('messages-loading');
    const content = document.getElementById('messages-content');
    const error = document.getElementById('messages-error');
    const messagesList = document.getElementById('messages-list');
    
    loading.style.display = 'block';
    content.style.display = 'none';
    error.style.display = 'none';
    
    try {
        const response = await fetch('/api/admin/rabbitmq/queue-messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
            },
            body: JSON.stringify({
                vhost: currentQueueVhost,
                queue: currentQueueName,
                count: count
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Gagal mengambil messages');
        }
        
        loading.style.display = 'none';
        
        if (result.data && result.data.length > 0) {
            content.style.display = 'block';
            renderMessages(result.data);
        } else {
            error.style.display = 'block';
            error.textContent = 'Tidak ada message di queue ini atau queue sudah kosong.';
        }
        
    } catch (err) {
        console.error('Error loading messages:', err);
        loading.style.display = 'none';
        error.style.display = 'block';
        error.textContent = 'Error: ' + err.message;
    }
}

// Render messages
function renderMessages(messages) {
    const messagesList = document.getElementById('messages-list');
    
    messagesList.innerHTML = messages.map((msg, index) => {
        const jobClass = msg.job_class || 'Unknown';
        const decodedProps = msg.decoded_properties || {};
        const payload = msg.payload || {};
        
        let propsHtml = '';
        
        if (decodedProps.phone_no) {
            propsHtml += `
                <div style="margin-bottom: 8px;">
                    <strong style="color: #3B82F6;">Phone No:</strong> ${decodedProps.phone_no}
                </div>
                <div style="margin-bottom: 8px;">
                    <strong style="color: #3B82F6;">Message:</strong> 
                    <div style="background: #F3F4F6; padding: 12px; border-radius: 4px; margin-top: 4px; white-space: pre-wrap;">${decodedProps.message || 'N/A'}</div>
                </div>
                <div style="margin-bottom: 8px;">
                    <strong style="color: #3B82F6;">Woowa Key:</strong> ${decodedProps.woowa_key || 'N/A'}
                </div>
                <div style="margin-bottom: 8px;">
                    <strong style="color: #3B82F6;">Max Tries:</strong> ${decodedProps.max_tries || 'N/A'}
                </div>
                <div style="margin-bottom: 8px;">
                    <strong style="color: #3B82F6;">Timeout:</strong> ${decodedProps.timeout || 'N/A'} seconds
                </div>
            `;
        } else if (msg.error) {
            propsHtml = `<div style="color: #DC2626; padding: 12px; background: #FEF2F2; border-radius: 4px;">${msg.error}</div>`;
        } else {
            propsHtml = `<pre style="background: #F3F4F6; padding: 12px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(decodedProps, null, 2)}</pre>`;
        }
        
        return `
            <div style="border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #F9FAFB;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600; color: #111827;">Message #${index + 1}</h3>
                        <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 0.875rem;">Job Class: <strong>${jobClass}</strong></p>
                    </div>
                    ${msg.redelivered ? '<span style="background: #FEF3C7; color: #92400E; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">Redelivered</span>' : ''}
                </div>
                
                ${propsHtml}
                
                <details style="margin-top: 16px;">
                    <summary style="cursor: pointer; color: #3B82F6; font-weight: 500; margin-bottom: 8px;">Show Raw Payload</summary>
                    <pre style="background: #1F2937; color: #F9FAFB; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 0.875rem; max-height: 400px; overflow-y: auto;">${JSON.stringify(payload, null, 2)}</pre>
                </details>
                
                ${msg.routing_key ? `<div style="margin-top: 8px; font-size: 0.875rem; color: #6B7280;">Routing Key: <code>${msg.routing_key}</code></div>` : ''}
            </div>
        `;
    }).join('');
}

// Purge queue
async function purgeQueue(vhost, queueName) {
    if (!confirm(`Apakah Anda yakin ingin menghapus semua pesan di queue "${queueName}"?`)) {
        return;
    }

    try {
        const response = await fetch('/api/admin/rabbitmq/purge-queue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
            },
            body: JSON.stringify({
                vhost: vhost,
                queue: queueName
            })
        });

        const result = await response.json();

        if (result.success) {
            alert('Queue berhasil di-purge');
            loadDashboard(); // Reload data
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error purging queue:', error);
        alert('Error: ' + error.message);
    }
}

// Auto refresh every 30 seconds
function startAutoRefresh() {
    autoRefreshInterval = setInterval(() => {
        loadDashboard();
    }, 30000); // 30 seconds
}

// Stop auto refresh
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadDashboard();
    startAutoRefresh();

    // Stop auto refresh when page is hidden
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopAutoRefresh();
        } else {
            startAutoRefresh();
            loadDashboard(); // Reload when page becomes visible
        }
    });
});
</script>
@endpush


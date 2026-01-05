@extends('layouts.user')

@section('title', 'List / Task')

@push('styles')
<style>
    .task-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .task-item {
        background: var(--surface);
        border-radius: var(--radius-sm);
        padding: 1rem;
        border: 1px solid var(--border);
        margin-bottom: 0.75rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        cursor: pointer;
        transition: all 0.2s;
    }

    .task-item:hover {
        box-shadow: var(--shadow-sm);
    }

    .task-status {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .task-status.pending {
        background: #F59E0B;
    }

    .task-status.progress {
        background: #3B82F6;
    }

    .task-status.completed {
        background: #10B981;
    }

    .task-actions {
        display: flex;
        gap: 0.5rem;
        margin-left: auto;
    }

    .filter-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
    }

    .filter-tab {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border);
        background: var(--surface);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s;
    }

    .filter-tab.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
    }
</style>
@endpush

@section('content')
    <div class="task-header">
        <h2>List / Task Saya</h2>
        <button class="btn btn-primary" onclick="openTaskModal()">+ Tambah Task</button>
    </div>

    <div class="filter-tabs">
        <div class="filter-tab active" data-filter="all" onclick="filterTasks('all')">Semua</div>
        <div class="filter-tab" data-filter="pending" onclick="filterTasks('pending')">Pending</div>
        <div class="filter-tab" data-filter="progress" onclick="filterTasks('progress')">Progress</div>
        <div class="filter-tab" data-filter="completed" onclick="filterTasks('completed')">Selesai</div>
    </div>

    <div id="taskList">
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">Memuat data...</div>
    </div>
@endsection

@push('scripts')
<script>
    let currentFilter = 'all';
    let allTasks = [];

    async function loadTasks() {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/login';
                return;
            }

            const response = await fetch('/api/user/tasks', {
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
                allTasks = result.data || [];
                filterTasks(currentFilter);
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    function filterTasks(filter) {
        currentFilter = filter;
        
        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.filter === filter) {
                tab.classList.add('active');
            }
        });

        let filteredTasks = allTasks;
        if (filter !== 'all') {
            filteredTasks = allTasks.filter(task => task.status === filter);
        }

        renderTasks(filteredTasks);
    }

    function renderTasks(tasks) {
        const taskList = document.getElementById('taskList');
        
        if (!tasks || tasks.length === 0) {
            taskList.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Tidak ada task</div>';
            return;
        }

        taskList.innerHTML = tasks.map(task => {
            const statusClass = task.status === 'completed' ? 'completed' : 
                              task.status === 'progress' ? 'progress' : 'pending';
            const statusText = task.status === 'completed' ? 'Selesai' : 
                             task.status === 'progress' ? 'Progress' : 'Pending';
            
            return `
                <div class="task-item" onclick="openTaskModal(${task.id})">
                    <div class="task-status ${statusClass}"></div>
                    <div style="flex: 1;">
                        <div style="font-weight: 500; margin-bottom: 0.25rem;">${task.title || 'Task'}</div>
                        <div style="font-size: 0.875rem; color: var(--text-muted);">${task.description || ''}</div>
                        ${task.due_date ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Deadline: ${task.due_date}</div>` : ''}
                    </div>
                    <div class="task-actions">
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${statusText}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function openTaskModal(id = null) {
        // TODO: Implement task modal
        alert('Fitur tambah/edit task akan segera tersedia');
    }

    document.addEventListener('DOMContentLoaded', function() {
        loadTasks();
    });
</script>
@endpush


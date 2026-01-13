@extends('layouts.sales')

@section('title', 'Order')
@section('page_title', 'Order')

@push('styles')
<style>
    .page-header {
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
        border-radius: var(--radius-lg);
        padding: 1.5rem 2rem;
        color: white;
        margin-bottom: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .page-header h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
    }

    .page-header p {
        margin: 0.25rem 0 0 0;
        opacity: 0.8;
        font-size: 0.875rem;
    }

    .stats-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    @media (max-width: 1024px) {
        .stats-row {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 640px) {
        .stats-row {
            grid-template-columns: 1fr;
        }
    }

    .stat-box {
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        transition: all 0.2s ease;
    }

    .stat-box:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }

    .stat-box .icon {
        width: 48px;
        height: 48px;
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 0.75rem;
    }

    .stat-box .icon svg {
        width: 24px;
        height: 24px;
    }

    .stat-box .value {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--text);
        line-height: 1.2;
    }

    .stat-box .label {
        font-size: 0.8125rem;
        color: var(--text-muted);
        margin-top: 0.25rem;
    }

    .action-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
    }

    .search-filter-group {
        display: flex;
        gap: 0.75rem;
        align-items: center;
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
        transition: all 0.2s;
    }

    .search-input input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
    }

    .search-input svg {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        color: var(--text-muted);
        pointer-events: none;
    }

    .filter-select {
        padding: 0.625rem 2rem 0.625rem 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        background: var(--surface);
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0.75rem center;
        background-size: 16px;
    }

    .filter-select:focus {
        outline: none;
        border-color: var(--accent);
    }

    .btn-group {
        display: flex;
        gap: 0.5rem;
    }

    .btn {
        padding: 0.625rem 1.25rem;
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        border: none;
    }

    .btn-secondary {
        background: var(--bg);
        color: var(--text);
        border: 1px solid var(--border);
    }

    .btn-secondary:hover {
        background: var(--border);
    }

    .btn-primary {
        background: var(--primary);
        color: white;
    }

    .btn-primary:hover {
        background: var(--primary-dark);
    }

    .card-table {
        background: var(--surface);
        border-radius: var(--radius);
        border: 1px solid var(--border);
        overflow: hidden;
        margin-bottom: 1.5rem;
    }

    .card-table-header {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border);
        background: var(--bg);
    }

    .card-table-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--text);
    }

    .table-responsive {
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    thead {
        background: var(--bg);
    }

    th {
        padding: 0.875rem 1rem;
        text-align: left;
        font-size: 0.75rem;
        font-weight: 600;
        color: white;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid var(--border);
        white-space: nowrap;
    }

    td {
        padding: 1rem;
        border-bottom: 1px solid var(--border);
        font-size: 0.875rem;
        color: var(--text);
        vertical-align: middle;
    }

    tbody tr {
        transition: background-color 0.2s;
    }

    tbody tr:hover {
        background: var(--bg);
    }

    tbody tr:last-child td {
        border-bottom: none;
    }

    .lead-status {
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        display: inline-block;
        text-transform: uppercase;
    }

    .lead-status.new {
        background: #dbeafe;
        color: #1d4ed8;
    }

    .lead-status.contacted {
        background: #fef3c7;
        color: #d97706;
    }

    .lead-status.qualified {
        background: #d1fae5;
        color: #059669;
    }

    .lead-status.converted {
        background: #ccfbf1;
        color: #0d9488;
    }

    .lead-status.lost {
        background: #fee2e2;
        color: #dc2626;
    }

    .customer-group {
        background: var(--surface);
        border-radius: var(--radius);
        margin-bottom: 0.75rem;
        border: 1px solid var(--border);
        overflow: hidden;
    }

    .customer-header {
        padding: 1rem 1.5rem;
        background: var(--bg);
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .customer-header:hover {
        background: var(--surface);
    }

    .customer-info {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .customer-name {
        font-weight: 600;
        color: var(--text);
        font-size: 0.9375rem;
    }

    .customer-contact {
        font-size: 0.8125rem;
        color: var(--text-muted);
    }

    .customer-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .order-dropdown-toggle {
        background: var(--primary);
        color: white;
        border: none;
        padding: 0.375rem 0.75rem;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.375rem;
        transition: all 0.2s;
    }

    .order-dropdown-toggle:hover {
        background: var(--primary-dark);
    }

    .order-dropdown-toggle svg {
        width: 14px;
        height: 14px;
        transition: transform 0.2s;
    }

    .order-dropdown-toggle.active svg {
        transform: rotate(180deg);
    }

    .customer-orders {
        display: none;
        padding: 0;
        background: var(--surface);
    }

    .customer-orders.active {
        display: block;
    }

    .order-item {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border);
        display: grid;
        grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1.5fr 2fr;
        gap: 1rem;
        align-items: center;
        transition: background-color 0.2s;
    }

    .order-item:hover {
        background: var(--bg);
    }

    .order-item:last-child {
        border-bottom: none;
    }

    .order-item-header {
        font-weight: 600;
        color: var(--text-muted);
        font-size: 0.75rem;
        text-transform: uppercase;
        padding: 0.5rem 1.5rem;
        background: var(--bg);
        border-bottom: 1px solid var(--border);
        display: grid;
        grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1.5fr 2fr;
        gap: 1rem;
    }

    .main-order-row {
        display: grid;
        grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr 1.5fr 2fr;
        gap: 1rem;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border);
    }

    .table-actions {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        align-items: stretch;
        justify-content: center;
        width: 100%;
        text-align: center;
    }

    .table-action-item {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.375rem;
        padding: 0.25rem 0.625rem;
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text);
        text-decoration: none;
        border-radius: var(--radius-sm);
        transition: all 0.2s ease;
        cursor: pointer;
        background: transparent;
        border: 1px solid var(--border);
        width: 100%;
        text-align: center;
    }

    .table-action-item:hover {
        background: var(--bg);
        color: var(--accent);
    }

    .table-action-item.detail {
        color: var(--text-secondary);
        border-color: var(--border);
    }

    .table-action-item.detail:hover {
        color: var(--accent);
        background: var(--accent-lighter);
        border-color: var(--accent);
    }

    .table-action-item.edit {
        color: var(--accent);
        border-color: var(--accent);
    }

    .table-action-item.edit:hover {
        background: var(--accent-lighter);
        color: var(--accent);
        border-color: var(--accent);
    }

    .table-action-item.delete {
        color: var(--danger);
        border-color: var(--danger);
    }

    .table-action-item.delete:hover {
        background: #fee2e2;
        color: var(--danger);
        border-color: var(--danger);
    }

    .follow-up-icons {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
        align-items: center;
    }

    .follow-up-icon {
        width: 24px;
        height: 24px;
        padding: 4px;
        border-radius: 4px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        background: var(--bg);
        border: 1px solid var(--border);
    }

    .follow-up-icon:hover {
        background: var(--accent-lighter);
        border-color: var(--accent);
        transform: translateY(-1px);
    }

    .follow-up-icon svg {
        width: 14px;
        height: 14px;
    }

    .follow-up-icon.wa {
        color: #25D366;
    }

    .follow-up-icon.wa:hover {
        background: #25D366;
        color: white;
        border-color: #25D366;
    }

    .follow-up-icon.email {
        color: #3b82f6;
    }

    .follow-up-icon.email:hover {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
    }

    .follow-up-icon.call {
        color: var(--accent);
    }

    .follow-up-icon.call:hover {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
    }

    .follow-up-icon.followup {
        color: var(--primary);
    }

    .follow-up-icon.followup:hover {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
    }

    .loading {
        text-align: center;
        padding: 3rem 2rem;
        color: var(--text-muted);
        font-size: 0.875rem;
    }

    .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        color: var(--text-muted);
    }

    .empty-state svg {
        width: 64px;
        height: 64px;
        margin: 0 auto 1rem;
        opacity: 0.5;
    }

    .empty-state h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text);
    }

    .empty-state p {
        margin: 0 0 1.5rem 0;
        font-size: 0.875rem;
        color: var(--text-muted);
    }

    .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 0.75rem;
        margin-top: 1.5rem;
    }

    .pagination button {
        padding: 0.5rem 1rem;
        border: 1px solid var(--border);
        background: var(--surface);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.2s;
    }

    .pagination button:hover:not(:disabled) {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
    }

    .pagination button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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
        backdrop-filter: blur(4px);
        padding: 1rem;
    }

    .modal-overlay.active {
        display: flex;
    }

    .modal {
        background: var(--surface);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 560px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: var(--shadow-lg);
    }

    .modal-header {
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--text);
    }

    .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--text-muted);
        line-height: 1;
        padding: 0;
        transition: color 0.2s;
    }

    .modal-close:hover {
        color: var(--text);
    }

    .modal-body {
        padding: 1.5rem;
    }

    .modal-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--border);
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--text);
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
        width: 100%;
        padding: 0.625rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        background: var(--bg);
        color: var(--text);
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: var(--accent);
    }

    /* Searchable Select */
    .searchable-select-wrapper {
        position: relative;
        width: 100%;
    }

    .searchable-select-input {
        width: 100%;
        padding: 0.625rem 1rem;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 0.875rem;
        font-family: inherit;
        transition: all 0.2s;
        background: var(--surface);
        cursor: pointer;
    }

    .searchable-select-input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
    }

    .searchable-select-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        margin-top: 0.25rem;
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .searchable-select-list {
        padding: 0.5rem 0;
    }

    .searchable-select-item {
        padding: 0.75rem 1rem;
        cursor: pointer;
        transition: background 0.2s;
        border-bottom: 1px solid var(--border);
    }

    .searchable-select-item:last-child {
        border-bottom: none;
    }

    .searchable-select-item:hover {
        background: var(--bg);
    }

    .searchable-select-item.selected {
        background: var(--accent-lighter);
        color: var(--accent);
    }

    .searchable-select-item-name {
        font-weight: 500;
        color: var(--text);
    }

    .searchable-select-item-detail {
        font-size: 0.75rem;
        color: var(--text-muted);
        margin-top: 0.25rem;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .alert {
        padding: 0.75rem 1rem;
        border-radius: var(--radius-sm);
        margin-bottom: 1rem;
    }

    .alert-success {
        background: #d1fae5;
        color: #059669;
    }

    .alert-error {
        background: #fee2e2;
        color: #dc2626;
    }

    /* Modal Tabs */
    .modal-tabs {
        display: flex;
        border-bottom: 2px solid var(--border);
        margin-bottom: 1.5rem;
        gap: 0.5rem;
    }

    .modal-tab {
        padding: 0.75rem 1.5rem;
        background: none;
        border: none;
        border-bottom: 3px solid transparent;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-secondary);
        transition: all 0.2s;
        position: relative;
        bottom: -2px;
    }

    .modal-tab:hover {
        color: var(--text);
    }

    .modal-tab.active {
        color: var(--accent);
        border-bottom-color: var(--accent);
    }

    .tab-content {
        display: none;
    }

    .tab-content.active {
        display: block;
    }

    /* Customer Info Card */
    .customer-info-card {
        background: var(--bg);
        border-radius: var(--radius-sm);
        padding: 1rem;
        margin-bottom: 1rem;
    }

    .customer-info-card h4 {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--text);
    }

    .customer-info-card p {
        margin: 0.25rem 0;
        font-size: 0.875rem;
        color: var(--text-secondary);
    }

    /* Follow Up List */
    .followup-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .followup-item {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 1rem;
        transition: all 0.2s;
    }

    .followup-item:hover {
        box-shadow: var(--shadow-sm);
    }

    .followup-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 0.25rem;
    }

    .followup-date {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text);
    }

    .followup-channel {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        background: var(--bg);
        border-radius: 4px;
        color: var(--text-secondary);
    }

    .followup-note {
        font-size: 1.2rem;
        color: var(--text-secondary);
        line-height: 1.5;
    }

    .empty-timeline {
        text-align: center;
        padding: 2rem;
        color: var(--text-muted);
    }

    /* Activity Timeline Vertical */
    .activity-timeline {
        position: relative;
        padding-left: 3rem;
    }

    .activity-timeline::before {
        content: '';
        position: absolute;
        left: 15px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #e5e7eb;
        z-index: 1;
    }

    .activity-item {
        position: relative;
        margin-bottom: 2.5rem;
        padding-left: 1.5rem;
    }

    .activity-item:last-child {
        margin-bottom: 0;
    }

    .activity-dot {
        position: absolute;
        left: -5px;
        top: 4px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--text);
        z-index: 2;
        transform: translateX(-50%);
    }

    .activity-content {
        flex: 1;
    }

    .activity-header {
        font-size: 0.875rem;
        color: var(--text);
        margin-bottom: 0.5rem;
        line-height: 1.5;
    }

    .activity-header .activity-date {
        font-size: 0.75rem;
        color: var(--text-muted);
    }

    .activity-header .activity-type-badge {
        font-size: 0.6875rem;
        font-weight: 500;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.3px;
        margin-left: 0.5rem;
    }

    .activity-note {
        font-size: 0.875rem;
        color: var(--text-secondary);
        line-height: 1.6;
        margin: 0;
    }

    .activity-user {
        font-size: 0.75rem;
        color: var(--text-muted);
        margin-top: 0.5rem;
    }
</style>
@endpush

@section('content')
<div class="page-header">
    <div>
        <h1>Order</h1>
        <p>Kelola dan pantau semua order Anda</p>
    </div>
    <div style="display: flex; gap: 0.75rem;">
        <button class="btn btn-primary" onclick="openCreateFollowUpModal()" style="background: white; color: var(--primary);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Follow Up
        </button>
    </div>
</div>

<!-- Statistics Cards -->
<div class="stats-row" id="statsRow">
    <div class="stat-box">
        <div class="icon" style="background: #ede9fe;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
        </div>
        <span class="value" id="stat-total">0</span>
        <span class="label">Total Order</span>
    </div>
    <div class="stat-box">
        <div class="icon" style="background: #dbeafe;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
            </svg>
        </div>
        <span class="value" id="stat-new">0</span>
        <span class="label">Pending</span>
    </div>
    <div class="stat-box">
        <div class="icon" style="background: #fef3c7;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
        </div>
        <span class="value" id="stat-contacted">0</span>
        <span class="label">Sukses</span>
    </div>
    <div class="stat-box">
        <div class="icon" style="background: #d1fae5;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
        </div>
        <span class="value" id="stat-converted">0</span>
        <span class="label">Complete</span>
    </div>
</div>

<!-- Alert Container -->
<div id="alertContainer"></div>

<!-- Action Bar -->
<div class="action-bar">
    <div class="search-filter-group">
        <div class="search-input">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" id="searchInput" placeholder="Cari nama customer atau produk..." />
        </div>
            <select class="filter-select" id="statusFilter" onchange="loadOrders()">
                <option value="">Semua Status Order</option>
                <option value="1">Pending</option>
                <option value="2">Sukses</option>
                <option value="3">Failed</option>
                <option value="4">Complete</option>
            </select>
            <select class="filter-select" id="statusPembayaranFilter" onchange="loadOrders()">
                <option value="">Semua Status Pembayaran</option>
                <option value="0">Belum Pembayaran</option>
                <option value="1">Menunggu Approve Finance</option>
                <option value="2">Finance Approved</option>
                <option value="3">Reject Finance</option>
                <option value="4">Pembayaran Bertahap</option>
            </select>
    </div>
    <div class="btn-group">
            <button class="btn btn-primary" style="background: white; color: var(--primary);box-shadow: 1px 1px 1px 1px var(--primary);border: 1px solid var(--primary);" onclick="openBroadcastModal()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 2L11 13"/>
                    <path d="M22 2l-7 20-4-9-9-4z"/>
                </svg>
                Broadcast
            </button>
        <button class="btn btn-secondary" onclick="loadOrders()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
        </button>
    </div>
</div>

<!-- Orders Table -->
<div class="card-table">
    <div class="card-table-header">
        <h3 style="margin:0; border:none; padding:0;">Daftar Order</h3>
    </div>
    <div class="table-responsive">
        <table>
            <thead>
                <tr>
                    <th>Nama Customer</th>
                    <th>Produk</th>
                    <th>Total Harga</th>
                    <th>Status Order</th>
                    <th>Status Pembayaran</th>
                    <th>Tanggal Order</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody id="ordersTableBody">
                <tr>
                    <td colspan="7" class="loading">Memuat data...</td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

<!-- Pagination -->
<div class="pagination" id="pagination"></div>

<!-- Create Lead Modal -->
<div class="modal-overlay" id="createModal">
    <div class="modal">
        <div class="modal-header">
            <h3>Tambah Lead Baru</h3>
            <button class="modal-close" onclick="closeCreateModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Customer *</label>
                <div class="searchable-select-wrapper">
                    <input 
                        type="text" 
                        id="createCustomerSearch" 
                        class="searchable-select-input" 
                        placeholder="Cari customer..." 
                        autocomplete="off"
                    />
                    <div class="searchable-select-dropdown" id="createCustomerDropdown" style="display: none;">
                        <div class="searchable-select-list" id="createCustomerList"></div>
                    </div>
                    <input type="hidden" id="createCustomerId" required />
                </div>
            </div>
            <div class="form-group">
                <label>Label Lead *</label>
                <input type="text" id="createLeadLabel" placeholder="Contoh: Promo Akhir Tahun 2024" required />
            </div>
            <div class="form-group">
                <label>Minat Produk</label>
                <input type="text" id="createMinatProduk" placeholder="Produk yang diminati customer" />
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Last Contact</label>
                    <input type="datetime-local" id="createLastContact" />
                </div>
                <div class="form-group">
                    <label>Next Follow Up</label>
                    <input type="datetime-local" id="createNextFollowUp" />
                </div>
            </div>
            <div class="form-group">
                <label>Alasan Tertarik</label>
                <textarea id="createAlasanTertarik" rows="2" placeholder="Alasan customer tertarik..."></textarea>
            </div>
            <div class="form-group">
                <label>Alasan Belum Membeli</label>
                <textarea id="createAlasanBelum" rows="2" placeholder="Alasan customer belum membeli..."></textarea>
            </div>
            <div class="form-group">
                <label>Harapan Customer</label>
                <textarea id="createHarapan" rows="2" placeholder="Harapan dari customer..."></textarea>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeCreateModal()">Batal</button>
            <button class="btn btn-primary" onclick="createLead()" id="btnCreate">Tambah Lead</button>
        </div>
    </div>
</div>

<!-- Create Follow Up Modal -->
<div class="modal-overlay" id="createFollowUpModal">
    <div class="modal">
        <div class="modal-header">
            <h3>Tambah Follow Up</h3>
            <button class="modal-close" onclick="closeCreateFollowUpModal()">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>Order *</label>
                <select id="createFollowUpOrderId" required>
                    <option value="">Pilih Order</option>
                </select>
            </div>
            <div class="form-group">
                <label>Tanggal & Waktu Follow Up *</label>
                <input type="datetime-local" id="createFollowUpDate" required />
            </div>
            <div class="form-group">
                <label>Channel</label>
                <select id="createFollowUpChannel">
                    <option value="">Pilih Channel</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="call">Telepon</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="other">Lainnya</option>
                </select>
            </div>
            <div class="form-group">
                <label>Type Aktivitas *</label>
                <select id="createFollowUpType" required>
                    <option value="">Pilih Type</option>
                    <option value="whatsapp_out">WhatsApp Out</option>
                    <option value="call_out">Call Out</option>
                    <option value="send_price">Send Price</option>
                    <option value="payment_reminder">Payment Reminder</option>
                    <option value="order_update">Order Update</option>
                    <option value="closed">Closed</option>
                </select>
            </div>
            <div class="form-group">
                <label>Catatan</label>
                <textarea id="createFollowUpNote" rows="3" placeholder="Catatan follow up..."></textarea>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="closeCreateFollowUpModal()">Batal</button>
            <button class="btn btn-primary" onclick="createFollowUp()" id="btnCreateFollowUp">Tambah Follow Up</button>
        </div>
    </div>
</div>

    <!-- Broadcast Order Modal -->
    <div class="modal-overlay" id="broadcastModal">
        <div class="modal" style="max-width: 600px;">
            <div class="modal-header">
                <h3>Broadcast Order</h3>
                <button class="modal-close" onclick="closeBroadcastModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Pesan WhatsApp *</label>
                    <textarea id="broadcastMessage" rows="5" placeholder="Masukkan pesan yang akan dikirim..." required></textarea>
                </div>
                <div class="form-group">
                    <label>Filter Status Order</label>
                    <select id="broadcastStatusFilter">
                        <option value="">Semua Status Order</option>
                        <option value="1">Pending</option>
                        <option value="2">Sukses</option>
                        <option value="3">Failed</option>
                        <option value="4">Complete</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Filter Status Pembayaran</label>
                    <select id="broadcastStatusPembayaranFilter">
                        <option value="">Semua Status Pembayaran</option>
                        <option value="0">Belum Pembayaran</option>
                        <option value="1">Menunggu Approve Finance</option>
                        <option value="2">Finance Approved</option>
                        <option value="3">Reject Finance</option>
                        <option value="4">Pembayaran Bertahap</option>
                    </select>
                </div>
                <div class="info-box" style="margin-top: 1rem;">
                    <strong>Info:</strong> Broadcast akan mengirim pesan ke semua order yang sesuai dengan filter.
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeBroadcastModal()">Batal</button>
                <button class="btn btn-primary" onclick="sendBroadcast()" id="btnBroadcast">Kirim Broadcast</button>
            </div>
        </div>
    </div>

    <!-- Detail Order Modal -->
    <div class="modal-overlay" id="detailModal">
        <div class="modal" style="max-width: 900px;">
            <div class="modal-header">
                <h3>Detail Order</h3>
                <button class="modal-close" onclick="closeDetailModal()">&times;</button>
            </div>
            <div class="modal-body" id="detailContent">
                <div class="loading">Memuat...</div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeDetailModal()">Tutup</button>
            </div>
        </div>
    </div>

    <!-- Konfirmasi Pembayaran Modal -->
    <div class="modal-overlay" id="konfirmasiPembayaranModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Konfirmasi Pembayaran</h3>
                <button class="modal-close" onclick="closeKonfirmasiPembayaranModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="konfirmasiPembayaranForm" enctype="multipart/form-data">
                    <input type="hidden" id="konfirmasiOrderId" name="order_id">
                    <div class="form-group">
                        <label>Jumlah Pembayaran *</label>
                        <input type="text" id="konfirmasiAmount" name="amount" class="form-control" placeholder="Masukkan jumlah pembayaran" required>
                    </div>
                    <div class="form-group">
                        <label>Waktu Pembayaran *</label>
                        <input type="datetime-local" id="konfirmasiWaktuPembayaran" name="waktu_pembayaran" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Metode Pembayaran *</label>
                        <select id="konfirmasiMetodePembayaran" name="metode_pembayaran" class="form-control" required>
                            <option value="">Pilih Metode Pembayaran</option>
                            <option value="Transfer Bank">Transfer Bank</option>
                            <option value="E-Wallet">E-Wallet</option>
                            <option value="Tunai">Tunai</option>
                            <option value="Kredit">Kredit</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Bukti Pembayaran *</label>
                        <input type="file" id="konfirmasiBuktiPembayaran" name="bukti_pembayaran" class="form-control" accept="image/jpeg,image/jpg,image/png" required>
                        <small style="color: var(--text-muted);">Format: JPG, JPEG, PNG (Max: 2MB)</small>
                    </div>
                    <div id="previewBukti" style="margin-top: 1rem; display: none;">
                        <img id="previewBuktiImg" src="" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: var(--radius);">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeKonfirmasiPembayaranModal()">Batal</button>
                <button class="btn btn-primary" onclick="submitKonfirmasiPembayaran()" id="btnSubmitKonfirmasi">Konfirmasi Pembayaran</button>
            </div>
        </div>
    </div>

    <!-- Edit Lead Modal -->
    <div class="modal-overlay" id="editModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Edit Lead</h3>
                <button class="modal-close" onclick="closeEditModal()">&times;</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="editLeadId" />
                <div class="form-group">
                    <label>Label Lead</label>
                    <input type="text" id="editLeadLabel" />
                </div>
                <div class="form-group">
                    <label>Minat Produk</label>
                    <input type="text" id="editMinatProduk" placeholder="Produk yang diminati customer" />
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Last Contact</label>
                        <input type="datetime-local" id="editLastContact" />
                    </div>
                    <div class="form-group">
                        <label>Next Follow Up</label>
                        <input type="datetime-local" id="editNextFollowUp" />
                    </div>
                </div>
                <div class="form-group">
                    <label>Alasan Tertarik</label>
                    <textarea id="editAlasanTertarik" rows="2" placeholder="Alasan customer tertarik..."></textarea>
                </div>
                <div class="form-group">
                    <label>Alasan Belum Membeli</label>
                    <textarea id="editAlasanBelum" rows="2" placeholder="Alasan customer belum membeli..."></textarea>
                </div>
                <div class="form-group">
                    <label>Harapan Customer</label>
                    <textarea id="editHarapan" rows="2" placeholder="Harapan dari customer..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeEditModal()">Batal</button>
                <button class="btn btn-primary" onclick="updateLead()" id="btnUpdateLead">Simpan Perubahan</button>
            </div>
        </div>
    </div>

    <!-- Follow Up Lead Modal -->
    <div class="modal-overlay" id="followUpModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Tambah Follow Up</h3>
                <button class="modal-close" onclick="closeFollowUpModal()">&times;</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="followUpLeadId" />
                <div class="form-group">
                    <label>Tanggal & Waktu Follow Up *</label>
                    <input type="datetime-local" id="followUpDate" required />
                </div>
                <div class="form-group">
                    <label>Channel</label>
                    <select id="followUpChannel">
                        <option value="">Pilih Channel</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="call">Telepon</option>
                        <option value="email">Email</option>
                        <option value="meeting">Meeting</option>
                        <option value="other">Lainnya</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Type Aktivitas *</label>
                    <select id="followUpType" required>
                        <option value="">Pilih Type</option>
                        <option value="whatsapp_out">WhatsApp Out</option>
                        <option value="call_out">Call Out</option>
                        <option value="send_price">Send Price</option>
                        <option value="interested">Interested</option>
                        <option value="thinking">Thinking</option>
                        <option value="closed_won">Closed Won</option>
                        <option value="closed_lost">Closed Lost</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Catatan</label>
                    <textarea id="followUpNote" rows="4" placeholder="Catatan follow up..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeFollowUpModal()">Batal</button>
                <button class="btn btn-primary" onclick="saveFollowUp()" id="btnSaveFollowUp">Simpan Follow Up</button>
            </div>
        </div>
    </div>

    <!-- WhatsApp Modal -->
    <div class="modal-overlay" id="whatsAppModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Kirim WhatsApp</h3>
                <button class="modal-close" onclick="closeWhatsAppModal()">&times;</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="waLeadId" />
                <div class="customer-info-card">
                    <h4 id="waCustomerName">-</h4>
                    <p><strong>WhatsApp:</strong> <span id="waCustomerPhone">-</span></p>
                    <p><strong>Email:</strong> <span id="waCustomerEmail">-</span></p>
                    <p><strong>Pendapatan:</strong> <span id="waCustomerPendapatan">-</span></p>
                </div>
                <div class="form-group">
                    <label>Pesan WhatsApp *</label>
                    <textarea id="waMessage" rows="6" placeholder="Tulis pesan yang akan dikirim ke customer..." required></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeWhatsAppModal()">Batal</button>
                <button class="btn btn-primary" onclick="sendWhatsAppMessage()" id="btnSendWhatsApp">Kirim WhatsApp</button>
            </div>
        </div>
    </div>
@endsection

@push('scripts')
<script>
    const API_BASE = '/api/sales';
    let authToken = localStorage.getItem('auth_token');
    let currentPage = 1;
    let currentOrderId = null;

    // Initialize
    // Searchable customer dropdown handlers
    document.addEventListener('DOMContentLoaded', function() {
        const searchInput = document.getElementById('createCustomerSearch');
        const dropdown = document.getElementById('createCustomerDropdown');
        
        if (searchInput) {
            searchInput.addEventListener('focus', function() {
                if (customerList.length > 0) {
                    dropdown.style.display = 'block';
                    renderCustomerDropdown(customerList, this.value);
                }
            });

            searchInput.addEventListener('input', function() {
                if (customerList.length > 0) {
                    dropdown.style.display = 'block';
                    renderCustomerDropdown(customerList, this.value);
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (searchInput && dropdown && !searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.style.display = 'none';
                }
            });
        }
    });

    // Load Lead Labels
    async function loadLeadLabels() {
        try {
            const response = await fetch(`${API_BASE}/lead/labels-list`, { headers: getHeaders() });
            const result = await response.json();
            if (result.success && result.data) {
                const select = document.getElementById('labelFilter');
                if (select) {
                    result.data.forEach(label => {
                        const option = document.createElement('option');
                        option.value = label;
                        option.textContent = label;
                        select.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading lead labels:', error);
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        loadStatistics();
        loadLeadLabels();
        loadOrders();

        // Enter key untuk search
        document.getElementById('searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') loadOrders();
        });
    });

    // API Headers
    function getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + authToken
        };
    }

    // Show Alert
    function showAlert(message, type = 'success') {
        const container = document.getElementById('alertContainer');
        container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        setTimeout(() => container.innerHTML = '', 5000);
    }

    // Load Statistics
    async function loadStatistics() {
        try {
            // Hitung statistik dari data order
            const response = await fetch(`${API_BASE}/order/sales?per_page=1000`, { headers: getHeaders() });
            const result = await response.json();
            if (result.success && result.data) {
                const orders = result.data;
                const total = orders.length;
                const baru = orders.filter(o => o.status_order === '1').length;
                const diproses = orders.filter(o => o.status_order === '2').length;
                const selesai = orders.filter(o => o.status_order === '3').length;
                
                document.getElementById('stat-total').textContent = total || 0;
                document.getElementById('stat-new').textContent = baru || 0;
                document.getElementById('stat-contacted').textContent = diproses || 0;
                document.getElementById('stat-converted').textContent = selesai || 0;
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    // Load Orders
    async function loadOrders(page = 1) {
        currentPage = page;
        const search = document.getElementById('searchInput').value;
        const status = document.getElementById('statusFilter').value;
        const statusPembayaran = document.getElementById('statusPembayaranFilter') ? document.getElementById('statusPembayaranFilter').value : '';

        // Ambil semua data tanpa pagination untuk grouping
        let url = `${API_BASE}/order/sales?per_page=1000`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (status) url += `&status=${status}`;
        if (statusPembayaran !== '') url += `&status_pembayaran=${statusPembayaran}`;

        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = '<tr><td colspan="7" class="loading">Memuat data...</td></tr>';

        try {
            const response = await fetch(url, { headers: getHeaders() });
            const result = await response.json();

            if (result.success && result.data.length > 0) {
                // Group orders by customer
                const groupedOrders = {};
                result.data.forEach(order => {
                    const customerId = order.customer_rel?.id;
                    if (!customerId) return;
                    
                    if (!groupedOrders[customerId]) {
                        groupedOrders[customerId] = {
                            customer: order.customer_rel,
                            orders: []
                        };
                    }
                    groupedOrders[customerId].orders.push(order);
                });

                // Sort orders by create_at (newest first) for each customer
                Object.keys(groupedOrders).forEach(customerId => {
                    groupedOrders[customerId].orders.sort((a, b) => {
                        const dateA = new Date(a.create_at || 0);
                        const dateB = new Date(b.create_at || 0);
                        return dateB - dateA; // Newest first
                    });
                });

                // Convert to array and sort by newest order date
                const customerGroups = Object.values(groupedOrders).sort((a, b) => {
                    const dateA = new Date(a.orders[0]?.create_at || 0);
                    const dateB = new Date(b.orders[0]?.create_at || 0);
                    return dateB - dateA; // Newest first
                });

                // Apply pagination to customer groups
                const perPage = 15;
                const startIndex = (page - 1) * perPage;
                const endIndex = startIndex + perPage;
                const paginatedGroups = customerGroups.slice(startIndex, endIndex);

                tbody.innerHTML = paginatedGroups.map((group, groupIndex) => {
                    const customer = group.customer;
                    const orders = group.orders;
                    const latestOrder = orders[0]; // Order terbaru
                    const otherOrders = orders.slice(1); // Order lainnya
                    
                    const email = customer?.email || '';
                    const wa = customer?.wa || '';
                    const contactInfo = email && wa ? `${email} / ${wa}` : (email || wa || '-');
                    
                    // Escape function untuk menghindari masalah dengan karakter khusus
                    const escapeJs = (str) => {
                        if (!str) return '';
                        return String(str)
                            .replace(/\\/g, '\\\\')
                            .replace(/'/g, "\\'")
                            .replace(/"/g, '\\"')
                            .replace(/\n/g, '\\n')
                            .replace(/\r/g, '\\r');
                    };
                    
                    const customerName = escapeJs(customer?.nama || '');
                    const customerWa = escapeJs(customer?.wa || '');
                    const customerEmail = escapeJs(customer?.email || '');
                    
                    // Status order mapping
                    const statusOrderMap = {
                        '1': { text: 'Pending', class: 'new' },
                        '2': { text: 'Sukses', class: 'converted' },
                        '3': { text: 'Failed', class: 'lost' },
                        '4': { text: 'Complete', class: 'converted' },
                        'N': { text: 'Dihapus', class: 'lost' }
                    };
                    
                    // Status pembayaran mapping
                    const statusPembayaranMap = {
                        '0': { text: 'Belum Pembayaran', class: 'new' },
                        'null': { text: 'Belum Pembayaran', class: 'new' },
                        '1': { text: 'Menunggu Approve Finance', class: 'contacted' },
                        '2': { text: 'Finance Approved', class: 'converted' },
                        '3': { text: 'Reject Finance', class: 'lost' },
                        '4': { text: 'Pembayaran Bertahap', class: 'contacted' }
                    };

                    const renderOrderRow = (order) => {
                        const statusOrder = statusOrderMap[order.status_order] || { text: order.status_order || '-', class: '' };
                        // Handle null status pembayaran
                        const paymentStatus = order.status_pembayaran === null || order.status_pembayaran === undefined || order.status_pembayaran === '' ? 'null' : String(order.status_pembayaran);
                        const statusPembayaran = statusPembayaranMap[paymentStatus] || { text: order.status_pembayaran || '-', class: '' };
                        
                        return `
                        <div class="order-item">
                            <div>${order.produk_rel?.nama || '-'}</div>
                            <div>Rp ${formatCurrency(order.total_harga || 0)}</div>
                            <div><span class="lead-status ${statusOrder.class}">${statusOrder.text}</span></div>
                            <div><span class="lead-status ${statusPembayaran.class}">${statusPembayaran.text}</span></div>
                            <div>${order.create_at ? formatDate(order.create_at) : '-'}</div>
                            <div class="table-actions">
                                <span class="table-action-item detail" onclick="viewOrder(${order.id})">Detail</span>
                                <span class="table-action-item followup" onclick="openFollowUpModal(${order.id})">Follow Up</span>
                            </div>
                        </div>
                        `;
                    };

                    const latestStatusOrder = statusOrderMap[latestOrder.status_order] || { text: latestOrder.status_order || '-', class: '' };
                    // Handle null status pembayaran
                    const latestPaymentStatus = latestOrder.status_pembayaran === null || latestOrder.status_pembayaran === undefined || latestOrder.status_pembayaran === '' ? 'null' : String(latestOrder.status_pembayaran);
                    const latestStatusPembayaran = statusPembayaranMap[latestPaymentStatus] || { text: latestOrder.status_pembayaran || '-', class: '' };
                    
                    return `
                    <tr>
                        <td colspan="7" style="padding: 0;">
                            <div class="customer-group">
                                <div class="customer-header" onclick="toggleOrderDropdown('customer-${customer.id}')">
                                    <div class="customer-info">
                                        <div>
                                            <div class="customer-name">${customer?.nama || '-'}</div>
                                            <div class="customer-contact">${contactInfo}</div>
                                        </div>
                                    </div>
                                    <div class="customer-actions">
                                        ${(email || wa) ? `
                                        <div class="follow-up-icons" style="display: flex; gap: 0.25rem;">
                                            ${wa ? `
                                            <button onclick="event.stopPropagation(); openWhatsAppModal(${latestOrder.id}, '${customerName}', '${customerWa}', '${customerEmail}')" class="follow-up-icon wa" title="Kirim WhatsApp">
                                                <svg viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                                </svg>
                                            </button>
                                            ` : ''}
                                            ${email ? `
                                            <a href="mailto:${email}" class="follow-up-icon email" title="Kirim Email" onclick="event.stopPropagation();">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                                    <polyline points="22,6 12,13 2,6"/>
                                                </svg>
                                            </a>
                                            ` : ''}
                                            ${wa ? `
                                            <button class="follow-up-icon call" onclick="event.stopPropagation(); copyPhoneNumber('${wa}')" title="Copy Nomor WA">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                                </svg>
                                            </button>
                                            ` : ''}
                                            <button class="follow-up-icon followup" onclick="event.stopPropagation(); openFollowUpModal(${latestOrder.id})" title="Input Follow Up">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                    <path d="M12 5v14M5 12h14"/>
                                                </svg>
                                            </button>
                                        </div>
                                        ` : ''}
                                        ${otherOrders.length > 0 ? `
                                        <button class="order-dropdown-toggle" onclick="event.stopPropagation(); toggleOrderDropdown('customer-${customer.id}')" id="toggle-customer-${customer.id}">
                                            ${otherOrders.length} Order Lain
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="6 9 12 15 18 9"/>
                                            </svg>
                                        </button>
                                        ` : ''}
                                    </div>
                                </div>
                                <div class="main-order-row">
                                    <div>
                                        <strong style="cursor: pointer; text-decoration: underline;" onclick="viewOrder(${latestOrder.id})">${latestOrder.produk_rel?.nama || '-'}</strong>
                                    </div>
                                    <div>Rp ${formatCurrency(latestOrder.total_harga || 0)}</div>
                                    <div><span class="lead-status ${latestStatusOrder.class}">${latestStatusOrder.text}</span></div>
                                    <div><span class="lead-status ${latestStatusPembayaran.class}">${latestStatusPembayaran.text}</span></div>
                                    <div>${latestOrder.create_at ? formatDate(latestOrder.create_at) : '-'}</div>
                                    <div class="table-actions">
                                        <span class="table-action-item detail" onclick="viewOrder(${latestOrder.id})">Detail</span>
                                        <span class="table-action-item followup" onclick="openFollowUpModal(${latestOrder.id})">Follow Up</span>
                                    </div>
                                </div>
                                ${otherOrders.length > 0 ? `
                                <div class="customer-orders" id="customer-${customer.id}">
                                    <div class="order-item-header">
                                        <div>Produk</div>
                                        <div>Total Harga</div>
                                        <div>Status Order</div>
                                        <div>Status Pembayaran</div>
                                        <div>Tanggal Order</div>
                                        <div>Aksi</div>
                                    </div>
                                    ${otherOrders.map(order => renderOrderRow(order)).join('')}
                                </div>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                    `;
                }).join('');

                // Update pagination based on customer groups
                const totalCustomers = customerGroups.length;
                const totalPages = Math.ceil(totalCustomers / perPage);
                
                renderPagination({
                    current_page: page,
                    last_page: totalPages,
                    per_page: perPage,
                    total: totalCustomers
                });
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7">
                            <div class="empty-state">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <line x1="17" y1="11" x2="23" y2="11"/>
                                </svg>
                                <h3>Belum Ada Order</h3>
                                <p>Belum ada order yang ditugaskan kepada Anda.</p>
                            </div>
                        </td>
                    </tr>
                `;
                document.getElementById('pagination').innerHTML = '';
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Gagal memuat data</td></tr>';
        }
    }

    // Toggle Order Dropdown
    function toggleOrderDropdown(customerId) {
        const dropdown = document.getElementById(customerId);
        const toggle = document.getElementById(`toggle-${customerId}`);
        
        if (dropdown) {
            dropdown.classList.toggle('active');
            if (toggle) {
                toggle.classList.toggle('active');
            }
        }
    }

    // Format Date
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // Format Currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID').format(amount);
    }

    // Render Pagination
    function renderPagination(pagination) {
        if (!pagination) return;
        const container = document.getElementById('pagination');
        container.innerHTML = `
            <button onclick="loadOrders(${pagination.current_page - 1})" ${pagination.current_page === 1 ? 'disabled' : ''}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
                Prev
            </button>
            <span>Halaman ${pagination.current_page} dari ${pagination.last_page} (${pagination.total} data)</span>
            <button onclick="loadOrders(${pagination.current_page + 1})" ${pagination.current_page === pagination.last_page ? 'disabled' : ''}>
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                </svg>
            </button>
        `;
    }

    // Copy Phone Number
    function copyPhoneNumber(phone) {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        navigator.clipboard.writeText(cleanPhone).then(() => {
            showAlert('Nomor WA berhasil disalin', 'success');
        });
    }

    // View Order Detail
    async function viewOrder(id) {
        currentOrderId = id;
        document.getElementById('detailModal').classList.add('active');
        document.getElementById('detailContent').innerHTML = '<div class="loading">Memuat...</div>';

        try {
            const response = await fetch(`${API_BASE}/order/${id}`, { headers: getHeaders() });
            const result = await response.json();

            if (result.success) {
                const order = result.data;
                
                const statusOrderMap = {
                    '1': { text: 'Pending', class: 'new' },
                    '2': { text: 'Sukses', class: 'converted' },
                    '3': { text: 'Failed', class: 'lost' },
                    '4': { text: 'Complete', class: 'converted' },
                    'N': { text: 'Dihapus', class: 'lost' }
                };
                const statusOrder = statusOrderMap[order.status_order] || { text: order.status_order || '-', class: '' };
                
                const statusPembayaranMap = {
                    '0': { text: 'Belum Pembayaran', class: 'new' },
                    'null': { text: 'Belum Pembayaran', class: 'new' },
                    '1': { text: 'Menunggu Approve Finance', class: 'contacted' },
                    '2': { text: 'Finance Approved', class: 'converted' },
                    '3': { text: 'Reject Finance', class: 'lost' },
                    '4': { text: 'Pembayaran Bertahap', class: 'contacted' }
                };
                // Handle null status pembayaran
                const paymentStatus = order.status_pembayaran === null || order.status_pembayaran === undefined || order.status_pembayaran === '' ? 'null' : String(order.status_pembayaran);
                const statusPembayaran = statusPembayaranMap[paymentStatus] || { text: order.status_pembayaran || '-', class: '' };
                
                // Hitung total yang sudah dibayar
                const totalPaid = order.total_paid || 0;
                const remaining = Math.max(0, (parseFloat(order.total_harga) || 0) - (parseFloat(totalPaid) || 0));
                
                document.getElementById('detailContent').innerHTML = `
                    <div class="modal-tabs">
                        <button class="modal-tab active" onclick="switchTab('detail', ${id})">Detail</button>
                        <button class="modal-tab" onclick="switchTab('pembayaran', ${id})">Pembayaran</button>
                        <button class="modal-tab" onclick="switchTab('followup', ${id})">Follow Up</button>
                    </div>
                    
                    <div id="tabDetail" class="tab-content active">
                        <div class="customer-info-card">
                            <h4>${order.customer_rel?.nama || '-'}</h4>
                            <p><strong>Email:</strong> ${order.customer_rel?.email || '-'}</p>
                            <p><strong>WhatsApp:</strong> ${order.customer_rel?.wa || '-'}</p>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Produk</label>
                                <p style="margin:0;font-weight:600;">${order.produk_rel?.nama || '-'}</p>
                            </div>
                            <div class="form-group">
                                <label>Total Harga</label>
                                <p style="margin:0;font-weight:600;">Rp ${formatCurrency(order.total_harga || 0)}</p>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Status Order</label>
                                <p style="margin:0;"><span class="lead-status ${statusOrder.class}">${statusOrder.text}</span></p>
                            </div>
                            <div class="form-group">
                                <label>Status Pembayaran</label>
                                <p style="margin:0;"><span class="lead-status ${statusPembayaran.class}">${statusPembayaran.text}</span></p>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Tanggal Order</label>
                                <p style="margin:0;">${order.create_at ? formatDate(order.create_at) : '-'}</p>
                            </div>
                            <div class="form-group">
                                <label>Alamat</label>
                                <p style="margin:0;">${order.alamat || '-'}</p>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Total Dibayar</label>
                                <p style="margin:0;font-weight:600;color: var(--success);">Rp ${formatCurrency(totalPaid)}</p>
                            </div>
                            <div class="form-group">
                                <label>Sisa Pembayaran</label>
                                <p style="margin:0;font-weight:600;color: ${remaining > 0 ? 'var(--danger)' : 'var(--success)'};">Rp ${formatCurrency(remaining)}</p>
                            </div>
                        </div>
                        ${(order.status_pembayaran === '0' || order.status_pembayaran === null || order.status_pembayaran === undefined || order.status_pembayaran === '') || remaining > 0 ? `
                        <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
                            <button class="btn btn-primary" onclick="openKonfirmasiPembayaranModal(${id})" style="width: 100%;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 0.5rem;">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Konfirmasi Pembayaran
                            </button>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div id="tabPembayaran" class="tab-content">
                        <div class="loading">Memuat data pembayaran...</div>
                    </div>
                    
                    <div id="tabFollowup" class="tab-content">
                        <div class="loading">Memuat follow up...</div>
                    </div>
                `;
                
                // Load data pembayaran
                loadOrderPayments(id);
                
                // Load follow up
                loadFollowUps(id);
            }
        } catch (error) {
            console.error('Error viewing order:', error);
            document.getElementById('detailContent').innerHTML = '<p style="color:var(--danger);">Gagal memuat data</p>';
        }
    }

    // Switch Tab
    function switchTab(tabName, orderId) {
        // Update tab buttons
        document.querySelectorAll('.modal-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const tabContent = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
        if (tabContent) {
            tabContent.classList.add('active');
            
            // Reload data if needed
            if (tabName === 'followup' && tabContent.innerHTML.includes('Memuat')) {
                loadFollowUps(orderId);
            }
            if (tabName === 'pembayaran' && tabContent.innerHTML.includes('Memuat')) {
                loadOrderPayments(orderId);
            }
        }
    }

    // Load Follow Ups
    async function loadFollowUps(orderId) {
        const tabContent = document.getElementById('tabFollowup');
        if (!tabContent) return;
        
        try {
            const response = await fetch(`${API_BASE}/order/${orderId}/followup`, { headers: getHeaders() });
            const result = await response.json();

            if (result.success && result.data.length > 0) {
                tabContent.innerHTML = `
                    <div class="followup-list">
                        ${result.data.map(followup => `
                            <div class="followup-item">
                                <div class="followup-header">
                                    <div class="followup-date">${formatDateTime(followup.follow_up_date)}</div>
                                    ${followup.channel ? `<span class="followup-channel">${followup.channel}</span>` : ''}
                                </div>
                                ${followup.note ? `<div class="followup-note">${followup.note}</div>` : ''}
                                ${followup.created_by_rel ? `<div> <span style="color: var(--text-muted);font-size: 0.9rem;">Oleh: ${followup.created_by_rel.nama}</span></div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                tabContent.innerHTML = '<div class="empty-timeline">Belum ada follow up</div>';
            }
        } catch (error) {
            console.error('Error loading follow ups:', error);
            tabContent.innerHTML = '<p style="color:var(--danger);">Gagal memuat follow up</p>';
        }
    }

    // Load Aktivitas
    async function loadAktivitas(leadId) {
        const tabContent = document.getElementById('tabAktivitas');
        if (!tabContent) return;
        
        tabContent.innerHTML = '<div class="loading">Memuat aktivitas...</div>';
        
        try {
            const response = await fetch(`${API_BASE}/aktivitas/lead/${leadId}`, { headers: getHeaders() });
            const result = await response.json();

            if (result.success && result.data && result.data.length > 0) {
                // Sort by date descending (newest first)
                const aktivitas = result.data.sort((a, b) => {
                    const dateA = new Date(a.create_at);
                    const dateB = new Date(b.create_at);
                    return dateB - dateA;
                });
                
                const typeLabels = {
                    'whatsapp_out': 'WhatsApp Out',
                    'call_out': 'Call Out',
                    'send_price': 'Send Price',
                    'interested': 'Interested',
                    'thinking': 'Thinking',
                    'closed_won': 'Closed Won',
                    'closed_lost': 'Closed Lost',
                    'lead_created': 'Lead Created'
                };
                
                tabContent.innerHTML = `
                    <div class="activity-timeline">
                        ${aktivitas.map(akt => {
                            const date = new Date(akt.create_at);
                            const dateTimeStr = date.toLocaleDateString('id-ID', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                            
                            return `
                                <div class="activity-item">
                                    <div class="activity-dot"></div>
                                    <div class="activity-content">
                                        <div class="activity-header">
                                            <span class="activity-date">${dateTimeStr}</span> | <span class="activity-type-badge">${typeLabels[akt.type] || akt.type}</span>
                                        </div>
                                        ${akt.note ? `<div class="activity-note">${akt.note}</div>` : ''}
                                        ${akt.user_rel ? `<div class="activity-user">Oleh: <span style="color: var(--text-muted);">${akt.user_rel.nama}</span></div>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else {
                tabContent.innerHTML = '<div class="empty-state">Belum ada aktivitas</div>';
            }
        } catch (error) {
            console.error('Error loading aktivitas:', error);
            tabContent.innerHTML = '<p style="color:var(--danger);">Gagal memuat aktivitas</p>';
        }
    }

    // Format DateTime
    function formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function closeDetailModal() {
        document.getElementById('detailModal').classList.remove('active');
    }

    // Load Order Payments
    async function loadOrderPayments(orderId) {
        const tabContent = document.getElementById('tabPembayaran');
        if (!tabContent) return;
        
        try {
            const response = await fetch(`${API_BASE}/order-payment/by-order/${orderId}`, { headers: getHeaders() });
            const result = await response.json();

            if (result.success && result.data && result.data.payments && result.data.payments.length > 0) {
                const payments = result.data.payments;
                const summary = result.data.summary || {};
                
                tabContent.innerHTML = `
                    <div style="background: var(--bg); padding: 1rem; border-radius: var(--radius); margin-bottom: 1rem;">
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                            <div>
                                <label style="font-size: 0.75rem; color: var(--text-muted);">Total Order</label>
                                <p style="margin: 0.25rem 0 0 0; font-weight: 600;">Rp ${formatCurrency(summary.total_amount || 0)}</p>
                            </div>
                            <div>
                                <label style="font-size: 0.75rem; color: var(--text-muted);">Total Dibayar</label>
                                <p style="margin: 0.25rem 0 0 0; font-weight: 600; color: var(--success);">Rp ${formatCurrency(summary.total_paid || 0)}</p>
                            </div>
                            <div>
                                <label style="font-size: 0.75rem; color: var(--text-muted);">Sisa Pembayaran</label>
                                <p style="margin: 0.25rem 0 0 0; font-weight: 600; color: ${(summary.remaining || 0) > 0 ? 'var(--danger)' : 'var(--success)'};">Rp ${formatCurrency(summary.remaining || 0)}</p>
                            </div>
                        </div>
                    </div>
                    <div class="payment-list">
                        ${payments.map(payment => {
                            const statusMap = {
                                '1': { text: 'Menunggu Approve Finance', class: 'contacted' },
                                '2': { text: 'Finance Approved', class: 'converted' },
                                '3': { text: 'Reject Finance', class: 'lost' },
                                '4': { text: 'Pembayaran Bertahap', class: 'contacted' }
                            };
                            const status = statusMap[payment.status] || { text: payment.status || '-', class: '' };
                            const buktiUrl = payment.bukti_pembayaran ? `/storage/${payment.bukti_pembayaran}` : '';
                            
                            return `
                                <div class="payment-item" style="border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; margin-bottom: 1rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                                        <div>
                                            <strong>Pembayaran ke-${payment.payment_ke}</strong>
                                            <p style="margin: 0.25rem 0 0 0; color: var(--text-muted); font-size: 0.875rem;">
                                                ${payment.tanggal ? formatDateTime(payment.tanggal) : '-'}
                                            </p>
                                        </div>
                                        <span class="lead-status ${status.class}">${status.text}</span>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.75rem;">
                                        <div>
                                            <label style="font-size: 0.75rem; color: var(--text-muted);">Jumlah</label>
                                            <p style="margin: 0.25rem 0 0 0; font-weight: 600;">Rp ${formatCurrency(payment.amount || 0)}</p>
                                        </div>
                                        <div>
                                            <label style="font-size: 0.75rem; color: var(--text-muted);">Metode</label>
                                            <p style="margin: 0.25rem 0 0 0;">${payment.payment_method || '-'}</p>
                                        </div>
                                    </div>
                                    ${buktiUrl ? `
                                    <div>
                                        <label style="font-size: 0.75rem; color: var(--text-muted);">Bukti Pembayaran</label>
                                        <div style="margin-top: 0.5rem;">
                                            <img src="${buktiUrl}" alt="Bukti Pembayaran" style="max-width: 100%; max-height: 300px; border-radius: var(--radius); cursor: pointer;" onclick="window.open('${buktiUrl}', '_blank')">
                                        </div>
                                    </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else {
                tabContent.innerHTML = '<div class="empty-state">Belum ada data pembayaran</div>';
            }
        } catch (error) {
            console.error('Error loading payments:', error);
            tabContent.innerHTML = '<p style="color:var(--danger);">Gagal memuat data pembayaran</p>';
        }
    }

    // Open Konfirmasi Pembayaran Modal
    function openKonfirmasiPembayaranModal(orderId) {
        document.getElementById('konfirmasiOrderId').value = orderId;
        document.getElementById('konfirmasiAmount').value = '';
        
        // Set waktu pembayaran default ke sekarang
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('konfirmasiWaktuPembayaran').value = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        document.getElementById('konfirmasiMetodePembayaran').value = '';
        document.getElementById('konfirmasiBuktiPembayaran').value = '';
        document.getElementById('previewBukti').style.display = 'none';
        document.getElementById('konfirmasiPembayaranModal').classList.add('active');
        
        // Initialize preview
        setTimeout(() => {
            initPreviewBukti();
        }, 100);
    }

    // Close Konfirmasi Pembayaran Modal
    function closeKonfirmasiPembayaranModal() {
        document.getElementById('konfirmasiPembayaranModal').classList.remove('active');
    }

    // Preview Bukti Pembayaran (dipanggil setelah modal dibuka)
    function initPreviewBukti() {
        const buktiInput = document.getElementById('konfirmasiBuktiPembayaran');
        if (buktiInput) {
            // Hapus event listener sebelumnya jika ada
            const newInput = buktiInput.cloneNode(true);
            buktiInput.parentNode.replaceChild(newInput, buktiInput);
            
            newInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    // Validasi ukuran file (max 2MB)
                    if (file.size > 2 * 1024 * 1024) {
                        showAlert('Ukuran file maksimal 2MB', 'error');
                        e.target.value = '';
                        return;
                    }
                    
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        document.getElementById('previewBuktiImg').src = e.target.result;
                        document.getElementById('previewBukti').style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                } else {
                    document.getElementById('previewBukti').style.display = 'none';
                }
            });
        }
    }

    // Submit Konfirmasi Pembayaran
    async function submitKonfirmasiPembayaran() {
        const form = document.getElementById('konfirmasiPembayaranForm');
        const formData = new FormData(form);
        const orderId = document.getElementById('konfirmasiOrderId').value;
        const btn = document.getElementById('btnSubmitKonfirmasi');
        
        // Validasi
        if (!formData.get('amount') || !formData.get('waktu_pembayaran') || !formData.get('metode_pembayaran') || !formData.get('bukti_pembayaran')) {
            showAlert('Semua field wajib diisi', 'error');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Mengirim...';

        try {
            const response = await fetch(`${API_BASE}/order-konfirmasi/${orderId}`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + authToken
                },
                body: formData
            });

            const result = await response.json();

            if (result.message === 'Konfirmasi Pembayaran Sukses' || response.ok) {
                closeKonfirmasiPembayaranModal();
                closeDetailModal();
                showAlert('Konfirmasi pembayaran berhasil', 'success');
                loadOrders(currentPage);
                loadStatistics();
            } else {
                showAlert(result.message || 'Gagal konfirmasi pembayaran', 'error');
            }
        } catch (error) {
            console.error('Error submitting payment confirmation:', error);
            showAlert('Terjadi kesalahan saat mengirim konfirmasi', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Konfirmasi Pembayaran';
        }
    }

    // Edit Lead
    async function editLead(id) {
        currentLeadId = id;
        document.getElementById('editModal').classList.add('active');

        try {
            const response = await fetch(`${API_BASE}/lead/${id}`, { headers: getHeaders() });
            const result = await response.json();

            if (result.success) {
                const lead = result.data;
                document.getElementById('editLeadId').value = lead.id;
                document.getElementById('editLeadLabel').value = lead.lead_label || '';
                document.getElementById('editMinatProduk').value = lead.minat_produk || '';
                document.getElementById('editLastContact').value = lead.last_contact_at ? lead.last_contact_at.slice(0, 16) : '';
                document.getElementById('editNextFollowUp').value = lead.next_follow_up_at ? lead.next_follow_up_at.slice(0, 16) : '';
                document.getElementById('editAlasanTertarik').value = lead.alasan_tertarik || '';
                document.getElementById('editAlasanBelum').value = lead.alasan_belum || '';
                document.getElementById('editHarapan').value = lead.harapan || '';
            }
        } catch (error) {
            console.error('Error loading lead for edit:', error);
            showAlert('Gagal memuat data lead', 'error');
            closeEditModal();
        }
    }

    function closeEditModal() {
        document.getElementById('editModal').classList.remove('active');
    }

    async function updateLead() {
        const id = document.getElementById('editLeadId').value;
        const btn = document.getElementById('btnUpdateLead');
        btn.disabled = true;
        btn.textContent = 'Menyimpan...';

        try {
            const body = {
                lead_label: document.getElementById('editLeadLabel').value,
                minat_produk: document.getElementById('editMinatProduk').value || null,
                last_contact_at: document.getElementById('editLastContact').value || null,
                next_follow_up_at: document.getElementById('editNextFollowUp').value || null,
                alasan_tertarik: document.getElementById('editAlasanTertarik').value || null,
                alasan_belum: document.getElementById('editAlasanBelum').value || null,
                harapan: document.getElementById('editHarapan').value || null,
            };

            const response = await fetch(`${API_BASE}/lead/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.success) {
                closeEditModal();
                showAlert('Lead berhasil diupdate', 'success');
                loadOrders(currentPage);
                loadStatistics();
            } else {
                showAlert(result.message || 'Gagal update lead', 'error');
            }
        } catch (error) {
            console.error('Error updating lead:', error);
            showAlert('Terjadi kesalahan', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Simpan Perubahan';
        }
    }

    // Follow Up Lead Functions
    function openFollowUpModal(orderId) {
        currentOrderId = orderId;
        document.getElementById('followUpModal').classList.add('active');
        document.getElementById('followUpOrderId').value = orderId;
        
        // Set default date to now
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('followUpDate').value = now.toISOString().slice(0, 16);
        
        // Reset form
        document.getElementById('followUpChannel').value = '';
        document.getElementById('followUpType').value = '';
        document.getElementById('followUpNote').value = '';
    }

    function closeFollowUpModal() {
        document.getElementById('followUpModal').classList.remove('active');
    }

    async function saveFollowUp() {
        const leadId = document.getElementById('followUpLeadId').value;
        const followUpDate = document.getElementById('followUpDate').value;
        const channel = document.getElementById('followUpChannel').value;
        const type = document.getElementById('followUpType').value;
        const note = document.getElementById('followUpNote').value;

        if (!followUpDate || !type) {
            showAlert('Tanggal dan Type wajib diisi', 'error');
            return;
        }

        const btn = document.getElementById('btnSaveFollowUp');
        btn.disabled = true;
        btn.textContent = 'Menyimpan...';

        try {
            const body = {
                lead_id: parseInt(leadId),
                follow_up_date: followUpDate,
                channel: channel || null,
                type: type,
                note: note || null,
            };

            const response = await fetch(`${API_BASE}/followup`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.success) {
                closeFollowUpModal();
                showAlert('Follow up berhasil disimpan', 'success');
                loadOrders(currentPage);
                loadStatistics();
            } else {
                showAlert(result.message || 'Gagal menyimpan follow up', 'error');
            }
        } catch (error) {
            console.error('Error saving follow up:', error);
            showAlert('Terjadi kesalahan', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Simpan Follow Up';
        }
    }

    // Delete Lead
    async function deleteLead(id) {
        if (!confirm('Apakah Anda yakin ingin menghapus lead ini?')) return;

        try {
            const response = await fetch(`${API_BASE}/lead/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            const result = await response.json();

            if (result.success) {
                showAlert('Lead berhasil dihapus', 'success');
                loadOrders(currentPage);
                loadStatistics();
            } else {
                showAlert(result.message || 'Gagal menghapus lead', 'error');
            }
        } catch (error) {
            console.error('Error deleting lead:', error);
            showAlert('Terjadi kesalahan saat menghapus lead', 'error');
        }
    }

    // Create Lead Modal
    let customerList = [];
    
    async function loadCustomersForCreate() {
        try {
            // Load all customers without pagination using all=true parameter
            const response = await fetch(`${API_BASE}/customer?all=true`, { headers: getHeaders() });
            const result = await response.json();
            if (result.success && result.data) {
                customerList = result.data;
                renderCustomerDropdown(customerList);
            }
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }

    function renderCustomerDropdown(customers, searchTerm = '') {
        const list = document.getElementById('createCustomerList');
        const searchLower = searchTerm.toLowerCase();
        
        const filtered = customers.filter(customer => {
            if (!searchTerm) return true;
            const nama = (customer.nama || '').toLowerCase();
            const email = (customer.email || '').toLowerCase();
            const wa = (customer.wa || '').toLowerCase();
            const namaPanggilan = (customer.nama_panggilan || '').toLowerCase();
            return nama.includes(searchLower) || email.includes(searchLower) || wa.includes(searchLower) || namaPanggilan.includes(searchLower);
        });

        if (filtered.length === 0) {
            list.innerHTML = '<div class="searchable-select-item" style="text-align: center; color: var(--text-muted);">Tidak ada customer ditemukan</div>';
            return;
        }

        list.innerHTML = filtered.map(customer => {
            const detail = [];
            if (customer.email) detail.push(customer.email);
            if (customer.wa) detail.push(customer.wa);
            const detailText = detail.length > 0 ? detail.join(' / ') : '';
            
            return `
                <div class="searchable-select-item" data-id="${customer.id}" data-name="${customer.nama || `Customer #${customer.id}`}">
                    <div class="searchable-select-item-name">${customer.nama || `Customer #${customer.id}`}</div>
                    ${detailText ? `<div class="searchable-select-item-detail">${detailText}</div>` : ''}
                </div>
            `;
        }).join('');

        // Add click handlers
        list.querySelectorAll('.searchable-select-item').forEach(item => {
            item.addEventListener('click', function() {
                const customerId = this.dataset.id;
                const customerName = this.dataset.name;
                document.getElementById('createCustomerId').value = customerId;
                document.getElementById('createCustomerSearch').value = customerName;
                document.getElementById('createCustomerDropdown').style.display = 'none';
            });
        });
    }

    function openCreateModal() {
        document.getElementById('createModal').classList.add('active');
        document.getElementById('createCustomerId').value = '';
        document.getElementById('createCustomerSearch').value = '';
        document.getElementById('createCustomerDropdown').style.display = 'none';
        document.getElementById('createLeadLabel').value = '';
        document.getElementById('createMinatProduk').value = '';
        document.getElementById('createAlasanTertarik').value = '';
        document.getElementById('createAlasanBelum').value = '';
        document.getElementById('createHarapan').value = '';
        document.getElementById('createLastContact').value = '';
        document.getElementById('createNextFollowUp').value = '';
        loadCustomersForCreate();
    }

    function closeCreateModal() {
        document.getElementById('createModal').classList.remove('active');
    }

    async function createLead() {
        const customerId = document.getElementById('createCustomerId').value;
        const leadLabel = document.getElementById('createLeadLabel').value.trim();
        const minatProduk = document.getElementById('createMinatProduk').value.trim();
        const alasanTertarik = document.getElementById('createAlasanTertarik').value.trim();
        const alasanBelum = document.getElementById('createAlasanBelum').value.trim();
        const harapan = document.getElementById('createHarapan').value.trim();
        const lastContact = document.getElementById('createLastContact').value;
        const nextFollowUp = document.getElementById('createNextFollowUp').value;

        if (!customerId) {
            showAlert('Customer wajib dipilih', 'error');
            return;
        }

        if (!leadLabel) {
            showAlert('Label lead wajib diisi', 'error');
            return;
        }

        const btn = document.getElementById('btnCreate');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        try {
            const body = {
                customer_id: parseInt(customerId),
                lead_label: leadLabel,
                minat_produk: minatProduk || null,
                alasan_tertarik: alasanTertarik || null,
                alasan_belum: alasanBelum || null,
                harapan: harapan || null,
                last_contact_at: lastContact || null,
                next_follow_up_at: nextFollowUp || null,
            };

            const response = await fetch(`${API_BASE}/lead`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.success) {
                closeCreateModal();
                showAlert('Lead berhasil ditambahkan', 'success');
        loadOrders();
        loadStatistics();
            } else {
                showAlert(result.message || 'Gagal menambahkan lead', 'error');
            }
        } catch (error) {
            console.error('Error creating lead:', error);
            showAlert('Terjadi kesalahan saat menambahkan lead', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Tambah Lead';
        }
    }

    // Create Follow Up Modal
    let leadList = [];
    
    async function loadOrdersForFollowUp() {
        try {
            const response = await fetch(`${API_BASE}/order/sales?per_page=1000`, { headers: getHeaders() });
            const result = await response.json();
            if (result.success && result.data) {
                orderList = result.data;
                const select = document.getElementById('createFollowUpOrderId');
                select.innerHTML = '<option value="">Pilih Order</option>';
                orderList.forEach(order => {
                    const option = document.createElement('option');
                    option.value = order.id;
                    option.textContent = `${order.customer_rel?.nama || 'Customer'} - ${order.produk_rel?.nama || 'Produk'} - Rp ${formatCurrency(order.total_harga || 0)}`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    function openCreateFollowUpModal() {
        document.getElementById('createFollowUpModal').classList.add('active');
        document.getElementById('createFollowUpOrderId').value = '';
        document.getElementById('createFollowUpDate').value = '';
        document.getElementById('createFollowUpChannel').value = '';
        document.getElementById('createFollowUpType').value = '';
        document.getElementById('createFollowUpNote').value = '';
        
        // Set default date to now
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('createFollowUpDate').value = now.toISOString().slice(0, 16);
        
        loadOrdersForFollowUp();
    }

    function closeCreateFollowUpModal() {
        document.getElementById('createFollowUpModal').classList.remove('active');
    }

    async function createFollowUp() {
        const orderId = document.getElementById('createFollowUpOrderId').value;
        const followUpDate = document.getElementById('createFollowUpDate').value;
        const channel = document.getElementById('createFollowUpChannel').value;
        const type = document.getElementById('createFollowUpType').value;
        const note = document.getElementById('createFollowUpNote').value.trim();

        if (!orderId) {
            showAlert('Order wajib dipilih', 'error');
            return;
        }

        if (!followUpDate) {
            showAlert('Tanggal follow up wajib diisi', 'error');
            return;
        }

        if (!type) {
            showAlert('Type aktivitas wajib dipilih', 'error');
            return;
        }

        const btn = document.getElementById('btnCreateFollowUp');
        btn.disabled = true;
        btn.textContent = 'Processing...';

        try {
            const body = {
                order_id: parseInt(orderId),
                follow_up_date: followUpDate,
                channel: channel || null,
                type: type,
                note: note || null,
            };

            const response = await fetch(`${API_BASE}/order-followup`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.success) {
                closeCreateFollowUpModal();
                showAlert('Follow up berhasil ditambahkan', 'success');
                loadOrders();
                loadStatistics();
            } else {
                showAlert(result.message || 'Gagal menambahkan follow up', 'error');
            }
        } catch (error) {
            console.error('Error creating follow up:', error);
            showAlert('Terjadi kesalahan saat menambahkan follow up', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Tambah Follow Up';
        }
    }

    // Broadcast Modal Functions
    function openBroadcastModal() {
        document.getElementById('broadcastModal').classList.add('active');
        document.getElementById('broadcastMessage').value = '';
        document.getElementById('broadcastStatusFilter').value = '';
        document.getElementById('broadcastStatusPembayaranFilter').value = '';
    }

    function closeBroadcastModal() {
        document.getElementById('broadcastModal').classList.remove('active');
    }

    async function sendBroadcast() {
        const message = document.getElementById('broadcastMessage').value.trim();
        const statusOrder = document.getElementById('broadcastStatusFilter').value;
        const statusPembayaran = document.getElementById('broadcastStatusPembayaranFilter').value;

        if (!message) {
            showAlert('Pesan wajib diisi', 'error');
            return;
        }

        const btn = document.getElementById('btnBroadcast');
        btn.disabled = true;
        btn.textContent = 'Mengirim...';

        try {
            const body = {
                message: message,
                status_order: statusOrder || null,
                status_pembayaran: statusPembayaran !== '' ? statusPembayaran : null,
            };

            const response = await fetch(`${API_BASE}/order/broadcast`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.success) {
                closeBroadcastModal();
                showAlert(`Broadcast berhasil dikirim! Total: ${result.data.total_orders} order, Terkirim: ${result.data.sent}`, 'success');
                loadOrders();
                loadStatistics();
            } else {
                showAlert(result.message || 'Gagal mengirim broadcast', 'error');
            }
        } catch (error) {
            console.error('Error sending broadcast:', error);
            showAlert('Terjadi kesalahan saat mengirim broadcast', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Kirim Broadcast';
        }
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === document.getElementById('createModal')) {
            closeCreateModal();
        }
        if (event.target === document.getElementById('createFollowUpModal')) {
            closeCreateFollowUpModal();
        }
        if (event.target === document.getElementById('broadcastModal')) {
            closeBroadcastModal();
        }
    }

    // WhatsApp Modal Functions
    function openWhatsAppModal(leadId, customerName, customerPhone, customerEmail, customerPendapatan) {
        document.getElementById('whatsAppModal').classList.add('active');
        document.getElementById('waLeadId').value = leadId;
        document.getElementById('waCustomerName').textContent = customerName || '-';
        document.getElementById('waCustomerPhone').textContent = customerPhone || '-';
        document.getElementById('waCustomerEmail').textContent = customerEmail || '-';
        document.getElementById('waCustomerPendapatan').textContent = customerPendapatan || '-';
        document.getElementById('waMessage').value = '';
    }

    function closeWhatsAppModal() {
        document.getElementById('whatsAppModal').classList.remove('active');
    }

    async function sendWhatsAppMessage() {
        const leadId = document.getElementById('waLeadId').value;
        const message = document.getElementById('waMessage').value.trim();

        if (!message) {
            showAlert('Pesan wajib diisi', 'error');
            return;
        }

        const btn = document.getElementById('btnSendWhatsApp');
        btn.disabled = true;
        btn.textContent = 'Mengirim...';

        try {
            const response = await fetch(`${API_BASE}/order/${leadId}/send-whatsapp`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ message })
            });

            const result = await response.json();

            if (result.success) {
                closeWhatsAppModal();
                showAlert('Pesan WhatsApp berhasil dikirim', 'success');
                loadOrders(currentPage);
            } else {
                showAlert(result.message || 'Gagal mengirim pesan WhatsApp', 'error');
            }
        } catch (error) {
            console.error('Error sending WhatsApp:', error);
            showAlert('Terjadi kesalahan saat mengirim pesan', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Kirim WhatsApp';
        }
    }
</script>
@endpush

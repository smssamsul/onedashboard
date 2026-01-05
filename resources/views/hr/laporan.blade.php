@extends('layouts.hr')

@section('title', 'Laporan HR')
@section('page_title', 'Laporan HR')

@push('styles')
<style>
    :root {
        --theme-primary: #A78BFA;
        --theme-primary-dark: #8B5CF6;
        --theme-primary-light: #C4B5FD;
    }

    .page-header {
        background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-light) 100%);
        border-radius: var(--radius-lg);
        padding: 1.5rem 2rem;
        color: white;
        margin-bottom: 1.5rem;
    }
</style>
@endpush

@section('content')
<div class="card-table">
    <div style="text-align: center; padding: 3rem;">
        <h3>Halaman Laporan</h3>
        <p style="color: var(--text-muted); margin-top: 1rem;">Fitur ini akan segera tersedia</p>
    </div>
</div>
@endsection


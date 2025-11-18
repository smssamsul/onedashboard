@extends('layouts.admin')

@section('title', 'Admin Dashboard')
@section('page_title', 'Dashboard')

@section('content')
    <div class="card-grid">
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 12h4l3 9 4-18 3 9h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <span class="stat-label">Total Sales</span>
            <span class="stat-value">Rp 124M</span>
            <small class="text-muted">+12% vs last month</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm11 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <span class="stat-label">Customers</span>
            <span class="stat-value">2,451</span>
            <small class="text-muted">+48 new today</small>
        </div>
        <div class="stat-card">
            <div class="stat-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M13 2v7h7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <span class="stat-label">Projects</span>
            <span class="stat-value">86</span>
            <small class="text-muted">5 ongoing</small>
        </div>
    </div>

    <div class="card-table">
        <h3>Recent Activities</h3>
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Project</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Rian Satya</td>
                        <td>Cluster Mandala</td>
                        <td><span class="status-pill status-success">Completed</span></td>
                        <td>16 Nov 2025</td>
                    </tr>
                    <tr>
                        <td>Adelia Putri</td>
                        <td>Villa Harmoni</td>
                        <td><span class="status-pill status-warning">Pending</span></td>
                        <td>15 Nov 2025</td>
                    </tr>
                    <tr>
                        <td>M. Fauzan</td>
                        <td>Townhouse Kinara</td>
                        <td><span class="status-pill status-danger">Revision</span></td>
                        <td>14 Nov 2025</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
@endsection


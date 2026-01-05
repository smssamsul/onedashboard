<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SalesDashboardViewController extends Controller
{
    public function index()
    {
        // Check if user is authenticated via API token
        // For now, return the default dashboard view
        // The JavaScript will handle the layout switching based on user level
        return view('sales.dashboard');
    }
}


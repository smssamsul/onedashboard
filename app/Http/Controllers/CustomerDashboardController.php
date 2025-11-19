<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class CustomerDashboardController extends Controller
{
    /**
     * Display the customer dashboard view.
     *
     * @return \Illuminate\View\View
     */
    public function index()
    {
        return view('customer.dashboard');
    }
}


<?php

namespace App\Http\Controllers\Api\Marketing;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MarketingDashboardController extends Controller
{
    public function index(Request $request)
    {
        // Data dummy untuk Marketing Dashboard
        return response()->json([
            'success' => true,
            'data' => [
                'statistik' => [
                    'total_campaign' => 24,
                    'campaign_aktif' => 8,
                    'campaign_selesai' => 14,
                    'campaign_terjadwal' => 2,
                    'total_lead' => 1245,
                    'lead_baru_hari_ini' => 45,
                ],
                'performance' => [
                    'conversion_rate' => 12.5,
                    'cost_per_lead' => 125000,
                    'cost_per_lead_formatted' => 'Rp 125.000',
                    'return_on_ad_spend' => 320,
                    'return_on_ad_spend_formatted' => '320%',
                    'total_revenue' => 185000000,
                    'total_revenue_formatted' => 'Rp 185.000.000',
                ],
                'channels' => [
                    'social_media' => 856,
                    'email_marketing' => 234,
                    'seo' => 89,
                    'paid_ads' => 66,
                ],
                'chart_leads' => [
                    ['label' => 'Sen', 'leads' => 125, 'konversi' => 15],
                    ['label' => 'Sel', 'leads' => 142, 'konversi' => 18],
                    ['label' => 'Rab', 'leads' => 138, 'konversi' => 17],
                    ['label' => 'Kam', 'leads' => 156, 'konversi' => 20],
                    ['label' => 'Jum', 'leads' => 148, 'konversi' => 19],
                    ['label' => 'Sab', 'leads' => 89, 'konversi' => 11],
                    ['label' => 'Min', 'leads' => 67, 'konversi' => 8],
                ],
                'chart_campaign' => [
                    ['label' => 'Jan', 'leads' => 180, 'revenue' => 22000000],
                    ['label' => 'Feb', 'leads' => 195, 'revenue' => 24000000],
                    ['label' => 'Mar', 'leads' => 210, 'revenue' => 26000000],
                    ['label' => 'Apr', 'leads' => 225, 'revenue' => 28000000],
                    ['label' => 'Mei', 'leads' => 240, 'revenue' => 30000000],
                    ['label' => 'Jun', 'leads' => 255, 'revenue' => 32000000],
                ],
                'campaign_terbaru' => [
                    ['nama' => 'Promo Cluster Mandala', 'channel' => 'Social Media', 'status' => 'Aktif', 'leads' => 156, 'konversi' => 18],
                    ['nama' => 'Email Campaign Villa', 'channel' => 'Email Marketing', 'status' => 'Aktif', 'leads' => 89, 'konversi' => 12],
                    ['nama' => 'SEO Landing Page', 'channel' => 'SEO', 'status' => 'Aktif', 'leads' => 234, 'konversi' => 28],
                    ['nama' => 'Google Ads Campaign', 'channel' => 'Paid Ads', 'status' => 'Selesai', 'leads' => 189, 'konversi' => 22],
                ],
            ]
        ]);
    }
}


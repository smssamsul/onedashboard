<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Menu;

class MenuSeeder extends Seeder
{
    /**
     * Seed tabel menu dari struktur sidebar yang ada di
     * frontend-tp/src/components/Sidebar.js (per divisi).
     * departemen_id mengacu ke hr_departemen.id:
     * 1=Direksi, 3=Sales, 4=Finance, 5=HR, 6=Marketing, 7=Multimedia, 8=IT.
     * departemen_id null = menu global/admin (di luar struktur hr_departemen).
     *
     * @return void
     */
    public function run()
    {
        $rows = [];
        $urutan = 0;

        $add = function ($key, $label, $href, $icon, $section, $departemenId) use (&$rows, &$urutan) {
            $urutan++;
            $rows[] = [
                'key' => $key,
                'label' => $label,
                'href' => $href,
                'icon_name' => $icon,
                'section' => $section,
                'departemen_id' => $departemenId,
                'urutan' => $urutan,
            ];
        };

        // ===== SALES (departemen_id = 3) =====
        $add('sales.dashboard', 'Dashboard', '/sales', 'Home', 'OVERVIEW', 3);
        $add('sales.customers', 'Customers', '/sales/customers', 'UserCheck', 'CUSTOMERS', 3);
        $add('sales.leads', 'Leads', '/sales/lead-lpwa', 'UserPlus', 'CUSTOMERS', 3);
        $add('sales.customers.statistik', 'Statistik Customer', '/sales/customers/statistik', 'BarChart3', 'CUSTOMERS', 3);
        $add('sales.orders', 'Orders', '/sales/orders', 'ClipboardList', 'OPERATIONS', 3);
        $add('sales.quick_order', 'Order Cepat', '/sales/quick-order', 'Zap', 'OPERATIONS', 3);
        $add('sales.invitation', 'Invitation', '/sales/invitation', 'Mail', 'OPERATIONS', 3);
        $add('sales.kehadiran', 'Kehadiran', '/sales/kehadiran', 'QrCode', 'OPERATIONS', 3);
        $add('sales.pengiriman', 'Pengiriman & Resi', '/sales/pengiriman', 'Truck', 'OPERATIONS', 3);
        $add('sales.kategori', 'Kategori Produk', '/sales/kategori', 'ShoppingBag', 'OPERATIONS', 3);
        $add('sales.products', 'Products', '/sales/products', 'ShoppingBag', 'OPERATIONS', 3);
        $add('sales.bonus', 'Bonus Produk', '/sales/bonus', 'ShoppingBag', 'OPERATIONS', 3);
        $add('sales.ecourse', 'Ecourse', '/sales/ecourse', 'ShoppingBag', 'OPERATIONS', 3);
        $add('sales.broadcast', 'Broadcast', '/sales/broadcast', 'Radio', 'OPERATIONS', 3);
        $add('sales.template_broadcast', 'Template Broadcast', '/sales/template-broadcast', 'FileText', 'OPERATIONS', 3);
        $add('sales.setting', 'Setting', '/sales/setting', 'Settings', 'OPERATIONS', 3);
        $add('sales.ai.master_knowledge', 'Master Knowledge', '/sales/ai/master-knowledge', 'Brain', 'AI', 3);
        $add('sales.ai.setting', 'AI Setting', '/sales/ai/setting', 'Code', 'AI', 3);
        $add('sales.ai.simulasi', 'Simulasi AI', '/sales/ai/simulasi', 'MessageSquare', 'AI', 3);
        $add('sales.leads_ai', 'Leads AI', '/sales/leads-ai', 'Users', 'AI', 3);
        $add('sales.percakapan', 'Percakapan', '/sales/percakapan', 'MessageSquare', 'AI', 3);
        $add('sales.followup.report', 'Follow Up Logs', '/sales/followup/report', 'Activity', 'REPORTS', 3);
        $add('sales.log_pixel', 'Log Pixel', '/sales/log-pixel', 'Activity', 'REPORTS', 3);
        $add('sales.meta_ads_report', 'Meta Ads', '/sales/meta-ads-report', 'BarChart3', 'REPORTS', 3);
        $add('sales.sales_list', 'Sales List', '/sales/sales-list', 'Users', 'TEAM MANAGEMENT', 3);
        $add('sales.absensi_saya', 'Absensi Saya', '/sales/absensi-saya', 'CheckSquare', 'ABSENSI & CUTI', 3);
        $add('sales.cuti_saya', 'Cuti Saya', '/sales/cuti-saya', 'CalendarDays', 'ABSENSI & CUTI', 3);
        $add('sales.izin_saya', 'Izin Saya', '/sales/izin-saya', 'FileText', 'ABSENSI & CUTI', 3);
        $add('sales.todo_list_saya', 'Todo List Saya', '/sales/todo-list-saya', 'ListTodo', 'ABSENSI & CUTI', 3);

        // ===== FINANCE (departemen_id = 4) =====
        $add('finance.dashboard', 'Dashboard', '/finance', 'Home', 'OVERVIEW', 4);
        $add('finance.transactions', 'Transactions', '/finance/transactions', 'ClipboardList', 'TRANSACTIONS', 4);
        $add('finance.absensi_saya', 'Absensi Saya', '/finance/absensi-saya', 'CheckSquare', 'ABSENSI & CUTI', 4);
        $add('finance.cuti_saya', 'Cuti Saya', '/finance/cuti-saya', 'CalendarDays', 'ABSENSI & CUTI', 4);
        $add('finance.todo_list_saya', 'Todo List Saya', '/finance/todo-list-saya', 'ListTodo', 'ABSENSI & CUTI', 4);

        // ===== HR (departemen_id = 5) =====
        $add('hr.dashboard', 'Dashboard', '/hr/dashboard', 'Home', 'MAIN', 5);
        $add('hr.karyawan', 'Karyawan', '/hr/karyawan', 'Users', 'DATA', 5);
        $add('hr.struktur_organisasi', 'Struktur Organisasi', '/hr/struktur-organisasi', 'Network', 'DATA', 5);
        $add('hr.departemen', 'Divisi', '/hr/departemen', 'Building2', 'DATA', 5);
        $add('hr.shift', 'Shift', '/hr/shift', 'Clock', 'DATA', 5);
        $add('hr.absensi', 'Absensi', '/hr/absensi', 'CheckSquare', 'KEHADIRAN', 5);
        $add('hr.cuti', 'Pengajuan Cuti', '/hr/cuti', 'CalendarDays', 'CUTI', 5);
        $add('hr.type_cuti', 'Jenis Cuti', '/hr/type-cuti', 'Tag', 'CUTI', 5);
        $add('hr.izin', 'Pengajuan Izin', '/hr/izin', 'FileText', 'IZIN', 5);
        $add('hr.setting', 'Setting', '/hr/setting', 'Settings', 'PENGATURAN', 5);
        $add('hr.laporan', 'Laporan', '/hr/laporan', 'FileText', 'LAPORAN', 5);
        $add('hr.todo_list', 'Todo List Karyawan', '/hr/todo-list', 'ListTodo', 'LAPORAN', 5);
        $add('hr.absensi_saya', 'Absensi Saya', '/hr/absensi-saya', 'CheckSquare', 'ABSENSI & CUTI', 5);
        $add('hr.cuti_saya', 'Cuti Saya', '/hr/cuti-saya', 'CalendarDays', 'ABSENSI & CUTI', 5);
        $add('hr.izin_saya', 'Izin Saya', '/hr/izin-saya', 'FileText', 'ABSENSI & CUTI', 5);
        $add('hr.todo_list_saya', 'Todo List Saya', '/hr/todo-list-saya', 'ListTodo', 'ABSENSI & CUTI', 5);

        // ===== MARKETING (departemen_id = 6) =====
        $add('marketing.dashboard', 'Dashboard', '/marketing', 'Home', 'OVERVIEW', 6);
        $add('marketing.absensi_saya', 'Absensi Saya', '/marketing/absensi-saya', 'CheckSquare', 'ABSENSI & CUTI', 6);
        $add('marketing.cuti_saya', 'Cuti Saya', '/marketing/cuti-saya', 'CalendarDays', 'ABSENSI & CUTI', 6);
        $add('marketing.izin_saya', 'Izin Saya', '/marketing/izin-saya', 'FileText', 'ABSENSI & CUTI', 6);
        $add('marketing.todo_list_saya', 'Todo List Saya', '/marketing/todo-list-saya', 'ListTodo', 'ABSENSI & CUTI', 6);
        $add('marketing.meta_ads.overview', 'Meta Ads Overview', '/marketing/meta-ads', 'BarChart3', 'META ADS', 6);
        $add('marketing.meta_ads.campaigns', 'Kelola Campaign', '/marketing/meta-ads/campaigns', 'Megaphone', 'META ADS', 6);
        $add('marketing.meta_ads.crosscheck', 'Pixel Crosscheck', '/marketing/meta-ads/crosscheck', 'Activity', 'META ADS', 6);
        $add('marketing.meta_ads.accounts', 'Setting Akun', '/marketing/meta-ads/accounts', 'Settings', 'META ADS', 6);

        // ===== MULTIMEDIA (departemen_id = 7) =====
        $add('multimedia.dashboard', 'Dashboard', '/multimedia', 'Home', 'OVERVIEW', 7);
        $add('multimedia.absensi_saya', 'Absensi Saya', '/multimedia/absensi-saya', 'CheckSquare', 'ABSENSI & CUTI', 7);
        $add('multimedia.cuti_saya', 'Cuti Saya', '/multimedia/cuti-saya', 'CalendarDays', 'ABSENSI & CUTI', 7);
        $add('multimedia.izin_saya', 'Izin Saya', '/multimedia/izin-saya', 'FileText', 'ABSENSI & CUTI', 7);
        $add('multimedia.todo_list_saya', 'Todo List Saya', '/multimedia/todo-list-saya', 'ListTodo', 'ABSENSI & CUTI', 7);

        // ===== IT (departemen_id = 8) =====
        $add('it.dashboard', 'Dashboard', '/it', 'Home', 'OVERVIEW', 8);
        $add('it.absensi_saya', 'Absensi Saya', '/it/absensi-saya', 'CheckSquare', 'ABSENSI & CUTI', 8);
        $add('it.cuti_saya', 'Cuti Saya', '/it/cuti-saya', 'CalendarDays', 'ABSENSI & CUTI', 8);
        $add('it.izin_saya', 'Izin Saya', '/it/izin-saya', 'FileText', 'ABSENSI & CUTI', 8);
        $add('it.todo_list_saya', 'Todo List Saya', '/it/todo-list-saya', 'ListTodo', 'ABSENSI & CUTI', 8);

        // ===== DIREKSI (departemen_id = 1) =====
        $add('direksi.dashboard', 'Dashboard', '/direksi', 'Home', 'OVERVIEW', 1);
        $add('direksi.task_list', 'Task List Karyawan', '/direksi/task-list', 'ListTodo', 'MAIN', 1);
        $add('direksi.approval_izin', 'Approval Izin', '/direksi/approval-izin', 'FileText', 'MAIN', 1);
        $add('direksi.sales.orders', 'Data Order', '/direksi/sales/orders', 'ShoppingBag', 'SALES', 1);
        $add('direksi.sales.products', 'Data Produk', '/direksi/sales/products', 'ShoppingBag', 'SALES', 1);
        $add('direksi.sales.customers', 'Data Customer', '/direksi/sales/customers', 'ShoppingBag', 'SALES', 1);
        $add('direksi.sales.ai', 'Data AI', '/direksi/sales/ai', 'ShoppingBag', 'SALES', 1);
        $add('direksi.sales.leads_ai', 'Data Leads AI', '/direksi/sales/leads-ai', 'ShoppingBag', 'SALES', 1);
        $add('direksi.sales.percakapan', 'Percakapan', '/direksi/sales/percakapan', 'ShoppingBag', 'SALES', 1);
        $add('direksi.hr.karyawan', 'Data Karyawan', '/direksi/hr/karyawan', 'Users', 'HR', 1);
        $add('direksi.hr.struktur_organisasi', 'Struktur Organisasi', '/direksi/hr/struktur-organisasi', 'Users', 'HR', 1);
        $add('direksi.hr.absensi', 'Data Absensi Karyawan', '/direksi/hr/absensi', 'Users', 'HR', 1);
        $add('direksi.hr.cuti', 'Data Cuti Karyawan', '/direksi/hr/cuti', 'Users', 'HR', 1);
        $add('direksi.marketing.leads', 'Lead', '/direksi/marketing/leads', 'TrendingUp', 'MARKETING', 1);
        $add('direksi.marketing.penjualan', 'Penjualan', '/direksi/marketing/penjualan', 'TrendingUp', 'MARKETING', 1);
        $add('direksi.it.progress_report', 'Progress Report', '/direksi/it/progress-report', 'Code', 'IT', 1);
        $add('direksi.multimedia.konten', 'Jumlah Konten & Insight', '/direksi/multimedia/konten', 'Film', 'MULTIMEDIA', 1);

        // ===== ADMIN (departemen_id = null, di luar struktur hr_departemen) =====
        $add('admin.dashboard', 'Dashboard', '/admin', 'Home', 'OVERVIEW', null);
        $add('admin.users', 'Users', '/admin/users', 'Users', 'USER MANAGEMENT', null);
        $add('admin.menu', 'Menu Master', '/admin/menu', 'Menu', 'USER MANAGEMENT', null);
        $add('admin.hak_akses', 'Hak Akses Menu', '/admin/hak-akses', 'ShieldCheck', 'USER MANAGEMENT', null);

        foreach ($rows as $row) {
            Menu::updateOrCreate(
                ['key' => $row['key']],
                [
                    'label' => $row['label'],
                    'href' => $row['href'],
                    'icon_name' => $row['icon_name'],
                    'section' => $row['section'],
                    'departemen_id' => $row['departemen_id'],
                    'urutan' => $row['urutan'],
                    'status' => '1',
                    'create_at' => now()->format('Y-m-d H:i:s'),
                ]
            );
        }
    }
}

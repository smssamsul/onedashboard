<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\Percakapan;
use App\Models\DetailPercakapan;
use App\Models\Customer;
use App\Models\LogsFollup;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Rekap Follow-Up: ringkasan respons tim terhadap percakapan WA masuk,
 * dihitung dari percakapan + detail_percakapan (bukan tabel baru - lihat
 * catatan investigasi sebelum fitur ini dibuat).
 *
 * "Tim" di sini artinya sender_type 'sales' ATAU 'AI' - data belum
 * memisahkan balasan manual dari auto-reply/broadcast, jadi statistik
 * respons/dibalas menghitung keduanya sebagai "dibalas". Ini bukan bug,
 * memang keterbatasan data yang ada - makanya ditulis jelas di frontend.
 *
 * Status "dibalas" JUGA memperhitungkan logs_follup (sistem follow-up
 * template terpisah, tidak nyambung ke percakapan/detail_percakapan sama
 * sekali) - kalau customer belum dibalas lewat chat tapi sudah dapat
 * follow-up otomatis (status=terkirim) dalam periode yang sama, tetap
 * dihitung "dibalas". Tanpa ini banyak lead yang sebenarnya sudah
 * di-follow-up salah kelihatan "belum dibalas". Tidak dipakai untuk
 * median respon (logs_follup bukan balasan ke pesan spesifik, beda
 * semantik dari respons chat).
 */
class FollowUpRecapController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function summary(Request $request)
    {
        $salesId = $request->get('sales_id', 'all');
        $days = (int) $request->get('days', 7);
        $days = max(1, min($days, 90));

        // Tanggal eksplisit (dari date picker "Hari Ini" / custom di frontend)
        // menang atas `days` kalau dikirim dua-duanya - `days` tetap didukung
        // supaya kompatibel dengan pemanggil lama yang cuma kirim jumlah hari.
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');

        if ($dateFrom && $dateTo) {
            try {
                $start = Carbon::parse($dateFrom)->startOfDay();
                $end = Carbon::parse($dateTo)->endOfDay();
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format tanggal tidak valid.',
                ], 422);
            }

            if ($start->gt($end)) {
                [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
            }

            // Batasi maksimal 90 hari supaya query tetap ringan, sama seperti batas `days`.
            if ($start->diffInDays($end) > 90) {
                $start = $end->copy()->subDays(90)->startOfDay();
            }
        } else {
            $end = Carbon::now();
            $start = Carbon::now()->subDays($days - 1)->startOfDay();
        }

        // Dropdown "per sales" - hanya sales yang pernah ditugaskan percakapan,
        // biar tidak nampilin sales yang tidak relevan di menu ini.
        $salesOptions = User::whereIn(
            'id',
            Percakapan::whereNotNull('assigned_sales_id')->distinct()->pluck('assigned_sales_id')
        )
            ->orderBy('nama')
            ->get(['id', 'nama'])
            ->map(fn ($u) => ['id' => $u->id, 'nama' => $u->nama]);

        $percakapanQuery = Percakapan::query();
        if ($salesId !== 'all' && $salesId !== null && $salesId !== '') {
            $percakapanQuery->where('assigned_sales_id', $salesId);
        }

        // "Leads masuk" = percakapan BARU (thread baru) yang dibuat di periode ini.
        $leadsMasuk = (clone $percakapanQuery)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $percakapanIdsInScope = (clone $percakapanQuery)->pluck('id');

        $messages = DetailPercakapan::whereIn('id_percakapan', $percakapanIdsInScope)
            ->whereBetween('created_at', [$start, $end])
            ->orderBy('id_percakapan')
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'id_percakapan', 'sender_type', 'created_at']);

        $messagesByThread = $messages->groupBy('id_percakapan');

        $percakapanList = (clone $percakapanQuery)
            ->with('sales:id,nama')
            ->whereIn('id', $messagesByThread->keys())
            ->get(['id', 'name', 'phone_number', 'assigned_sales_id']);

        // Cocokkan nomor WA percakapan ke customer, lalu cek logs_follup
        // (status=1/terkirim) dalam periode yang sama - lihat catatan di
        // docblock class ini kenapa ini perlu.
        $phoneToCustomerId = Customer::whereIn('wa', $percakapanList->pluck('phone_number'))
            ->pluck('id', 'wa');

        $customerIdsWithFollowUp = LogsFollup::whereIn('customer', $phoneToCustomerId->values())
            ->where('status', '1')
            ->whereBetween('create_at', [$start, $end])
            ->distinct()
            ->pluck('customer')
            ->flip();

        $totalPercakapanAktif = 0;
        $dibalasTimCount = 0;
        $prospekBalasLagiCount = 0;
        $balasanCustomerTotal = 0;
        $kirimTimTotal = 0;
        $responseDeltasMinutes = [];
        $hourly = [];
        for ($h = 0; $h < 24; $h++) {
            $hourly[$h] = ['hour' => $h, 'balasan_masuk' => 0, 'kirim_tim' => 0];
        }
        $perLead = [];

        foreach ($percakapanList as $p) {
            $msgs = $messagesByThread->get($p->id, collect());
            if ($msgs->isEmpty()) {
                continue;
            }

            $hasCustomerMsg = false;
            $threadDibalas = false;
            $threadBalasLagi = false;
            $pendingCustomerTime = null;
            $customerMsgCountThread = 0;
            $teamMsgCountThread = 0;
            $threadDeltas = [];
            $lastMessageAt = null;

            foreach ($msgs as $m) {
                $hour = (int) $m->created_at->format('G');
                $lastMessageAt = $m->created_at;

                if ($m->sender_type === 'customer') {
                    $hasCustomerMsg = true;
                    $customerMsgCountThread++;
                    $hourly[$hour]['balasan_masuk']++;
                    if ($pendingCustomerTime === null) {
                        $pendingCustomerTime = $m->created_at;
                    }
                    if ($threadDibalas) {
                        $threadBalasLagi = true;
                    }
                } else {
                    // 'sales' atau 'AI' - keduanya dihitung "tim" (lihat catatan class docblock)
                    $teamMsgCountThread++;
                    $hourly[$hour]['kirim_tim']++;
                    if ($pendingCustomerTime !== null) {
                        $deltaMinutes = $pendingCustomerTime->diffInSeconds($m->created_at) / 60;
                        $responseDeltasMinutes[] = $deltaMinutes;
                        $threadDeltas[] = $deltaMinutes;
                        $pendingCustomerTime = null;
                    }
                    if ($hasCustomerMsg) {
                        $threadDibalas = true;
                    }
                }
            }

            if (!$hasCustomerMsg) {
                continue;
            }

            // Belum dibalas lewat chat? Cek juga apakah sudah kena follow-up
            // otomatis (logs_follup) - lihat catatan docblock class ini.
            if (!$threadDibalas) {
                $custId = $phoneToCustomerId->get($p->phone_number);
                if ($custId !== null && isset($customerIdsWithFollowUp[$custId])) {
                    $threadDibalas = true;
                }
            }

            $totalPercakapanAktif++;
            if ($threadDibalas) {
                $dibalasTimCount++;
            }
            if ($threadBalasLagi) {
                $prospekBalasLagiCount++;
            }
            $balasanCustomerTotal += $customerMsgCountThread;
            $kirimTimTotal += $teamMsgCountThread;

            $perLead[] = [
                'id' => $p->id,
                'nama' => $p->name ?: 'Tanpa nama',
                'phone' => $p->phone_number,
                'sales_nama' => $p->sales->nama ?? null,
                'last_message_at' => optional($lastMessageAt)->toIso8601String(),
                'pesan_masuk' => $customerMsgCountThread,
                'pesan_tim' => $teamMsgCountThread,
                'dibalas' => $threadDibalas,
                'respon_menit' => count($threadDeltas) > 0 ? round(array_sum($threadDeltas) / count($threadDeltas), 1) : null,
            ];
        }

        usort($perLead, fn ($a, $b) => strcmp($b['last_message_at'] ?? '', $a['last_message_at'] ?? ''));
        $perLead = array_slice($perLead, 0, 200);

        $belumDibalas = $totalPercakapanAktif - $dibalasTimCount;
        $dibalasPct = $totalPercakapanAktif > 0 ? round(($dibalasTimCount / $totalPercakapanAktif) * 100) : 0;
        $balasLagiPct = $dibalasTimCount > 0 ? round(($prospekBalasLagiCount / $dibalasTimCount) * 100) : 0;

        sort($responseDeltasMinutes);
        $medianRespon = null;
        $count = count($responseDeltasMinutes);
        if ($count > 0) {
            $mid = intdiv($count, 2);
            $medianRespon = $count % 2 === 0
                ? round(($responseDeltasMinutes[$mid - 1] + $responseDeltasMinutes[$mid]) / 2, 1)
                : round($responseDeltasMinutes[$mid], 1);
        }
        $balasCepatPct = $count > 0
            ? round((count(array_filter($responseDeltasMinutes, fn ($d) => $d <= 15)) / $count) * 100)
            : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'period' => [
                    'start' => $start->toDateString(),
                    'end' => $end->toDateString(),
                    'days' => $days,
                ],
                'sales_options' => $salesOptions,
                'summary' => [
                    'leads_masuk' => $leadsMasuk,
                    'percakapan_aktif' => $totalPercakapanAktif,
                    'dibalas_tim' => $dibalasTimCount,
                    'dibalas_pct' => $dibalasPct,
                    'belum_dibalas' => $belumDibalas,
                    'balasan_customer' => $balasanCustomerTotal,
                    'kirim_tim' => $kirimTimTotal,
                    'median_respon_menit' => $medianRespon,
                    'balas_cepat_pct' => $balasCepatPct,
                ],
                'hourly' => array_values($hourly),
                'funnel' => [
                    'percakapan_masuk' => $totalPercakapanAktif,
                    'dibalas_tim' => $dibalasTimCount,
                    'dibalas_pct' => $dibalasPct,
                    'prospek_balas_lagi' => $prospekBalasLagiCount,
                    'balas_lagi_pct' => $balasLagiPct,
                ],
                'per_lead' => $perLead,
            ],
        ]);
    }
}

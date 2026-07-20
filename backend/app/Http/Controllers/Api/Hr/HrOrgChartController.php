<?php

namespace App\Http\Controllers\Api\Hr;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\HrKaryawan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class HrOrgChartController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Semua karyawan aktif dalam satu payload flat, siap dipakai canvas.
     * Baca-baca saja - boleh diakses semua user login (dipakai utk mode read-only).
     */
    public function index()
    {
        $karyawan = HrKaryawan::with(['departemen_rel:id,nama', 'user_rel:id,divisi'])
            ->where('status', '!=', 'N')
            ->select('id', 'nama', 'jabatan', 'avatar_url', 'departemen', 'approval', 'posisi_x', 'posisi_y', 'user_id')
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $karyawan,
        ]);
    }

    /**
     * Simpan batch perubahan (posisi kartu + relasi atasan) dari sesi editing di canvas.
     * Hanya HR (divisi 5) atau Direksi (divisi 9) yang boleh menulis.
     */
    public function save(Request $request)
    {
        $actor = auth()->guard('api')->user();
        $actor?->load('userData');
        $user = $actor?->userData;

        $isHR = $user && ((string) $user->divisi === '5');
        $isDireksi = $user && ((string) $user->divisi === '9');

        if (!$isHR && !$isDireksi) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya HR atau Direksi yang boleh mengubah struktur organisasi.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'nodes' => 'required|array|min:1',
            'nodes.*.id' => 'required|integer',
            'nodes.*.posisi_x' => 'nullable|numeric',
            'nodes.*.posisi_y' => 'nullable|numeric',
            'nodes.*.approval' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        $nodes = collect($request->input('nodes'));

        // Self-approval: tolak sebelum cek apa pun lagi
        $selfApproval = $nodes->first(fn ($n) => !empty($n['approval']) && (int) $n['approval'] === (int) $n['id']);
        if ($selfApproval) {
            return response()->json([
                'success' => false,
                'message' => "Karyawan id {$selfApproval['id']} tidak boleh jadi atasan diri sendiri.",
            ], 422);
        }

        $nodeIds = $nodes->pluck('id')->map(fn ($id) => (int) $id)->all();
        $approvalIds = $nodes->pluck('approval')->filter()->map(fn ($id) => (int) $id)->unique()->all();
        $allReferencedIds = array_unique(array_merge($nodeIds, $approvalIds));

        $existingActive = HrKaryawan::whereIn('id', $allReferencedIds)
            ->where('status', '!=', 'N')
            ->pluck('id')
            ->all();

        $missing = array_diff($allReferencedIds, $existingActive);
        if (!empty($missing)) {
            return response()->json([
                'success' => false,
                'message' => 'Ada karyawan yang tidak ditemukan atau sudah nonaktif: ' . implode(', ', $missing),
            ], 422);
        }

        // Bangun map id => approval gabungan (state DB + perubahan di batch) utk cek cycle
        $currentMap = HrKaryawan::where('status', '!=', 'N')
            ->pluck('approval', 'id')
            ->map(fn ($v) => $v ? (int) $v : null)
            ->all();

        $mergedMap = $currentMap;
        foreach ($nodes as $node) {
            $mergedMap[(int) $node['id']] = !empty($node['approval']) ? (int) $node['approval'] : null;
        }

        foreach ($nodes as $node) {
            $childId = (int) $node['id'];
            $newParentId = !empty($node['approval']) ? (int) $node['approval'] : null;

            $oldParentId = $currentMap[$childId] ?? null;
            if ($newParentId === null || $newParentId === $oldParentId) {
                continue; // tidak ada perubahan relasi atasan utk node ini
            }

            $cursor = $newParentId;
            $hops = 0;
            while ($cursor !== null && $hops < 500) {
                if ($cursor === $childId) {
                    return response()->json([
                        'success' => false,
                        'message' => "Perubahan ditolak: menjadikan karyawan id {$newParentId} sebagai atasan id {$childId} akan membuat lingkaran (id {$childId} adalah leluhur dari id {$newParentId}).",
                    ], 422);
                }
                $cursor = $mergedMap[$cursor] ?? null;
                $hops++;
            }
        }

        DB::transaction(function () use ($nodes) {
            foreach ($nodes as $node) {
                $karyawan = HrKaryawan::find((int) $node['id']);
                if (!$karyawan) {
                    continue;
                }
                $karyawan->posisi_x = $node['posisi_x'] ?? $karyawan->posisi_x;
                $karyawan->posisi_y = $node['posisi_y'] ?? $karyawan->posisi_y;
                $karyawan->approval = !empty($node['approval']) ? (int) $node['approval'] : null;
                $karyawan->update_at = now()->format('Y-m-d H:i:s');
                $karyawan->save();
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Struktur organisasi berhasil disimpan.',
        ]);
    }
}

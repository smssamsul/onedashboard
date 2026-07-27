<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HrKaryawan;
use App\Models\Task;
use App\Models\TaskPersetujuan;
use App\Models\TaskRiwayat;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class TaskController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * hr_karyawan milik user yang sedang login.
     */
    private function currentKaryawan()
    {
        $userLogin = auth('api')->user();
        $userLogin->load('userData');
        $user = $userLogin->userData;

        return HrKaryawan::where('user_id', $user->id)->first();
    }

    private function withRelations()
    {
        return [
            'pemilik:id,nama',
            'pembuat:id,nama',
            'persetujuan.approver:id,nama',
        ];
    }

    /**
     * GET /task — task saya (saya sebagai pemilik/pengerja)
     */
    public function index()
    {
        $karyawan = $this->currentKaryawan();
        if (!$karyawan) {
            return response()->json(['success' => false, 'message' => 'Data karyawan tidak ditemukan'], 404);
        }

        $tasks = Task::where('hr_karyawan_id', $karyawan->id)
            ->with($this->withRelations())
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['success' => true, 'data' => $tasks]);
    }

    /**
     * GET /task/tim — task milik bawahan langsung saya
     */
    public function tim()
    {
        $karyawan = $this->currentKaryawan();
        if (!$karyawan) {
            return response()->json(['success' => false, 'message' => 'Data karyawan tidak ditemukan'], 404);
        }

        $bawahanIds = HrKaryawan::where('approval', $karyawan->id)->pluck('id');

        $tasks = Task::whereIn('hr_karyawan_id', $bawahanIds)
            ->with($this->withRelations())
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['success' => true, 'data' => $tasks]);
    }

    /**
     * GET /task/menunggu-approval-saya — task_persetujuan yang jenjang aktifnya saya
     */
    public function menungguApprovalSaya()
    {
        $karyawan = $this->currentKaryawan();
        if (!$karyawan) {
            return response()->json(['success' => false, 'message' => 'Data karyawan tidak ditemukan'], 404);
        }

        $persetujuan = TaskPersetujuan::where('hr_karyawan_id', $karyawan->id)
            ->where('status', 'menunggu')
            ->with(['task.pemilik:id,nama', 'task.pembuat:id,nama'])
            ->get()
            ->filter(function ($p) {
                $jenjangAktif = TaskPersetujuan::where('task_id', $p->task_id)
                    ->where('status', 'menunggu')
                    ->min('jenjang');
                return $p->jenjang == $jenjangAktif;
            })
            ->values();

        return response()->json(['success' => true, 'data' => $persetujuan]);
    }

    /**
     * Task yang boleh saya lihat di timeline/laporan: punya saya sendiri
     * + punya bawahan langsung. Task yang masih ditolak persetujuan tidak
     * ikut karena tidak pernah jadi kerjaan nyata.
     */
    private function taskTerlihat($karyawanId)
    {
        $bawahanIds = HrKaryawan::where('approval', $karyawanId)->pluck('id')->all();
        $ids = array_merge([$karyawanId], $bawahanIds);

        return Task::whereIn('hr_karyawan_id', $ids)
            ->where(function ($q) {
                $q->whereNull('status_persetujuan')
                    ->orWhere('status_persetujuan', '!=', 'ditolak');
            });
    }

    /**
     * GET /task/timeline?dari=YYYY-MM-DD&sampai=YYYY-MM-DD
     * Task yang rentang tanggalnya bersinggungan dengan jendela yang diminta.
     */
    public function timeline(Request $request)
    {
        $karyawan = $this->currentKaryawan();
        if (!$karyawan) {
            return response()->json(['success' => false, 'message' => 'Data karyawan tidak ditemukan'], 404);
        }

        $dari = $request->filled('dari') ? Carbon::parse($request->dari) : Carbon::today()->subDays(14);
        $sampai = $request->filled('sampai') ? Carbon::parse($request->sampai) : Carbon::today()->addDays(45);

        $tasks = $this->taskTerlihat($karyawan->id)
            ->with($this->withRelations())
            ->where(function ($q) use ($dari, $sampai) {
                // Bar terlihat kalau rentangnya menyentuh jendela. Task tanpa
                // tenggat dinilai dari tanggal mulainya saja (digambar sebagai milestone).
                $q->where(function ($sub) use ($dari, $sampai) {
                    $sub->whereNotNull('tenggat')
                        ->whereDate('tenggat', '>=', $dari)
                        ->whereDate('tanggal_mulai', '<=', $sampai);
                })->orWhere(function ($sub) use ($dari, $sampai) {
                    $sub->whereNull('tenggat')
                        ->whereDate('tanggal_mulai', '>=', $dari)
                        ->whereDate('tanggal_mulai', '<=', $sampai);
                });
            })
            ->orderBy('tanggal_mulai')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $tasks,
            'meta' => [
                'dari' => $dari->toDateString(),
                'sampai' => $sampai->toDateString(),
            ],
        ]);
    }

    /**
     * GET /task/laporan?hari=7
     * Ringkasan untuk halaman laporan: kartu aktivitas N hari terakhir,
     * komposisi status, dan feed riwayat terbaru.
     */
    public function laporan(Request $request)
    {
        $karyawan = $this->currentKaryawan();
        if (!$karyawan) {
            return response()->json(['success' => false, 'message' => 'Data karyawan tidak ditemukan'], 404);
        }

        $hari = (int) $request->input('hari', 7);
        $hari = max(1, min($hari, 90));
        $sejak = Carbon::today()->subDays($hari);

        $idsTerlihat = (clone $this->taskTerlihat($karyawan->id))->pluck('id');

        $selesai = (clone $this->taskTerlihat($karyawan->id))
            ->where('status', 'selesai')
            ->whereDate('tanggal_selesai', '>=', $sejak)
            ->count();

        // "Diperbarui" dihitung dari riwayat, bukan updated_at, supaya yang
        // terhitung memang aksi orang (ubah status/progres/tanggal).
        $diperbarui = TaskRiwayat::whereIn('task_id', $idsTerlihat)
            ->whereIn('aksi', ['status_diubah', 'progres_diperbarui', 'tanggal_diubah'])
            ->where('created_at', '>=', $sejak)
            ->distinct('task_id')
            ->count('task_id');

        $baru = (clone $this->taskTerlihat($karyawan->id))
            ->whereDate('created_at', '>=', $sejak)
            ->count();

        $jatuhTempo = (clone $this->taskTerlihat($karyawan->id))
            ->where('status', '!=', 'selesai')
            ->whereNotNull('tenggat')
            ->whereDate('tenggat', '>=', Carbon::today())
            ->whereDate('tenggat', '<=', Carbon::today()->addDays($hari))
            ->count();

        $telat = (clone $this->taskTerlihat($karyawan->id))
            ->where('status', '!=', 'selesai')
            ->whereNotNull('tenggat')
            ->whereDate('tenggat', '<', Carbon::today())
            ->count();

        $perStatus = (clone $this->taskTerlihat($karyawan->id))
            ->select('status', DB::raw('count(*) as jumlah'))
            ->groupBy('status')
            ->pluck('jumlah', 'status');

        $menungguApproval = (clone $this->taskTerlihat($karyawan->id))
            ->where('status_persetujuan', 'menunggu')
            ->count();

        $total = (clone $this->taskTerlihat($karyawan->id))->count();
        $jumlahSelesai = (int) ($perStatus['selesai'] ?? 0);

        $aktivitas = TaskRiwayat::whereIn('task_id', $idsTerlihat)
            ->with(['pelaku:id,nama', 'task:id,judul'])
            ->orderByDesc('created_at')
            ->limit(15)
            ->get();

        // Beban per orang — berguna buat atasan lihat siapa yang menumpuk task.
        $perPemilik = (clone $this->taskTerlihat($karyawan->id))
            ->with('pemilik:id,nama')
            ->get()
            ->groupBy('hr_karyawan_id')
            ->map(function ($rows) {
                return [
                    'nama' => optional($rows->first()->pemilik)->nama ?? '-',
                    'total' => $rows->count(),
                    'selesai' => $rows->where('status', 'selesai')->count(),
                    'berjalan' => $rows->where('status', 'berjalan')->count(),
                    'belum_mulai' => $rows->where('status', 'belum_mulai')->count(),
                    'telat' => $rows->filter(function ($t) {
                        return $t->status !== 'selesai' && $t->tenggat && $t->tenggat->lt(Carbon::today());
                    })->count(),
                ];
            })
            ->sortByDesc('total')
            ->values();

        return response()->json([
            'success' => true,
            'data' => [
                'rentang_hari' => $hari,
                'kartu' => [
                    'selesai' => $selesai,
                    'diperbarui' => $diperbarui,
                    'baru' => $baru,
                    'jatuh_tempo' => $jatuhTempo,
                ],
                'status' => [
                    'belum_mulai' => (int) ($perStatus['belum_mulai'] ?? 0),
                    'berjalan' => (int) ($perStatus['berjalan'] ?? 0),
                    'selesai' => $jumlahSelesai,
                    'telat' => $telat,
                    'menunggu_approval' => $menungguApproval,
                    'total' => $total,
                    'persen_selesai' => $total > 0 ? (int) round($jumlahSelesai / $total * 100) : 0,
                ],
                'per_pemilik' => $perPemilik,
                'aktivitas' => $aktivitas,
            ],
        ]);
    }

    /**
     * GET /task/{id}
     */
    public function show($id)
    {
        $task = Task::with(array_merge($this->withRelations(), ['riwayat.pelaku:id,nama']))->find($id);

        if (!$task) {
            return response()->json(['success' => false, 'message' => 'Task tidak ditemukan'], 404);
        }

        return response()->json(['success' => true, 'data' => $task]);
    }

    /**
     * POST /task
     * Menentukan apakah task langsung aktif atau butuh rantai approval berjenjang.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'hr_karyawan_id' => 'required|integer|exists:hr_karyawan,id',
            'judul' => 'required|string|max:200',
            'deskripsi' => 'nullable|string',
            'tanggal_mulai' => 'nullable|date',
            'tenggat' => 'nullable|date|after_or_equal:tanggal_mulai',
        ], [
            'tenggat.after_or_equal' => 'Target selesai tidak boleh lebih awal dari tanggal mulai.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $pembuat = $this->currentKaryawan();
        if (!$pembuat) {
            return response()->json(['success' => false, 'message' => 'Data karyawan tidak ditemukan'], 404);
        }

        $pemilik = HrKaryawan::find($request->hr_karyawan_id);
        $isSelf = $pembuat->id == $pemilik->id;
        $isAtasanLangsung = $pemilik->approval && (int) $pemilik->approval === (int) $pembuat->id;
        $butuhApproval = !$isSelf && !$isAtasanLangsung;

        $task = DB::transaction(function () use ($request, $pembuat, $pemilik, $butuhApproval) {
            $task = Task::create([
                'hr_karyawan_id' => $pemilik->id,
                'dibuat_oleh' => $pembuat->id,
                'judul' => $request->judul,
                'deskripsi' => $request->deskripsi,
                'status' => 'belum_mulai',
                'persentase_penyelesaian' => 0,
                'status_persetujuan' => $butuhApproval ? 'menunggu' : null,
                // Tanpa tanggal mulai eksplisit, anggap task dimulai hari ini —
                // supaya selalu punya titik awal yang bisa digambar di timeline.
                'tanggal_mulai' => $request->tanggal_mulai ?: now()->toDateString(),
                'tenggat' => $request->tenggat,
            ]);

            TaskRiwayat::create([
                'task_id' => $task->id,
                'hr_karyawan_id' => $pembuat->id,
                'aksi' => 'dibuat',
                'keterangan' => $butuhApproval
                    ? 'Task dibuat, menunggu rantai persetujuan.'
                    : 'Task dibuat dan langsung aktif.',
                'created_at' => now(),
            ]);

            if ($butuhApproval) {
                $jenjang = 1;
                $approverId = $pemilik->approval;

                while ($approverId) {
                    TaskPersetujuan::create([
                        'task_id' => $task->id,
                        'hr_karyawan_id' => $approverId,
                        'jenjang' => $jenjang,
                        'status' => 'menunggu',
                    ]);
                    $approverId = HrKaryawan::where('id', $approverId)->value('approval');
                    $jenjang++;
                }

                // Kalau pemilik task tidak punya rantai atasan sama sekali,
                // tidak ada yang bisa approve -> anggap langsung aktif.
                if ($jenjang === 1) {
                    $task->update(['status_persetujuan' => null]);
                }
            }

            return $task;
        });

        return response()->json([
            'success' => true,
            'message' => 'Task berhasil dibuat',
            'data' => $task->load($this->withRelations())
        ], 201);
    }

    /**
     * PUT /task/{id}
     * Update metadata + status/progres. Status/progres tidak bisa diubah
     * selama task masih menunggu/ditolak persetujuan.
     */
    public function update(Request $request, $id)
    {
        $task = Task::find($id);
        if (!$task) {
            return response()->json(['success' => false, 'message' => 'Task tidak ditemukan'], 404);
        }

        $validator = Validator::make($request->all(), [
            'judul' => 'sometimes|required|string|max:200',
            'deskripsi' => 'nullable|string',
            'tanggal_mulai' => 'nullable|date',
            'tenggat' => 'nullable|date',
            'status' => 'sometimes|required|in:belum_mulai,berjalan,selesai',
            'persentase_penyelesaian' => 'sometimes|required|integer|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        if (($request->has('status') || $request->has('persentase_penyelesaian'))
            && in_array($task->status_persetujuan, ['menunggu', 'ditolak'])) {
            return response()->json([
                'success' => false,
                'message' => 'Task belum aktif — masih menunggu atau ditolak persetujuan.'
            ], 422);
        }

        // Bandingkan terhadap nilai yang akan berlaku setelah update, bukan cuma
        // yang dikirim — kalau hanya salah satu tanggal diubah, pasangannya diambil
        // dari data lama supaya rentangnya tetap tidak terbalik.
        $mulaiBaru = $request->has('tanggal_mulai')
            ? $request->tanggal_mulai
            : optional($task->tanggal_mulai)->toDateString();
        $tenggatBaru = $request->has('tenggat')
            ? $request->tenggat
            : optional($task->tenggat)->toDateString();

        if ($mulaiBaru && $tenggatBaru && strtotime($tenggatBaru) < strtotime($mulaiBaru)) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => ['tenggat' => ['Target selesai tidak boleh lebih awal dari tanggal mulai.']]
            ], 422);
        }

        $pelaku = $this->currentKaryawan();

        DB::transaction(function () use ($request, $task, $pelaku) {
            if ($request->filled('judul')) {
                $task->judul = $request->judul;
            }
            if ($request->has('deskripsi')) {
                $task->deskripsi = $request->deskripsi;
            }
            // Perubahan tanggal dicatat di riwayat karena menggeser bar di timeline
            // orang lain juga — perlu jejak siapa yang menggeser.
            if ($request->has('tanggal_mulai') && $request->tanggal_mulai != optional($task->tanggal_mulai)->toDateString()) {
                $lama = optional($task->tanggal_mulai)->format('d-m-Y') ?: 'kosong';
                $task->tanggal_mulai = $request->tanggal_mulai;
                TaskRiwayat::create([
                    'task_id' => $task->id,
                    'hr_karyawan_id' => $pelaku->id,
                    'aksi' => 'tanggal_diubah',
                    'keterangan' => "Tanggal mulai diubah dari {$lama} ke "
                        . ($request->tanggal_mulai ? date('d-m-Y', strtotime($request->tanggal_mulai)) : 'kosong') . '.',
                    'created_at' => now(),
                ]);
            }

            if ($request->has('tenggat') && $request->tenggat != optional($task->tenggat)->toDateString()) {
                $lama = optional($task->tenggat)->format('d-m-Y') ?: 'kosong';
                $task->tenggat = $request->tenggat;
                TaskRiwayat::create([
                    'task_id' => $task->id,
                    'hr_karyawan_id' => $pelaku->id,
                    'aksi' => 'tanggal_diubah',
                    'keterangan' => "Target selesai diubah dari {$lama} ke "
                        . ($request->tenggat ? date('d-m-Y', strtotime($request->tenggat)) : 'kosong') . '.',
                    'created_at' => now(),
                ]);
            }

            if ($request->filled('status') && $request->status !== $task->status) {
                $statusLama = $task->status;
                $task->status = $request->status;
                if ($request->status === 'selesai') {
                    $task->tanggal_selesai = now();
                    $task->persentase_penyelesaian = 100;
                }
                TaskRiwayat::create([
                    'task_id' => $task->id,
                    'hr_karyawan_id' => $pelaku->id,
                    'aksi' => 'status_diubah',
                    'keterangan' => "Status diubah dari \"{$statusLama}\" ke \"{$request->status}\".",
                    'created_at' => now(),
                ]);
            }

            if ($request->filled('persentase_penyelesaian') && (int) $request->persentase_penyelesaian !== (int) $task->persentase_penyelesaian) {
                $progresLama = $task->persentase_penyelesaian;
                $task->persentase_penyelesaian = $request->persentase_penyelesaian;
                TaskRiwayat::create([
                    'task_id' => $task->id,
                    'hr_karyawan_id' => $pelaku->id,
                    'aksi' => 'progres_diperbarui',
                    'keterangan' => "Progres diperbarui dari {$progresLama}% ke {$request->persentase_penyelesaian}%.",
                    'created_at' => now(),
                ]);
            }

            $task->save();
        });

        return response()->json([
            'success' => true,
            'message' => 'Task berhasil diupdate',
            'data' => $task->fresh($this->withRelations())
        ]);
    }

    /**
     * POST /task/{id}/approve — approve jenjang aktif (jenjang menunggu terkecil)
     */
    public function approve(Request $request, $id)
    {
        return $this->putuskanJenjang($request, $id, 'disetujui');
    }

    /**
     * POST /task/{id}/reject — tolak jenjang aktif, membatalkan jenjang setelahnya
     */
    public function reject(Request $request, $id)
    {
        return $this->putuskanJenjang($request, $id, 'ditolak');
    }

    private function putuskanJenjang(Request $request, $id, string $keputusan)
    {
        $task = Task::find($id);
        if (!$task) {
            return response()->json(['success' => false, 'message' => 'Task tidak ditemukan'], 404);
        }

        $approver = $this->currentKaryawan();
        if (!$approver) {
            return response()->json(['success' => false, 'message' => 'Data karyawan tidak ditemukan'], 404);
        }

        $jenjangAktif = TaskPersetujuan::where('task_id', $task->id)
            ->where('status', 'menunggu')
            ->orderBy('jenjang')
            ->first();

        if (!$jenjangAktif) {
            return response()->json(['success' => false, 'message' => 'Tidak ada persetujuan yang menunggu untuk task ini'], 422);
        }

        if ((int) $jenjangAktif->hr_karyawan_id !== (int) $approver->id) {
            return response()->json(['success' => false, 'message' => 'Belum giliran Anda menyetujui task ini'], 403);
        }

        DB::transaction(function () use ($task, $jenjangAktif, $approver, $request, $keputusan) {
            $jenjangAktif->update([
                'status' => $keputusan,
                'catatan' => $request->catatan,
                'diputuskan_pada' => now(),
            ]);

            TaskRiwayat::create([
                'task_id' => $task->id,
                'hr_karyawan_id' => $approver->id,
                'aksi' => $keputusan === 'disetujui' ? 'disetujui_jenjang' : 'ditolak',
                'keterangan' => "Jenjang {$jenjangAktif->jenjang} {$keputusan}"
                    . ($request->catatan ? ": {$request->catatan}" : '.'),
                'created_at' => now(),
            ]);

            if ($keputusan === 'ditolak') {
                // Batalkan sisa jenjang yang belum diputuskan — rantai berhenti.
                TaskPersetujuan::where('task_id', $task->id)
                    ->where('status', 'menunggu')
                    ->update(['status' => 'ditolak', 'catatan' => 'Dibatalkan otomatis karena ditolak di jenjang sebelumnya']);

                $task->update(['status_persetujuan' => 'ditolak']);
            } else {
                $masihMenunggu = TaskPersetujuan::where('task_id', $task->id)
                    ->where('status', 'menunggu')
                    ->exists();

                if (!$masihMenunggu) {
                    $task->update(['status_persetujuan' => 'disetujui']);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => $keputusan === 'disetujui' ? 'Task disetujui' : 'Task ditolak',
            'data' => $task->fresh($this->withRelations())
        ]);
    }
}

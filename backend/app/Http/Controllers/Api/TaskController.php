<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HrKaryawan;
use App\Models\Task;
use App\Models\TaskPersetujuan;
use App\Models\TaskRiwayat;
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
            'tenggat' => 'nullable|date',
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

        $pelaku = $this->currentKaryawan();

        DB::transaction(function () use ($request, $task, $pelaku) {
            if ($request->filled('judul')) {
                $task->judul = $request->judul;
            }
            if ($request->has('deskripsi')) {
                $task->deskripsi = $request->deskripsi;
            }
            if ($request->has('tenggat')) {
                $task->tenggat = $request->tenggat;
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

<?php

namespace App\Http\Controllers\Api\Hr;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\HrAbsensi;
use App\Models\HrKaryawan;
use App\Models\HrShift;
use App\Models\HrSetting;
use App\Models\TodoList;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;

class HrAbsensiController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $query = HrAbsensi::with('karyawan_rel');

        if ($request->has('karyawan') && $request->karyawan) {
            $query->where('karyawan', $request->karyawan);
        }

        if ($request->has('tanggal_mulai') && $request->has('tanggal_akhir') && 
            $request->tanggal_mulai && $request->tanggal_akhir) {
            $query->whereBetween('tanggal', [
                Carbon::parse($request->tanggal_mulai)->format('Y-m-d'),
                Carbon::parse($request->tanggal_akhir)->format('Y-m-d')
            ]);
        }
        elseif ($request->has('tanggal') && $request->tanggal) {
            $query->where('tanggal', $request->tanggal);
        }

        if ($request->has('bulan') && $request->bulan) {
            $bulanFormat = Carbon::parse($request->bulan)->format('Y-m');
            $query->where('tanggal', 'like', $bulanFormat . '%');
        }

        if ($request->has('status_absensi') && $request->status_absensi) {
            $query->where('status_absensi', $request->status_absensi);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        } else {
            $query->where('status', '!=', 'N');
        }

        if ($request->has('all') && $request->all == 'true') {
            $absensi = $query->orderBy('tanggal', 'desc')->orderBy('id', 'desc')->get();
            
            return response()->json([
                'success' => true,
                'data' => $absensi,
                'total' => $absensi->count()
            ]);
        }

        $perPage = $request->get('per_page', 15);
        $absensi = $query->orderBy('tanggal', 'desc')->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $absensi->items(),
            'pagination' => [
                'current_page' => $absensi->currentPage(),
                'last_page' => $absensi->lastPage(),
                'per_page' => $absensi->perPage(),
                'total' => $absensi->total(),
            ]
        ]);
    }

    public function getByCurrentUser(Request $request)
    {
        $user = auth()->guard('api')->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 401);
        }

        $karyawan = HrKaryawan::where('user_id', $user->user)
            ->where('status', '!=', 'N')
            ->first();

        if (!$karyawan) {
            return response()->json([
                'success' => false,
                'message' => 'Karyawan tidak ditemukan untuk user ini'
            ], 404);
        }

        $query = HrAbsensi::with('karyawan_rel')
            ->where('karyawan', $karyawan->id);

        if ($request->has('tanggal_mulai') && $request->has('tanggal_akhir') && 
            $request->tanggal_mulai && $request->tanggal_akhir) {
            $query->whereBetween('tanggal', [
                Carbon::parse($request->tanggal_mulai)->format('Y-m-d'),
                Carbon::parse($request->tanggal_akhir)->format('Y-m-d')
            ]);
        }
        elseif ($request->has('tanggal') && $request->tanggal) {
            $query->where('tanggal', $request->tanggal);
        }

        if ($request->has('bulan') && $request->bulan) {
            $bulanFormat = Carbon::parse($request->bulan)->format('Y-m');
            $query->where('tanggal', 'like', $bulanFormat . '%');
        }

        if ($request->has('status_absensi') && $request->status_absensi) {
            $query->where('status_absensi', $request->status_absensi);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        } else {
            $query->where('status', '!=', 'N');
        }

        if ($request->has('all') && $request->all == 'true') {
            $absensi = $query->orderBy('tanggal', 'desc')->orderBy('id', 'desc')->get();
            
            return response()->json([
                'success' => true,
                'data' => $absensi,
                'total' => $absensi->count()
            ]);
        }

        $perPage = $request->get('per_page', 15);
        $absensi = $query->orderBy('tanggal', 'desc')->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $absensi->items(),
            'pagination' => [
                'current_page' => $absensi->currentPage(),
                'last_page' => $absensi->lastPage(),
                'per_page' => $absensi->perPage(),
                'total' => $absensi->total(),
            ]
        ]);
    }

    public function show($id)
    {
        if (!is_numeric($id) || (int)$id != $id) {
            return response()->json([
                'success' => false,
                'message' => 'ID absensi tidak valid'
            ], 400);
        }

        $absensi = HrAbsensi::with('karyawan_rel')->find($id);

        if (!$absensi) {
            return response()->json([
                'success' => false,
                'message' => 'Data absensi tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $absensi
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'karyawan' => 'required|exists:hr_karyawan,id',
            'tanggal' => 'required|date',
            'check_in' => 'nullable|string|max:20',
            'check_out' => 'nullable|string|max:20',
            'shift' => 'nullable|integer',
            'status_absensi' => 'nullable|string|max:30',
            'check_in_photo' => 'nullable|string',
            'check_out_photo' => 'nullable|string',
            'lat_check_in' => 'nullable|string|max:60',
            'long_check_in' => 'nullable|string|max:60',
            'lat_check_out' => 'nullable|string|max:60',
            'long_check_out' => 'nullable|string|max:60',
            'notes' => 'nullable|string',
            'emosi' => 'nullable|string|max:50|in:joyful,happy,relaxed,sad,angry',
            'status' => 'nullable|string|max:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        if ($request->has('lat_check_in') && $request->has('long_check_in') && 
            $request->lat_check_in && $request->long_check_in) {
            $locationCheck = $this->validateLocation(
                $request->lat_check_in,
                $request->long_check_in
            );
            
            if (!$locationCheck['valid']) {
                return response()->json([
                    'success' => false,
                    'message' => $locationCheck['message']
                ], 422);
            }
        }

        $checkInPhoto = $request->check_in_photo;
        $checkOutPhoto = $request->check_out_photo;

        if ($request->hasFile('check_in_photo_file')) {
            $checkInPhoto = $this->uploadPhoto($request->file('check_in_photo_file'), 'check_in');
        }

        if ($request->hasFile('check_out_photo_file')) {
            $checkOutPhoto = $this->uploadPhoto($request->file('check_out_photo_file'), 'check_out');
        }

        $tanggal = $request->tanggal;
        if ($tanggal) {
            try {
                $tanggal = Carbon::parse($tanggal)->format('Y-m-d');
            } catch (\Exception $e) {
                $tanggal = Carbon::today()->format('Y-m-d');
            }
        }

        $absensi = HrAbsensi::create([
            'karyawan' => $request->karyawan,
            'tanggal' => $tanggal,
            'check_in' => $request->check_in,
            'check_out' => $request->check_out,
            'shift' => $request->shift,
            'status_absensi' => $request->status_absensi ?? 'Hadir',
            'check_in_photo' => $checkInPhoto,
            'check_out_photo' => $checkOutPhoto,
            'lat_check_in' => $request->lat_check_in,
            'long_check_in' => $request->long_check_in,
            'lat_check_out' => $request->lat_check_out,
            'long_check_out' => $request->long_check_out,
            'notes' => $request->notes,
            'emosi' => $request->emosi,
            'status' => $request->status ?? '1',
            'create_at' => now()->format('Y-m-d H:i:s'),
        ]);

        $absensi->load('karyawan_rel');

        return response()->json([
            'success' => true,
            'message' => 'Data absensi berhasil ditambahkan',
            'data' => $absensi
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $absensi = HrAbsensi::find($id);

        if (!$absensi) {
            return response()->json([
                'success' => false,
                'message' => 'Data absensi tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'karyawan' => 'nullable|exists:hr_karyawan,id',
            'tanggal' => 'nullable|date',
            'check_in' => 'nullable|string|max:20',
            'check_out' => 'nullable|string|max:20',
            'shift' => 'nullable|integer',
            'status_absensi' => 'nullable|string|max:30',
            'check_in_photo' => 'nullable|string',
            'check_out_photo' => 'nullable|string',
            'lat_check_in' => 'nullable|string|max:60',
            'long_check_in' => 'nullable|string|max:60',
            'lat_check_out' => 'nullable|string|max:60',
            'long_check_out' => 'nullable|string|max:60',
            'notes' => 'nullable|string',
            'status' => 'nullable|string|max:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $checkInPhoto = $absensi->check_in_photo;
        $checkOutPhoto = $absensi->check_out_photo;

        if ($request->hasFile('check_in_photo_file')) {
            if ($checkInPhoto && Storage::disk('public')->exists($checkInPhoto)) {
                Storage::disk('public')->delete($checkInPhoto);
            }
            $checkInPhoto = $this->uploadPhoto($request->file('check_in_photo_file'), 'check_in');
        } elseif ($request->has('check_in_photo')) {
            $checkInPhoto = $request->check_in_photo;
        }

        if ($request->hasFile('check_out_photo_file')) {
            if ($checkOutPhoto && Storage::disk('public')->exists($checkOutPhoto)) {
                Storage::disk('public')->delete($checkOutPhoto);
            }
            $checkOutPhoto = $this->uploadPhoto($request->file('check_out_photo_file'), 'check_out');
        } elseif ($request->has('check_out_photo')) {
            $checkOutPhoto = $request->check_out_photo;
        }

        if ($request->has('tanggal') && $request->tanggal) {
            try {
                $absensi->tanggal = Carbon::parse($request->tanggal)->format('Y-m-d');
            } catch (\Exception $e) {
            }
        }

        $absensi->karyawan = $request->karyawan ?? $absensi->karyawan;
        $absensi->check_in = $request->check_in ?? $absensi->check_in;
        $absensi->check_out = $request->check_out ?? $absensi->check_out;
        $absensi->shift = $request->shift ?? $absensi->shift;
        $absensi->status_absensi = $request->status_absensi ?? $absensi->status_absensi;
        $absensi->check_in_photo = $checkInPhoto;
        $absensi->check_out_photo = $checkOutPhoto;
        $absensi->lat_check_in = $request->lat_check_in ?? $absensi->lat_check_in;
        $absensi->long_check_in = $request->long_check_in ?? $absensi->long_check_in;
        $absensi->lat_check_out = $request->lat_check_out ?? $absensi->lat_check_out;
        $absensi->long_check_out = $request->long_check_out ?? $absensi->long_check_out;
        $absensi->notes = $request->notes ?? $absensi->notes;
        $absensi->status = $request->status ?? $absensi->status;
        $absensi->update_at = now()->format('Y-m-d H:i:s');
        $absensi->save();

        $absensi->load('karyawan_rel');

        return response()->json([
            'success' => true,
            'message' => 'Data absensi berhasil diupdate',
            'data' => $absensi
        ]);
    }

    public function destroy($id)
    {
        $absensi = HrAbsensi::find($id);

        if (!$absensi) {
            return response()->json([
                'success' => false,
                'message' => 'Data absensi tidak ditemukan'
            ], 404);
        }

        if ($absensi->check_in_photo && Storage::disk('public')->exists($absensi->check_in_photo)) {
            Storage::disk('public')->delete($absensi->check_in_photo);
        }
        if ($absensi->check_out_photo && Storage::disk('public')->exists($absensi->check_out_photo)) {
            Storage::disk('public')->delete($absensi->check_out_photo);
        }

        $absensi->status = 'N';
        $absensi->update_at = now()->format('Y-m-d H:i:s');
        $absensi->save();

        return response()->json([
            'success' => true,
            'message' => 'Data absensi berhasil dihapus'
        ]);
    }

    public function checkIn(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'karyawan' => 'required|exists:hr_karyawan,id',
            'check_in_photo' => 'required|image|mimes:jpeg,png,jpg|max:2048',
            'lat_check_in' => 'nullable|string|max:60',
            'long_check_in' => 'nullable|string|max:60',
            'notes' => 'nullable|string',
            'emosi' => 'nullable|string|max:50|in:joyful,happy,relaxed,sad,angry',
            'todo_ids' => 'nullable|array',
            'todo_ids.*' => 'nullable|integer|exists:todo_list,id',
            'manual_todos' => 'nullable|array',
            'manual_todos.*' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        if (!$request->has('lat_check_in') || !$request->has('long_check_in') || 
            empty($request->lat_check_in) || empty($request->long_check_in)) {
            return response()->json([
                'success' => false,
                'message' => 'Lokasi wajib diisi untuk melakukan check in. Pastikan GPS/lokasi sudah diaktifkan.'
            ], 422);
        }

        $locationCheck = $this->validateLocation(
            $request->lat_check_in,
            $request->long_check_in
        );

        if (!$locationCheck['valid']) {
            return response()->json([
                'success' => false,
                'message' => $locationCheck['message']
            ], 422);
        }

        $photoPath = $this->uploadPhoto($request->file('check_in_photo'), 'check_in');

        $karyawan = HrKaryawan::with('shift_rel')->find($request->karyawan);
        $statusAbsensi = 'Hadir';
        $shiftId = null;

        if ($karyawan && $karyawan->shift_rel) {
            $shift = $karyawan->shift_rel;
            $shiftId = $shift->id;

            if (!$shift->is_flexible) {
                $checkInTime = now()->format('H:i:s');
                $startTime = $shift->start_time;

                if ($checkInTime > $startTime) {
                    $statusAbsensi = 'Telat';
                }
            }
        }

        $today = Carbon::today()->format('Y-m-d');
        $absensi = HrAbsensi::where('karyawan', $request->karyawan)
            ->where('tanggal', $today)
            ->where('status', '!=', 'N')
            ->first();

        if ($absensi) {
            $absensi->check_in = now()->format('H:i:s');
            $absensi->check_in_photo = $photoPath;
            $absensi->lat_check_in = $request->lat_check_in ?? null;
            $absensi->long_check_in = $request->long_check_in ?? null;
            $absensi->notes = $request->notes ?? $absensi->notes;
            $absensi->emosi = $request->emosi ?? $absensi->emosi;
            $absensi->status_absensi = $statusAbsensi;
            $absensi->shift = $shiftId;
            $absensi->update_at = now()->format('Y-m-d H:i:s');
            $absensi->save();
        } else {
            $absensi = HrAbsensi::create([
                'karyawan' => $request->karyawan,
                'tanggal' => $today,
                'check_in' => now()->format('H:i:s'),
                'check_in_photo' => $photoPath,
                'lat_check_in' => $request->lat_check_in ?? null,
                'long_check_in' => $request->long_check_in ?? null,
                'status_absensi' => $statusAbsensi,
                'shift' => $shiftId,
                'notes' => $request->notes,
                'emosi' => $request->emosi,
                'status' => '1',
                'create_at' => now()->format('Y-m-d H:i:s'),
            ]);
        }

        // Simpan todo list ke tabel todo_list
        $user = auth()->guard('api')->user();
        $userId = $user->user ?? null; // User ID dari UserLogin
        
        if ($userId) {
            $today = Carbon::today();
            
            // Simpan todo yang dipilih dari list
            if ($request->has('todo_ids') && is_array($request->todo_ids)) {
                foreach ($request->todo_ids as $todoId) {
                    if ($todoId) {
                        // Update todo yang sudah ada untuk set assigned_to dan due_date
                        $existingTodo = TodoList::find($todoId);
                        if ($existingTodo) {
                            $existingTodo->assigned_to = $userId;
                            $existingTodo->due_date = $today;
                            if ($existingTodo->status === 'completed') {
                                $existingTodo->status = 'in_progress';
                            }
                            $existingTodo->save();
                        }
                    }
                }
            }
            
            // Simpan manual todo yang diinput
            if ($request->has('manual_todos') && is_array($request->manual_todos)) {
                foreach ($request->manual_todos as $todoTitle) {
                    if (!empty(trim($todoTitle))) {
                        TodoList::create([
                            'title' => trim($todoTitle),
                            'description' => null,
                            'created_by' => $userId,
                            'assigned_to' => $userId,
                            'priority' => 'medium',
                            'status' => 'in_progress',
                            'due_date' => $today,
                            'is_reminder' => false,
                        ]);
                    }
                }
            }
        }

        $absensi->load('karyawan_rel');

        return response()->json([
            'success' => true,
            'message' => 'Check in berhasil',
            'data' => $absensi
        ], 201);
    }

    public function checkOut(Request $request, $id)
    {
        $absensi = HrAbsensi::find($id);

        if (!$absensi) {
            return response()->json([
                'success' => false,
                'message' => 'Data absensi tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'check_out_photo' => 'required|image|mimes:jpeg,png,jpg|max:2048',
            'lat_check_out' => 'nullable|string|max:60',
            'long_check_out' => 'nullable|string|max:60',
            'notes' => 'nullable|string',
            'todo_statuses' => 'nullable|array',
            'todo_statuses.*.id' => 'required|integer|exists:todo_list,id',
            'todo_statuses.*.status' => 'required|in:pending,in_progress,completed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        if (!$request->has('lat_check_out') || !$request->has('long_check_out') || 
            empty($request->lat_check_out) || empty($request->long_check_out)) {
            return response()->json([
                'success' => false,
                'message' => 'Lokasi wajib diisi untuk melakukan check out. Pastikan GPS/lokasi sudah diaktifkan.'
            ], 422);
        }

        $locationCheck = $this->validateLocation(
            $request->lat_check_out,
            $request->long_check_out
        );

        if (!$locationCheck['valid']) {
            return response()->json([
                'success' => false,
                'message' => $locationCheck['message']
            ], 422);
        }

        $photoPath = $this->uploadPhoto($request->file('check_out_photo'), 'check_out');

        $absensi->check_out = now()->format('H:i:s');
        $absensi->check_out_photo = $photoPath;
        $absensi->lat_check_out = $request->lat_check_out ?? null;
        $absensi->long_check_out = $request->long_check_out ?? null;
        $absensi->notes = $request->notes ?? $absensi->notes;
        $absensi->update_at = now()->format('Y-m-d H:i:s');
        $absensi->save();

        // Update status todo list
        if ($request->has('todo_statuses') && is_array($request->todo_statuses)) {
            foreach ($request->todo_statuses as $todoStatus) {
                $todo = TodoList::find($todoStatus['id']);
                if ($todo) {
                    $todo->status = $todoStatus['status'];
                    if ($todoStatus['status'] === 'completed') {
                        $todo->completed_at = now();
                    }
                    $todo->save();
                }
            }
        }

        $absensi->load('karyawan_rel');

        return response()->json([
            'success' => true,
            'message' => 'Check out berhasil',
            'data' => $absensi
        ]);
    }

    private function uploadPhoto($file, $type = 'absensi')
    {
        $path = $file->store('hr/absensi/' . $type, 'public');
        return $path;
    }

    private function validateLocation($lat, $long)
    {
        if (empty($lat) || empty($long)) {
            return [
                'valid' => false,
                'message' => 'Lokasi wajib diisi untuk melakukan absensi'
            ];
        }

        $setting = HrSetting::first();
        
        if (!$setting) {
            return [
                'valid' => false,
                'message' => 'Setting lokasi kantor belum dikonfigurasi. Silakan hubungi admin untuk mengatur lokasi kantor terlebih dahulu.'
            ];
        }

        if (empty($setting->lat_absen) || empty($setting->long_long)) {
            return [
                'valid' => false,
                'message' => 'Koordinat lokasi kantor belum dikonfigurasi. Silakan hubungi admin.'
            ];
        }

        if (empty($setting->radius) || $setting->radius <= 0) {
            return [
                'valid' => false,
                'message' => 'Radius absensi belum dikonfigurasi. Silakan hubungi admin.'
            ];
        }

        $settingLat = (float) $setting->lat_absen;
        $settingLong = (float) $setting->long_long;
        $userLat = (float) $lat;
        $userLong = (float) $long;
        $radius = (float) $setting->radius;

        $distance = $this->calculateDistance($settingLat, $settingLong, $userLat, $userLong);

        if ($distance > $radius) {
            return [
                'valid' => false,
                'message' => "Anda berada di luar radius absensi. Jarak Anda: " . round($distance, 2) . " meter dari kantor, sedangkan batas maksimal: {$radius} meter. Silakan mendekat ke lokasi kantor untuk melakukan absensi."
            ];
        }

        return [
            'valid' => true,
            'message' => 'Lokasi valid',
            'distance' => round($distance, 2)
        ];
    }

    private function calculateDistance($lat1, $lon1, $lat2, $lon2)
    {
        $earthRadius = 6371000;

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    public function export(Request $request)
    {
        $format = $request->get('format', 'excel');

        $query = HrAbsensi::with('karyawan_rel');

        if ($request->has('karyawan') && $request->karyawan) {
            $query->where('karyawan', $request->karyawan);
        }

        if ($request->has('tanggal_mulai') && $request->has('tanggal_akhir') && 
            $request->tanggal_mulai && $request->tanggal_akhir) {
            $query->whereBetween('tanggal', [
                Carbon::parse($request->tanggal_mulai)->format('Y-m-d'),
                Carbon::parse($request->tanggal_akhir)->format('Y-m-d')
            ]);
        }
        elseif ($request->has('tanggal') && $request->tanggal) {
            $query->where('tanggal', $request->tanggal);
        }

        $query->where('status', '!=', 'N');

        $absensi = $query->orderBy('tanggal', 'desc')->orderBy('id', 'desc')->get();

        if ($format === 'excel' || $format === 'xlsx') {
            return $this->exportExcel($absensi);
        } elseif ($format === 'csv') {
            return $this->exportCsv($absensi);
        } elseif ($format === 'pdf') {
            return $this->exportPdf($absensi);
        }

        return response()->json([
            'success' => false,
            'message' => 'Format export tidak valid'
        ], 400);
    }

    private function exportExcel($absensi)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Data Absensi');

        $headers = ['No', 'Tanggal', 'Nama Karyawan', 'Check In', 'Check Out', 'Status Absensi', 'Lokasi Check In', 'Catatan'];
        $col = 'A';
        foreach ($headers as $header) {
            $sheet->setCellValue($col . '1', $header);
            $sheet->getStyle($col . '1')->getFont()->setBold(true);
            $sheet->getStyle($col . '1')->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setARGB('FF4472C4');
            $sheet->getStyle($col . '1')->getFont()->getColor()->setARGB('FFFFFFFF');
            $sheet->getStyle($col . '1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $col++;
        }

        $row = 2;
        $no = 1;
        foreach ($absensi as $item) {
            $sheet->setCellValue('A' . $row, $no);
            $sheet->setCellValue('B' . $row, $item->tanggal ?? '-');
            $sheet->setCellValue('C' . $row, $item->karyawan_rel ? $item->karyawan_rel->nama : '-');
            $sheet->setCellValue('D' . $row, $item->check_in ?? '-');
            $sheet->setCellValue('E' . $row, $item->check_out ?? '-');
            $sheet->setCellValue('F' . $row, $item->status_absensi ?? '-');
            $location = ($item->lat_check_in && $item->long_check_in) 
                ? $item->lat_check_in . ', ' . $item->long_check_in 
                : '-';
            $sheet->setCellValue('G' . $row, $location);
            $sheet->setCellValue('H' . $row, $item->notes ?? '-');
            $row++;
            $no++;
        }

        foreach (range('A', 'H') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $sheet->getStyle('A1:H' . ($row - 1))->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                ],
            ],
        ]);

        $writer = new Xlsx($spreadsheet);
        $filename = 'absensi_' . date('Y-m-d') . '.xlsx';
        
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        $writer->save('php://output');
        exit;
    }

    private function exportCsv($absensi)
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Data Absensi');

        $headers = ['No', 'Tanggal', 'Nama Karyawan', 'Check In', 'Check Out', 'Status Absensi', 'Lokasi Check In', 'Catatan'];
        $col = 'A';
        foreach ($headers as $header) {
            $sheet->setCellValue($col . '1', $header);
            $col++;
        }

        $row = 2;
        $no = 1;
        foreach ($absensi as $item) {
            $sheet->setCellValue('A' . $row, $no);
            $sheet->setCellValue('B' . $row, $item->tanggal ?? '-');
            $sheet->setCellValue('C' . $row, $item->karyawan_rel ? $item->karyawan_rel->nama : '-');
            $sheet->setCellValue('D' . $row, $item->check_in ?? '-');
            $sheet->setCellValue('E' . $row, $item->check_out ?? '-');
            $sheet->setCellValue('F' . $row, $item->status_absensi ?? '-');
            $location = ($item->lat_check_in && $item->long_check_in) 
                ? $item->lat_check_in . ', ' . $item->long_check_in 
                : '-';
            $sheet->setCellValue('G' . $row, $location);
            $sheet->setCellValue('H' . $row, $item->notes ?? '-');
            $row++;
            $no++;
        }

        $writer = new Csv($spreadsheet);
        $writer->setEnclosure('"');
        $writer->setDelimiter(',');
        $filename = 'absensi_' . date('Y-m-d') . '.csv';
        
        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');
        header('Pragma: public');

        echo "\xEF\xBB\xBF";

        $writer->save('php://output');
        exit;
    }

    private function exportPdf($absensi)
    {
        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Laporan Absensi</title>
    <style>
        @media print {
            @page {
                margin: 1cm;
                size: A4 landscape;
            }
        }
        body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            margin: 0;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        h1 {
            margin: 0;
            font-size: 18px;
            color: #333;
        }
        .info {
            margin-bottom: 15px;
            font-size: 11px;
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            page-break-inside: auto;
        }
        thead {
            display: table-header-group;
        }
        tbody tr {
            page-break-inside: avoid;
            page-break-after: auto;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: left;
            word-wrap: break-word;
        }
        th {
            background-color: #4472C4;
            color: white;
            font-weight: bold;
            text-align: center;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .footer {
            margin-top: 20px;
            text-align: right;
            font-size: 9px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Laporan Data Absensi</h1>
    </div>
    <div class="info">
        <p><strong>Tanggal Export:</strong> ' . date('d-m-Y H:i:s') . '</p>
        <p><strong>Total Data:</strong> ' . $absensi->count() . ' record</p>
    </div>
    <table>
        <thead>
            <tr>
                <th style="width: 3%;">No</th>
                <th style="width: 10%;">Tanggal</th>
                <th style="width: 15%;">Nama Karyawan</th>
                <th style="width: 8%;">Check In</th>
                <th style="width: 8%;">Check Out</th>
                <th style="width: 10%;">Status Absensi</th>
                <th style="width: 20%;">Lokasi Check In</th>
                <th style="width: 26%;">Catatan</th>
            </tr>
        </thead>
        <tbody>';

        $no = 1;
        foreach ($absensi as $item) {
            $location = ($item->lat_check_in && $item->long_check_in) 
                ? $item->lat_check_in . ', ' . $item->long_check_in 
                : '-';
            $html .= '<tr>
                <td style="text-align: center;">' . $no . '</td>
                <td>' . ($item->tanggal ?? '-') . '</td>
                <td>' . htmlspecialchars($item->karyawan_rel ? $item->karyawan_rel->nama : '-') . '</td>
                <td>' . ($item->check_in ?? '-') . '</td>
                <td>' . ($item->check_out ?? '-') . '</td>
                <td>' . htmlspecialchars($item->status_absensi ?? '-') . '</td>
                <td>' . htmlspecialchars($location) . '</td>
                <td>' . htmlspecialchars($item->notes ?? '-') . '</td>
            </tr>';
            $no++;
        }

        $html .= '</tbody>
    </table>
    <div class="footer">
        <p>Dicetak pada: ' . date('d-m-Y H:i:s') . '</p>
    </div>
    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>';

        $filename = 'absensi_' . date('Y-m-d') . '.html';
        
        header('Content-Type: text/html; charset=UTF-8');
        header('Content-Disposition: inline;filename="' . $filename . '"');
        
        echo $html;
        exit;
    }
}


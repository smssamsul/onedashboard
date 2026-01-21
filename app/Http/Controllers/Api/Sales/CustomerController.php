<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Customer;
use App\Models\Sales;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use App\Models\OrderCustomer;
use App\Models\LogsFollup;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class CustomerController extends Controller
{
    /**
     * Static variable untuk tracking memberID yang sudah digunakan dalam batch import
     */
    private static $usedMemberIDs = [];

    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $query = Customer::select(array_diff(
            \Schema::getColumnListing('customer'),
            ['password'] 
        ))
        ->where('status', '!=', 'N');

        // Search berdasarkan nama, email, WA, atau memberID
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nama', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%")
                  ->orWhere('wa', 'ILIKE', "%{$search}%")
                  ->orWhere('nama_panggilan', 'ILIKE', "%{$search}%")
                  ->orWhere('memberID', 'ILIKE', "%{$search}%")
                  ->orWhere('alamat', 'ILIKE', "%{$search}%");
            });
        }

        // Filter berdasarkan memberID
        if ($request->has('memberID') && $request->memberID) {
            $query->where('memberID', 'ILIKE', "%{$request->memberID}%");
        }

        // Filter berdasarkan keanggotaan
        if ($request->has('keanggotaan') && $request->keanggotaan) {
            $query->where('keanggotaan', $request->keanggotaan);
        }

        // Filter berdasarkan alamat
        if ($request->has('alamat') && $request->alamat) {
            $query->where('alamat', 'ILIKE', "%{$request->alamat}%");
        }

        // Filter berdasarkan tahun (create_at)
        if ($request->has('tahun') && $request->tahun) {
            $query->whereYear('create_at', $request->tahun);
        }

        // Urutkan berdasarkan tahun (create_at) terlebih dahulu, kemudian id
        $query->orderBy('create_at', 'desc')->orderBy('id', 'desc');

        // Jika parameter all=true, return semua data tanpa pagination
        if ($request->has('all') && $request->all == 'true') {
            $customers = $query->with('sales_rel:id,nama')->get();
            
            // Tambahkan sales_nama ke setiap customer
            $customers->each(function($customer) {
                $customer->sales_nama = $customer->sales_rel ? $customer->sales_rel->nama : null;
            });
            
            return response()->json([
                'success' => true,
                'data' => $customers,
                'total' => $customers->count()
            ]);
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $customers = $query->with('sales_rel:id,nama')->paginate($perPage);

        // Tambahkan sales_nama ke setiap customer
        $customers->getCollection()->each(function($customer) {
            $customer->sales_nama = $customer->sales_rel ? $customer->sales_rel->nama : null;
        });

        return response()->json([
            'success' => true,
            'data' => $customers->items(),
            'pagination' => [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ]
        ]);
    }

    public function form_customer_update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'nama_panggilan' => 'required|string|max:255',
            'instagram' => 'required',
            'profesi' => 'required',
            'pendapatan_bln' => 'required',
            'industri_pekerjaan' => 'required',
            'jenis_kelamin' => 'required',
            'tanggal_lahir' => 'required',

            // 'password' => 'required|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $customer = Customer::find($id);
        $customer->fill($validator->validated());
        $customer->update_at = now();
        $customer->save();

 
        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil diupdate',
            'id' => $customer->id
        ], 201);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:255',
            'email' => 'required|email|unique:customer,email',
            // 'password' => 'required|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $wa = $this->formatPhoneNumber($request->wa);

        // Jika sales_id tidak diisi, gunakan round-robin
        $sales_id = !empty($request->sales_id) ? $request->sales_id : $this->getNextSalesId();

        $customer = Customer::create([
            'nama' => $request->nama,
            'nama_panggilan' => $request->nama_panggilan,
            'email' => $request->email,
            'instagram' => $request->instagram,
            'password' => bcrypt("123456"),
            // 'password' => Hash::make($request->password),
            'wa' => $wa,
            'profesi' => $request->profesi,
            'pendapatan_bln' => $request->pendapatan_bln,
            'industri_pekerjaan' => $request->industri_pekerjaan,
            'jenis_kelamin' => $request->jenis_kelamin,
            'tanggal_lahir' => $request->tanggal_lahir,
            'alamat' => $request->alamat,
            'provinsi' => $request->provinsi,
            'kabupaten' => $request->kabupaten,
            'kecamatan' => $request->kecamatan,
            'kode_pos' => $request->kode_pos,
            // 'status_order' => $request->status_order,
            'verifikasi' => '1',
            'keanggotaan' => 'basic', // Default keanggotaan
            // 'alasan_tertarik' => $request->alasan_tertarik,
            // 'alasan_belum' => $request->alasan_belum,
            // 'harapan' => $request->harapan,
            'create_at' => now(),
            'status' => '1',
            'sales_id' => $sales_id,
        ]);

        // Generate memberID setelah customer dibuat
        $memberID = $this->generateMemberID($customer);
        $customer->update(['memberID' => $memberID]);

        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil ditambahkan',
            'data' => $customer->fresh()
        ], 201);
    }
 

    public function show($id)
    {
        $customer = Customer::select(array_diff(
                    \Schema::getColumnListing('customer'),
                    ['password','create_at','update_at'] 
                ))
                ->with('sales_rel:id,nama')
                ->where('id', $id)
                ->where('status', '!=', 'N')
                ->first();
        

        if (!$customer) {
            return response()->json(['message' => 'Customer tidak ditemukan'], 404);
        }

        // Tambahkan sales_nama
        $customer->sales_nama = $customer->sales_rel ? $customer->sales_rel->nama : null;

        return response()->json([
            'success' => true,
            'data' => [$customer] // Format array untuk konsistensi dengan index
        ]);
    }


    public function update(Request $request, $id)
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json(['message' => 'Customer tidak ditemukan'], 404);
        }

        // Validasi keanggotaan jika ada
        $updateData = $request->all();
        if (isset($updateData['keanggotaan'])) {
            $validKeanggotaan = ['basic', 'bronze', 'silver', 'gold', 'platinum', 'diamond'];
            if (!in_array($updateData['keanggotaan'], $validKeanggotaan)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Keanggotaan tidak valid. Pilih: basic, bronze, silver, gold, platinum, atau diamond'
                ], 422);
            }
        }

        $customer->update($updateData);
        $customer->update_at = now();
        $customer->save();

        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil diupdate',
            'data' => $customer
        ]);
    }



    public function destroy($id)
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json(['message' => 'Customer tidak ditemukan'], 404);
        }

        $customer->update([
            'status'    => "N"
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil dihapus'
        ]);
    }

    public function importFromExcel(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        if (!class_exists(IOFactory::class)) {
            return response()->json([
                'success' => false,
                'message' => 'Library PhpSpreadsheet belum terpasang. Jalankan: composer require phpoffice/phpspreadsheet',
            ], 500);
        }

        $file = $request->file('file');

        try {
            $spreadsheet = IOFactory::load($file->getRealPath());
            $sheet       = $spreadsheet->getActiveSheet();
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membaca file Excel: ' . $e->getMessage(),
            ], 500);
        }

        $highestRow = $sheet->getHighestRow();

        // Reset static variable untuk tracking memberID yang sudah digunakan
        self::$usedMemberIDs = [];

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors  = [];

        for ($row = 2; $row <= $highestRow; $row++) {
            try {
                $email = trim((string) $sheet->getCell('B' . $row)->getValue());

                $createAtCell   = $sheet->getCell('A' . $row);
                $nama           = trim((string) $sheet->getCell('C' . $row)->getValue());
                $sapaan         = trim((string) $sheet->getCell('D' . $row)->getValue());
                $namaPanggilan  = trim((string) $sheet->getCell('E' . $row)->getValue());
                $instagram      = trim((string) $sheet->getCell('F' . $row)->getValue());
                $genderRaw      = strtolower(trim((string) $sheet->getCell('G' . $row)->getValue()));
                $tglLahirCell   = $sheet->getCell('H' . $row);
                $profesi        = trim((string) $sheet->getCell('I' . $row)->getValue());
                $pendapatanRaw  = trim((string) $sheet->getCell('J' . $row)->getValue());
                $industri       = trim((string) $sheet->getCell('K' . $row)->getValue());
                $alamat         = trim((string) $sheet->getCell('L' . $row)->getValue());
                $riwayatOrder   = trim((string) $sheet->getCell('M' . $row)->getValue());
                $alasanTertarik = trim((string) $sheet->getCell('N' . $row)->getValue());
                $alasanBelum    = trim((string) $sheet->getCell('O' . $row)->getValue());
                $harapan        = trim((string) $sheet->getCell('P' . $row)->getValue());
                $waRaw          = trim((string) $sheet->getCell('Q' . $row)->getValue());

                // Jika email kosong, generate email dummy supaya tetap bisa disimpan
                $isDummyEmail = false;
                if (!$email) {
                    $email        = $this->generateDummyEmail($waRaw, $row);
                    $isDummyEmail = true;
                }

                // create_at dari kolom A (tanggal + jam)
                $createAt = $this->parseExcelDateTime($createAtCell) ?? now()->format('Y-m-d H:i:s');

                // jenis kelamin
                $jenisKelamin = null;
                if (str_contains($genderRaw, 'laki')) {
                    $jenisKelamin = 'L';
                } elseif (str_contains($genderRaw, 'perem')) {
                    $jenisKelamin = 'P';
                }

                // tanggal lahir dari kolom H (hanya tanggal)
                $tanggalLahir = $this->parseExcelDate($tglLahirCell);

                // pendapatan bulanan (klasifikasi)
                $pendapatanBln = $this->normalizeIncome($pendapatanRaw);

                // WA
                $wa = $waRaw ? $this->formatPhoneNumber($waRaw) : null;

                // Generate memberID berdasarkan kolom A (create_at) sebelum customer dibuat
                $memberID = $this->generateMemberIDFromDate($createAt);

                // Pastikan sapaan tersimpan jika ada nilainya
                $sapaanValue = !empty(trim($sapaan)) ? trim($sapaan) : null;
                
                $data = [
                    'nama'               => $nama ?: $namaPanggilan ?: $email,
                    'sapaan'             => $sapaanValue,
                    'nama_panggilan'     => $namaPanggilan ?: null,
                    'instagram'          => $instagram ?: null,
                    'wa'                 => $wa,
                    'profesi'            => $profesi ?: null,
                    'pendapatan_bln'     => $pendapatanBln,
                    'industri_pekerjaan' => $industri ?: null,
                    'jenis_kelamin'      => $jenisKelamin,
                    'tanggal_lahir'      => $tanggalLahir,
                    'alamat'             => $alamat ?: null,
                    'provinsi'           => null, // Akan diisi otomatis
                    'kabupaten'          => null, // Akan diisi otomatis
                    'kecamatan'          => null, // Akan diisi otomatis
                    'status_order'       => $riwayatOrder ?: null,
                    'alasan_tertarik'    => $alasanTertarik ?: null,
                    'alasan_belum'       => $alasanBelum ?: null,
                    'harapan'            => $harapan ?: null,
                    'verifikasi'         => '1',
                    'status'             => '1',
                ];

                $customer = null;

                // Hanya update jika email asli (bukan dummy) dan sudah ada di database
                if (!$isDummyEmail) {
                    $customer = Customer::where('email', $email)->first();
                }

                if ($customer) {
                    $customer->fill($data);
                    $customer->update_at = now();
                    $customer->save();
                    $updated++;
                } else {
                    $data['email']      = $email;
                    $data['password']   = bcrypt('123456');
                    $data['create_at']  = $createAt;
                    $data['keanggotaan'] = 'basic'; // Default keanggotaan
                    $data['memberID']   = $memberID; // Set memberID langsung
                    // Jika sales_id tidak diisi, gunakan round-robin
                    if (empty($data['sales_id'])) {
                        $data['sales_id'] = $this->getNextSalesId();
                    }

                    $newCustomer = Customer::create($data);
                    $created++;
                }
            } catch (\Throwable $e) {
                $skipped++;
                $errors[] = [
                    'row'    => $row,
                    'reason' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Import customer dari Excel selesai',
            'data'    => [
                'created' => $created,
                'updated' => $updated,
                'skipped' => $skipped,
                'errors'  => $errors,
            ],
        ]);
    }

    private function formatPhoneNumber($phone)
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);

        if (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        }

        if (substr($phone, 0, 2) !== '62') {
            $phone = '62' . ltrim($phone, '0');
        }

        return $phone;
    }

    private function normalizeIncome(?string $raw): ?string
    {
        if (!$raw) {
            return null;
        }

        $value = strtoupper(str_replace([' ', 'JT', 'JUTA', 'Jt'], '', $raw));

        // Bentuk standar contoh file: <3, 3-5, 4-8, >15, dll.
        if (str_starts_with($value, '<')) {
            return '<5';
        }

        if (str_starts_with($value, '>')) {
            $num = (float) ltrim($value, '><= ');
            if ($num <= 15) {
                return '16-20';
            }
            if ($num <= 50) {
                return '20-50';
            }
            if ($num <= 100) {
                return '50-100';
            }
            return '>100';
        }

        // Rentang, contoh 3-5, 4-8, 10-15, dll.
        if (str_contains($value, '-')) {
            [$min, $max] = array_pad(explode('-', $value, 2), 2, null);
            $min = (float) $min;
            $max = (float) $max;

            $avg = ($min + $max) / 2;

            if ($avg < 5) {
                return '<5';
            }
            if ($avg >= 5 && $avg < 10) {
                return '5-9';
            }
            if ($avg >= 10 && $avg <= 15) {
                return '10-15';
            }
            if ($avg > 15 && $avg <= 20) {
                return '16-20';
            }
            if ($avg > 20 && $avg <= 50) {
                return '20-50';
            }
            if ($avg > 50 && $avg <= 100) {
                return '50-100';
            }

            return '>100';
        }

        // Fallback: angka tunggal
        $num = (float) $value;
        if ($num < 5) {
            return '<5';
        }
        if ($num >= 5 && $num < 10) {
            return '5-9';
        }
        if ($num >= 10 && $num <= 15) {
            return '10-15';
        }
        if ($num > 15 && $num <= 20) {
            return '16-20';
        }
        if ($num > 20 && $num <= 50) {
            return '20-50';
        }
        if ($num > 50 && $num <= 100) {
            return '50-100';
        }

        return '>100';
    }

    /**
     * Parse Excel cell (date or datetime) menjadi format Y-m-d H:i:s
     *
     * @param Cell|null $cell
     * @return string|null
     */
    private function parseExcelDateTime(?Cell $cell): ?string
    {
        if (!$cell) {
            return null;
        }

        $value = $cell->getValue();

        // Jika numeric, anggap serial date Excel
        if (is_numeric($value)) {
            try {
                $dt = ExcelDate::excelToDateTimeObject($value);
                return Carbon::instance($dt)->format('Y-m-d H:i:s');
            } catch (\Throwable $e) {
                // fallback ke bawah
            }
        }

        // Jika string, gunakan formatted value (contoh: 16/12/2025 11:48:56)
        $formatted = trim((string) $cell->getFormattedValue());
        if ($formatted === '') {
            return null;
        }

        try {
            // Coba format d/m/Y H:i:s
            if (preg_match('/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}$/', $formatted)) {
                return Carbon::createFromFormat('d/m/Y H:i:s', $formatted)->format('Y-m-d H:i:s');
            }

            // Coba format d/m/Y
            if (preg_match('/^\d{1,2}\/\d{1,2}\/\d{4}$/', $formatted)) {
                return Carbon::createFromFormat('d/m/Y', $formatted)->startOfDay()->format('Y-m-d H:i:s');
            }

            // Fallback generic
            return Carbon::parse($formatted)->format('Y-m-d H:i:s');
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Parse Excel cell date menjadi format Y-m-d (untuk tanggal_lahir)
     *
     * @param Cell|null $cell
     * @return string|null
     */
    private function parseExcelDate(?Cell $cell): ?string
    {
        if (!$cell) {
            return null;
        }

        $value = $cell->getValue();

        if (is_numeric($value)) {
            try {
                $dt = ExcelDate::excelToDateTimeObject($value);
                return Carbon::instance($dt)->format('Y-m-d');
            } catch (\Throwable $e) {
                // fallback
            }
        }

        $formatted = trim((string) $cell->getFormattedValue());
        if ($formatted === '') {
            return null;
        }

        try {
            if (preg_match('/^\d{1,2}\/\d{1,2}\/\d{4}$/', $formatted)) {
                return Carbon::createFromFormat('d/m/Y', $formatted)->format('Y-m-d');
            }

            if (preg_match('/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}$/', $formatted)) {
                return Carbon::createFromFormat('d/m/Y H:i:s', $formatted)->format('Y-m-d');
            }

            return Carbon::parse($formatted)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Generate email dummy yang valid & unik untuk data tanpa email
     */
    private function generateDummyEmail(?string $waRaw, int $row): string
    {
        // Gunakan WA sebagai bagian dari username jika ada
        $wa = preg_replace('/[^0-9]/', '', (string) $waRaw);
        if ($wa) {
            $username = 'noemail_' . substr($wa, -8);
        } else {
            $username = 'noemail_row' . $row . '_' . uniqid();
        }

        return $username . '@dummy.onedashboard.local';
    }

    public function riwayat_order(Request $request, $id)
    {
        
        $riwayat_order = OrderCustomer::with([
            'produk_rel:id,nama',
            'customer_rel:id,nama,wa'])
            ->where('customer', $id)
            ->orderBy('create_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Riwayat order berhasil diambil',
            'data' => $riwayat_order
        ]);
    }

    public function followup($id)
    {
        // Cek apakah customer ada
        $customer = Customer::find($id);
        
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer tidak ditemukan'
            ], 404);
        }

        // Ambil semua follow up untuk customer ini
        $followups = LogsFollup::with([
            'follup_rel:id,nama,text,event,produk_id,type',
            'follup_rel.produk_rel:id,nama' // relasi produk jika ada
        ])
        ->where('customer', $id)
        ->where('status', '!=', 'N')
        ->orderBy('create_at', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'message' => 'Data follow up berhasil diambil',
            'customer' => [
                'id' => $customer->id,
                'nama' => $customer->nama,
                'email' => $customer->email,
                'wa' => $customer->wa
            ],
            'total' => $followups->count(),
            'data' => $followups
        ]);
    }

    /**
     * Generate MemberID dari create_at
     * Format: 2025010100001 (tahun, bulan, tanggal, no urut)
     */
    private function generateMemberID($customer)
    {
        // Ambil create_at atau gunakan tanggal sekarang
        $createAt = $customer->create_at ?? now();
        
        // Jika create_at adalah string, convert ke Carbon
        if (is_string($createAt)) {
            $createAt = Carbon::parse($createAt);
        }
        
        return $this->generateMemberIDFromDate($createAt, $customer->id ?? null);
    }

    /**
     * Generate MemberID dari tanggal (untuk import Excel)
     * Format: 2025010100001 (tahun, bulan, tanggal, random sequence)
     */
    private function generateMemberIDFromDate($createAt, $customerId = null)
    {
        // Jika create_at adalah string, convert ke Carbon
        if (is_string($createAt)) {
            $createAt = Carbon::parse($createAt);
        }
        
        // Format: YYYYMMDD
        $datePart = $createAt->format('Ymd');
        
        // Generate random sequence (5 digit: 00001-99999)
        $maxAttempts = 1000; // Meningkatkan max attempts untuk menghindari konflik
        $attempts = 0;
        
        do {
            // Generate random number antara 1-99999 menggunakan random_int untuk lebih aman dan random
            $randomSequence = random_int(1, 99999);
            
            // Tambahkan variasi dengan microtime untuk mengurangi kemungkinan duplikasi
            if ($attempts > 0) {
                $microtimePart = (int) ((microtime(true) * 10000) % 99999);
                $randomSequence = (($randomSequence + $microtimePart + $attempts) % 99999) + 1;
            }
            
            $sequence = str_pad($randomSequence, 5, '0', STR_PAD_LEFT);
            
            // Gabungkan: YYYYMMDD + random sequence
            $memberID = $datePart . $sequence;
            
            // Cek apakah memberID sudah ada di database
            $existsInDB = Customer::where('memberID', $memberID)
                ->when($customerId, function($q) use ($customerId) {
                    $q->where('id', '!=', $customerId);
                })
                ->exists();
            
            // Cek juga apakah memberID sudah digunakan dalam batch import ini (static variable)
            $existsInBatch = in_array($memberID, self::$usedMemberIDs);
            
            $exists = $existsInDB || $existsInBatch;
            
            $attempts++;
            
            // Jika sudah mencoba terlalu banyak, gunakan kombinasi timestamp + random sebagai fallback
            if ($attempts >= $maxAttempts) {
                $timestampPart = substr(time(), -4); // 4 digit terakhir timestamp
                $randomPart = random_int(0, 9); // 1 digit random
                $sequence = str_pad($timestampPart . $randomPart, 5, '0', STR_PAD_LEFT);
                $memberID = $datePart . $sequence;
                
                // Cek sekali lagi apakah masih ada duplikasi
                $finalCheck = Customer::where('memberID', $memberID)
                    ->when($customerId, function($q) use ($customerId) {
                        $q->where('id', '!=', $customerId);
                    })
                    ->exists();
                
                if (!$finalCheck && !in_array($memberID, self::$usedMemberIDs)) {
                    break;
                }
                
                // Jika masih ada duplikasi, gunakan uniqid
                $uniquePart = substr(str_replace('.', '', uniqid('', true)), -5);
                $sequence = str_pad($uniquePart, 5, '0', STR_PAD_LEFT);
                $memberID = $datePart . $sequence;
                break;
            }
        } while ($exists);
        
        // Simpan memberID yang digunakan untuk batch import ini
        self::$usedMemberIDs[] = $memberID;
        
        return $memberID;
    }

    /**
     * Get sales_id berdasarkan urutan dan last_update_lead (round-robin)
     * Digunakan untuk menetapkan sales secara otomatis jika tidak diisi
     */
    private function getNextSalesId()
    {
        $salesList = Sales::orderBy('urutan', 'asc')
            ->orderByRaw('CASE WHEN last_update_lead IS NULL THEN 0 ELSE 1 END') // Null dulu
            ->orderBy('last_update_lead', 'asc') 
            ->get();

       $selectedSales = $salesList->first();

        $selectedSales->update([
            'last_update_lead' => now()->format('Y-m-d H:i:s'),
            'update_at' => now()->format('Y-m-d H:i:s'),
        ]);

        return $selectedSales->user_id;
    }
}


<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Lead;
use App\Models\Customer;
use App\Models\OrderCustomer;
use App\Models\Produk;
use App\Models\AktivitasLead;
use App\Models\FollowUpLead;
use App\Models\User;
use App\Jobs\SendLeadBroadcastJob;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class LeadController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $query = Lead::with([
            'customer_rel:id,nama,email,wa,pendapatan_bln',
            'sales_rel:id,nama,level'
        ])
        ->where('status', '!=', 'N');
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('sales_id')) {
            $query->where('sales_id', $request->sales_id);
        }

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->has('lead_label')) {
            $query->where('lead_label', 'like', '%' . $request->lead_label . '%');
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('lead_label', 'like', '%' . $search . '%')
                  ->orWhereHas('customer_rel', function($customerQuery) use ($search) {
                      $customerQuery->where('nama', 'like', '%' . $search . '%')
                                   ->orWhere('email', 'like', '%' . $search . '%')
                                   ->orWhere('wa', 'like', '%' . $search . '%');
                  });
            });
        }

        $query->orderBy('create_at', 'desc');

        $perPage = $request->get('per_page', 15);
        $leads = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data leads berhasil diambil',
            'data' => $leads->items(),
            'pagination' => [
                'current_page' => $leads->currentPage(),
                'last_page' => $leads->lastPage(),
                'per_page' => $leads->perPage(),
                'total' => $leads->total(),
            ],
        ]);
    }

    public function show($id)
    {
        $lead = Lead::with([
            'customer_rel',
            'sales_rel:id,nama,level'
        ])->find($id);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'Lead tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data lead berhasil diambil',
            'data' => $lead
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|exists:customer,id',
            'lead_label' => 'required|string|max:150',
            'sales_id' => 'nullable|exists:user,id',
            'status' => 'nullable|string|max:10',
            'minat_produk' => 'nullable|string|max:150',
            'alasan_tertarik' => 'nullable|string',
            'alasan_belum' => 'nullable|string',
            'harapan' => 'nullable|string',
            'last_contact_at' => 'nullable|date',
            'next_follow_up_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $lead = Lead::create([
            'customer_id' => $request->customer_id,
            'sales_id' => $request->sales_id ?? auth('api')->id(),
            'lead_label' => $request->lead_label,
            'status' => $request->status ?? 'NEW',
            'minat_produk' => $request->minat_produk,
            'alasan_tertarik' => $request->alasan_tertarik,
            'alasan_belum' => $request->alasan_belum,
            'harapan' => $request->harapan,
            'last_contact_at' => $request->last_contact_at ? Carbon::parse($request->last_contact_at)->format('Y-m-d H:i:s') : null,
            'next_follow_up_at' => $request->next_follow_up_at ? Carbon::parse($request->next_follow_up_at)->format('Y-m-d H:i:s') : null,
            'create_param' => $request->create_param ?? null,
            'create_at' => now()->format('Y-m-d H:i:s'),
            'update_at' => now()->format('Y-m-d H:i:s'),
        ]);

        AktivitasLead::create([
            'lead_id' => $lead->id,
            'customer_id' => $request->customer_id,
            'user_id' => auth('api')->id(),
            'type' => 'lead_created',
            'note' => 'Lead baru dibuat dengan label: ' . $request->lead_label,
            'create_at' => now()->format('Y-m-d H:i:s'),
        ]);

        $lead->load(['customer_rel', 'sales_rel']);

        return response()->json([
            'success' => true,
            'message' => 'Lead berhasil dibuat',
            'data' => $lead
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $lead = Lead::find($id);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'Lead tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'customer_id' => 'nullable|exists:customer,id',
            'lead_label' => 'nullable|string|max:150',
            'sales_id' => 'nullable|exists:user,id',
            'status' => 'nullable|string|max:10|not_in:CONVERTED,LOST,QUALIFIED',
            'minat_produk' => 'nullable|string|max:150',
            'alasan_tertarik' => 'nullable|string',
            'alasan_belum' => 'nullable|string',
            'harapan' => 'nullable|string',
            'last_contact_at' => 'nullable|date',
            'next_follow_up_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $updateData = $validator->validated();
        
        if (isset($updateData['status']) && in_array($updateData['status'], ['CONVERTED', 'LOST', 'QUALIFIED'])) {
            $statusMessages = [
                'CONVERTED' => 'Status CONVERTED hanya bisa diubah melalui follow-up dengan type closed_won',
                'LOST' => 'Status LOST hanya bisa diubah melalui follow-up dengan type closed_lost',
                'QUALIFIED' => 'Status QUALIFIED hanya bisa diubah melalui follow-up dengan type interested'
            ];
            
            return response()->json([
                'success' => false,
                'message' => $statusMessages[$updateData['status']]
            ], 422);
        }
        
        if (isset($updateData['last_contact_at'])) {
            $updateData['last_contact_at'] = Carbon::parse($updateData['last_contact_at'])->format('Y-m-d H:i:s');
        }
        
        if (isset($updateData['next_follow_up_at'])) {
            $updateData['next_follow_up_at'] = Carbon::parse($updateData['next_follow_up_at'])->format('Y-m-d H:i:s');
        }

        $updateData['update_at'] = now()->format('Y-m-d H:i:s');

        $lead->update($updateData);
        $lead->load(['customer_rel', 'sales_rel']);

        return response()->json([
            'success' => true,
            'message' => 'Lead berhasil diupdate',
            'data' => $lead
        ]);
    }

    public function destroy($id)
    {
        $lead = Lead::find($id);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'Lead tidak ditemukan'
            ], 404);
        }

        $lead->update([
            'status' => 'N',
            'update_at' => now()->format('Y-m-d H:i:s')
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Lead berhasil dihapus'
        ]);
    }

    public function generateFromCustomer(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'min_salary' => 'nullable|numeric|min:0',
            'produk_id' => 'nullable|exists:produk,id',
            'status_order' => 'nullable|string',
            'lead_label' => 'required|string|max:150',
            'sales_id' => 'nullable|exists:user,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $query = Customer::where('status', '!=', 'N');

        $createParam = [];

        if ($request->has('min_salary') && $request->min_salary > 0) {
            $minSalary = $request->min_salary;
            $createParam['min_salary'] = $minSalary;
            
            $minSalaryInJuta = $minSalary / 1000000;
            
            $query->where(function($q) use ($minSalaryInJuta) {
                $q->where(function($subQ) use ($minSalaryInJuta) {
                    $subQ->where('pendapatan_bln', 'LIKE', '%-%')
                         ->whereRaw("CAST(SPLIT_PART(pendapatan_bln::text, '-', 2) AS NUMERIC) >= ?", [$minSalaryInJuta]);
                })
                ->orWhere(function($subQ) use ($minSalaryInJuta) {
                    $subQ->whereRaw("pendapatan_bln::text NOT LIKE '<%' AND pendapatan_bln::text NOT LIKE '%-%'")
                         ->whereRaw("CAST(pendapatan_bln::text AS NUMERIC) >= ?", [$minSalaryInJuta]);
                });
            });
        }

        if ($request->has('produk_id')) {
            $customerIds = OrderCustomer::where('produk', $request->produk_id)
                ->where('status', '!=', 'N')
                ->pluck('customer')
                ->unique()
                ->toArray();
            
            $query->whereIn('id', $customerIds);
            $createParam['produk_id'] = $request->produk_id;
        }

        $statusOrderFilter = null;
        if ($request->has('status_order') && $request->status_order) {
            $statusOrderFilter = $request->status_order;
            $createParam['status_order'] = $statusOrderFilter;
        }

        if (!$request->has('min_salary') && !$request->has('produk_id') && !$request->has('status_order') && !$request->has('all')) {
            return response()->json([
                'success' => false,
                'message' => 'Harus menyertakan min_salary, produk_id, status_order, atau all=true'
            ], 422);
        }

        if ($request->has('all') && $request->all == true) {
            $createParam['all'] = true;
        }

        $customers = $query->get();

        if ($customers->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada customer yang memenuhi kriteria'
            ], 404);
        }

        $salesId = $request->sales_id ?? auth('api')->id();
        $baseLeadLabel = $request->lead_label;
        $now = now()->format('Y-m-d H:i:s');

        $leadsCreated = [];
        $leadsSkipped = [];
        $groupedResults = [];

        if ($statusOrderFilter) {
            $customersWithStatus = $customers->filter(function($customer) use ($statusOrderFilter) {
                if (!$customer->status_order) {
                    return false;
                }
                
                if ($customer->status_order === $statusOrderFilter) {
                    return true;
                }
                
                $customerStatusOrders = array_map('trim', explode(',', $customer->status_order));
                return in_array($statusOrderFilter, $customerStatusOrders);
            });

            if ($customersWithStatus->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada customer dengan status_order: ' . $statusOrderFilter
                ], 404);
            }

            $groupLeadLabel = "{$baseLeadLabel} - {$statusOrderFilter}";
            
            if (strlen($groupLeadLabel) > 150) {
                $groupLeadLabel = substr($groupLeadLabel, 0, 147) . '...';
            }

            $createParamForGroup = array_merge($createParam, ['status_order' => $statusOrderFilter]);
            $createParamJson = json_encode($createParamForGroup);

            foreach ($customersWithStatus as $customer) {
                $existingLead = Lead::where('customer_id', $customer->id)
                    ->where('lead_label', $groupLeadLabel)
                    ->where('status', '!=', 'N')
                    ->first();

                if ($existingLead) {
                    $leadsSkipped[] = [
                        'customer_id' => $customer->id,
                        'customer_name' => $customer->nama,
                        'reason' => 'Lead dengan label ini sudah ada'
                    ];
                    continue;
                }

                $lead = Lead::create([
                    'customer_id' => $customer->id,
                    'sales_id' => $salesId,
                    'lead_label' => $groupLeadLabel,
                    'status' => 'NEW',
                    'minat_produk' => null,
                    'alasan_tertarik' => $customer->alasan_tertarik,
                    'alasan_belum' => $customer->alasan_belum,
                    'harapan' => $customer->harapan,
                    'last_contact_at' => null,
                    'next_follow_up_at' => null,
                    'create_param' => $createParamJson,
                    'create_at' => $now,
                    'update_at' => $now,
                ]);

                AktivitasLead::create([
                    'lead_id' => $lead->id,
                    'customer_id' => $customer->id,
                    'user_id' => auth('api')->id(),
                    'type' => 'lead_created',
                    'note' => 'Lead dibuat dari generate dengan label: ' . $groupLeadLabel,
                    'create_at' => $now,
                ]);

                $leadsCreated[] = [
                    'id' => $lead->id,
                    'customer_id' => $customer->id,
                    'customer_name' => $customer->nama,
                    'lead_label' => $groupLeadLabel
                ];
            }

            $groupedResults[$statusOrderFilter] = [
                'status_order' => $statusOrderFilter,
                'lead_label' => $groupLeadLabel,
                'total_customers' => $customersWithStatus->count(),
                'leads_created' => count($leadsCreated),
                'leads_skipped' => count($leadsSkipped),
            ];
        } else {
            $createParamJson = json_encode($createParam);

            foreach ($customers as $customer) {
                $existingLead = Lead::where('customer_id', $customer->id)
                    ->where('lead_label', $baseLeadLabel)
                    ->where('status', '!=', 'N')
                    ->first();

                if ($existingLead) {
                    $leadsSkipped[] = [
                        'customer_id' => $customer->id,
                        'customer_name' => $customer->nama,
                        'reason' => 'Lead dengan label ini sudah ada'
                    ];
                    continue;
                }

                $lead = Lead::create([
                    'customer_id' => $customer->id,
                    'sales_id' => $salesId,
                    'lead_label' => $baseLeadLabel,
                    'status' => 'NEW',
                    'minat_produk' => null,
                    'alasan_tertarik' => $customer->alasan_tertarik,
                    'alasan_belum' => $customer->alasan_belum,
                    'harapan' => $customer->harapan,
                    'last_contact_at' => null,
                    'next_follow_up_at' => null,
                    'create_param' => $createParamJson,
                    'create_at' => $now,
                    'update_at' => $now,
                ]);

                AktivitasLead::create([
                    'lead_id' => $lead->id,
                    'customer_id' => $customer->id,
                    'user_id' => $salesId,
                    'type' => 'lead_created',
                    'note' => 'Lead dibuat dari generate dengan label: ' . $baseLeadLabel,
                    'create_at' => $now,
                ]);

                $leadsCreated[] = [
                    'id' => $lead->id,
                    'customer_id' => $customer->id,
                    'customer_name' => $customer->nama,
                    'lead_label' => $baseLeadLabel
                ];
            }
        }

        $response = [
            'success' => true,
            'message' => 'Leads berhasil dibuat',
            'data' => [
                'total_customers' => $customers->count(),
                'leads_created' => count($leadsCreated),
                'leads_skipped' => count($leadsSkipped),
                'created' => $leadsCreated,
                'skipped' => $leadsSkipped,
                'create_param' => $createParam
            ]
        ];

        if (!empty($groupedResults)) {
            $response['data']['grouped_by_status_order'] = $groupedResults;
        }

        return response()->json($response, 201);
    }

    public function getSalesList()
    {
        $sales = User::where('divisi', '3')
            ->where('status', '!=', 'N')
            ->select('id', 'nama', 'email', 'level')
            ->orderBy('nama', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $sales
        ]);
    }

    public function getLeadLabels()
    {
        $labels = Lead::where('status', '!=', 'N')
            ->whereNotNull('lead_label')
            ->where('lead_label', '!=', '')
            ->select('lead_label')
            ->distinct()
            ->orderBy('lead_label', 'asc')
            ->pluck('lead_label');

        return response()->json([
            'success' => true,
            'data' => $labels
        ]);
    }

    public function getCustomerStatusOrders()
    {
        $statusOrders = Customer::where('status', '!=', 'N')
            ->whereNotNull('status_order')
            ->where('status_order', '!=', '')
            ->select('status_order')
            ->distinct()
            ->orderBy('status_order', 'asc')
            ->pluck('status_order')
            ->toArray();

        $uniqueStatusOrders = array_values(array_filter($statusOrders));

        return response()->json([
            'success' => true,
            'data' => $uniqueStatusOrders
        ]);
    }

    public function statistics()
    {
        $totalLeads = Lead::where('status', '!=', 'N')->count();
        $newLeads = Lead::where('status', 'NEW')->count();
        $contactedLeads = Lead::where('status', 'CONTACTED')->count();
        $qualifiedLeads = Lead::where('status', 'QUALIFIED')->count();
        $convertedLeads = Lead::where('status', 'CONVERTED')->count();
        $lostLeads = Lead::where('status', 'LOST')->count();
        $activeLeads = Lead::where('status', '!=', 'N')
            ->whereNotIn('status', ['CONVERTED', 'LOST'])
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total_leads' => $totalLeads,
                'new_leads' => $newLeads,
                'contacted_leads' => $contactedLeads,
                'qualified_leads' => $qualifiedLeads,
                'converted_leads' => $convertedLeads,
                'lost_leads' => $lostLeads,
                'active_leads' => $activeLeads,
            ]
        ]);
    }

    public function followToday(Request $request)
    {
        $userLogin = auth('api')->user();
        $userLogin->load('userData');
        $user = $userLogin->userData;
        
        if (!$user || $user->divisi != '3' || $user->level != '2') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $query = Lead::with([
            'customer_rel:id,nama,email,wa',
            'sales_rel:id,nama,level'
        ])
        ->where('sales_id', $user->id)
        ->where('status', '!=', 'N');

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->whereHas('customer_rel', function($customerQuery) use ($search) {
                    $customerQuery->where('nama', 'ILIKE', "%{$search}%");
                })
                ->orWhere('lead_label', 'ILIKE', "%{$search}%");
            });
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('lead_label') && $request->lead_label) {
            $query->where('lead_label', 'ILIKE', '%' . $request->lead_label . '%');
        }

        $perPage = $request->get('per_page', 15);
        $leads = $query->orderBy('create_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $leads->items(),
            'pagination' => [
                'current_page' => $leads->currentPage(),
                'last_page' => $leads->lastPage(),
                'per_page' => $leads->perPage(),
                'total' => $leads->total(),
            ]
        ]);
    }

    public function sendWhatsApp(Request $request, $leadId)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $lead = Lead::with('customer_rel')->find($leadId);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'Lead tidak ditemukan'
            ], 404);
        }

        if (!$lead->customer_rel || !$lead->customer_rel->wa) {
            return response()->json([
                'success' => false,
                'message' => 'Customer tidak memiliki nomor WhatsApp'
            ], 400);
        }

        $woowaKey = env('WOOWA_KEY');
        if (!$woowaKey) {
            return response()->json([
                'success' => false,
                'message' => 'Konfigurasi WhatsApp tidak ditemukan'
            ], 500);
        }

        try {
            $response = Http::asJson()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json'
                ])
                ->post('https://notifapi.com/send_message', [
                    'phone_no' => $lead->customer_rel->wa,
                    'key' => $woowaKey,
                    'message' => $request->message,
                ]);

            if ($response->successful()) {
                $userId = auth('api')->user()->userData->id ?? null;
                
                AktivitasLead::create([
                    'lead_id' => $lead->id,
                    'type' => 'whatsapp_out',
                    'note' => $request->message,
                    'user_id' => $userId,
                    'create_at' => now(),
                ]);

                FollowUpLead::create([
                    'lead_id' => $lead->id,
                    'follow_up_date' => now()->format('Y-m-d H:i:s'),
                    'channel' => 'WhatsApp',
                    'note' => $request->message,
                    'status' => '1',
                    'create_by' => $userId,
                    'create_at' => now()->format('Y-m-d H:i:s'),
                ]);

                $lead->update([
                    'last_contact_at' => now()->format('Y-m-d H:i:s'),
                    'status' => 'CONTACTED',
                    'update_at' => now()->format('Y-m-d H:i:s'),
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Pesan WhatsApp berhasil dikirim',
                    'data' => $response->json()
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal mengirim pesan WhatsApp',
                    'error' => $response->body()
                ], $response->status());
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengirim pesan',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function broadcast(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'message' => 'required|string',
            'lead_label' => 'nullable|string',
            'status' => 'nullable|string',
            'sales_id' => 'nullable|exists:user,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $woowaKey = env('WOOWA_KEY');
        if (!$woowaKey) {
            return response()->json([
                'success' => false,
                'message' => 'Konfigurasi WhatsApp tidak ditemukan'
            ], 500);
        }

        $query = Lead::with('customer_rel')
            ->where('status', '!=', 'N');

        if ($request->has('lead_label') && $request->lead_label) {
            $query->where('lead_label', 'like', '%' . $request->lead_label . '%');
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('sales_id') && $request->sales_id) {
            $query->where('sales_id', $request->sales_id);
        }

        $leads = $query->whereHas('customer_rel', function($q) {
            $q->whereNotNull('wa')->where('wa', '!=', '');
        })->get();

        if ($leads->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada lead yang sesuai dengan filter atau tidak memiliki nomor WhatsApp'
            ], 404);
        }

        $userId = auth('api')->user()->userData->id ?? null;
        $sentCount = 0;

        foreach ($leads as $lead) {
            try {
                SendLeadBroadcastJob::dispatch(
                    $lead->id,
                    $request->message,
                    $woowaKey,
                    $userId
                );
                $sentCount++;
            } catch (\Exception $e) {
                \Log::error('Gagal dispatch SendLeadBroadcastJob', [
                    'lead_id' => $lead->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Broadcast berhasil dikirim ke queue',
            'data' => [
                'total_leads' => $leads->count(),
                'sent_to_queue' => $sentCount,
                'failed' => $leads->count() - $sentCount
            ]
        ]);
    }
}


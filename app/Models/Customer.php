<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable; 
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\HasActivityLog;
use Tymon\JWTAuth\Contracts\JWTSubject;
use App\Models\User;

class Customer extends Authenticatable implements JWTSubject
{
    use HasFactory, HasActivityLog;

    protected $table = 'customer';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'nama',
        'nama_panggilan',
        'email',
        'instagram',
        'password',
        'wa',
        'wa2',
        'profesi',
        'pendapatan_bln',
        'industri_pekerjaan',
        'jenis_kelamin',
        'tanggal_lahir',
        'alamat',
        'status_order',
        'verifikasi',
        'alasan_tertarik',
        'alasan_belum',
        'harapan',
        'create_at',
        'update_at',
        'memberID',
        'keanggotaan',
        'provinsi',
        'kabupaten',
        'kecamatan',
        'sapaan',
        'kode_pos',
        'sales_id',
        'riwayat_order',
        'total_spend',
        'status',
        'last_login_at',
        // === Lead vs Customer ===
        'customer_type',
        // === Scoring Scaffold (logika diisi nanti) ===
        'rule_score',
        'ai_score',
        'total_score',
        'score_label',
        'ai_reasoning',
        'ai_recommended_action',
        'ai_sentiment',
        'score_updated_at',
    ];

    protected $hidden = [
        'password',
    ];

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [];
    }

    /**
     * Relasi ke OrderCustomer
     */
    public function orders()
    {
        return $this->hasMany(OrderCustomer::class, 'customer', 'id')
            ->where('status', '!=', 'N')
            ->orderBy('create_at', 'desc');
    }

    /**
     * Relasi ke Sales/User melalui sales_id
     */
    public function sales_rel()
    {
        return $this->belongsTo(User::class, 'sales_id', 'id');
    }

    /**
     * Relasi ke OrderCustomerArsip (Data Lama/Arsip)
     */
    public function order_arsip()
    {
        return $this->hasMany(OrderCustomerArsip::class, 'customer_id', 'id')
            ->orderBy('tanggal', 'desc');
    }

    /**
     * Scope: hanya lead (belum pernah bayar)
     */
    public function scopeLeads($query)
    {
        return $query->where('customer_type', 'lead');
    }

    /**
     * Scope: hanya customer (sudah pernah bayar)
     */
    public function scopeCustomers($query)
    {
        return $query->where('customer_type', 'customer');
    }

}
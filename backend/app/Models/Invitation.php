<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class Invitation extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'invitation';
    public $timestamps = false;

    protected $fillable = [
        'kode_invitation',
        'customer',
        'produk',
        'jadwal_id',
        'referral_customer',
        'create_by',
        'sumber',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'catatan',
        'create_at',
        'update_at',
        'status',
    ];

    public function customer_rel()
    {
        return $this->belongsTo(Customer::class, 'customer', 'id');
    }

    public function produk_rel()
    {
        return $this->belongsTo(Produk::class, 'produk', 'id');
    }

    public function jadwal_rel()
    {
        return $this->belongsTo(ProdukJadwal::class, 'jadwal_id', 'id');
    }

    public function referral_rel()
    {
        return $this->belongsTo(Customer::class, 'referral_customer', 'id');
    }

    public function create_by_rel()
    {
        return $this->belongsTo(User::class, 'create_by', 'id');
    }

    public function logs_follup()
    {
        return $this->hasMany(LogsFollup::class, 'invitation', 'id');
    }

    public function kehadiran()
    {
        return $this->hasMany(ProdukJadwalKehadiran::class, 'source_id', 'id')
            ->where('source_type', 'invitation');
    }
}

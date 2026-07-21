<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class ProdukJadwalKehadiran extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'produk_jadwal_kehadiran';
    public $timestamps = false;

    protected $casts = [
        'waktu_checkin' => 'datetime',
        'tanggal_jadwal' => 'datetime',
    ];

    protected $fillable = [
        'jadwal_id',
        'produk_id',
        'tanggal_jadwal',
        'nama_jadwal_snapshot',
        'customer_id',
        'source_type',
        'source_id',
        'status_hadir',
        'waktu_checkin',
        'checked_by',
        'create_at',
        'update_at',
        'status',
    ];

    /**
     * jadwal_id, produk_id, tanggal_jadwal, dan nama_jadwal_snapshot semuanya
     * di-freeze pada saat check-in — sengaja TIDAK selalu ikut nilai jadwal_rel
     * yang live, karena produk_jadwal sering dipakai ulang dengan tanggal diedit
     * untuk sesi berikutnya. Pakai kolom snapshot ini untuk tanggal/nama, jangan
     * jadwal_rel->waktu_mulai, supaya riwayat kehadiran lama tidak ikut berubah.
     */
    public function jadwal_rel()
    {
        return $this->belongsTo(ProdukJadwal::class, 'jadwal_id', 'id');
    }

    public function produk_rel()
    {
        return $this->belongsTo(Produk::class, 'produk_id', 'id');
    }

    public function customer_rel()
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'id');
    }

    public function checked_by_rel()
    {
        return $this->belongsTo(User::class, 'checked_by', 'id');
    }

    /**
     * source_type menentukan tabel mana yang relevan (order_customer atau invitation);
     * relasi di bawah tidak memfilter source_type karena kolom itu tidak ada
     * di tabel order_customer/invitation. Cek $this->source_type sebelum pakai relasi ini.
     */
    public function order_rel()
    {
        return $this->belongsTo(OrderCustomer::class, 'source_id', 'id');
    }

    public function invitation_rel()
    {
        return $this->belongsTo(Invitation::class, 'source_id', 'id');
    }
}

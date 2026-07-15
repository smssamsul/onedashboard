<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class OrderCustomer extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'order_customer';

      protected $casts = [
        'create_at' => 'datetime', // Foreign key ke produk_bundling
    ];

    protected $fillable = [
        'customer',
        'produk',
        'kode_order',
        'tanggal',
        'harga',
        'ongkir',
        'total_harga',
        'alamat',
        'sumber',
        'waktu_pembayaran',
        'bukti_pembayaran',
        'metode_bayar',
        'create_at',
        'update_at',
        'status',
        'status_pembayaran',
        'status_order',
        'custom_value',
        'catatan',
        'bundling',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
    ];

    public $timestamps = false;

     public function produk_rel()
    {
        return $this->belongsTo(Produk::class, 'produk', 'id');
    }

    
     public function customer_rel()
    {
        return $this->belongsTo(Customer::class, 'customer', 'id');
    }

    public function order_payment_rel()
    {
        return $this->hasMany(OrderPayment::class, 'order_id', 'id');
    }

    /**
     * Resi / pengiriman Biteship (satu order bisa banyak pengiriman).
     */
    public function order_resi()
    {
        return $this->hasMany(OrderResi::class, 'order_id', 'id');
    }

    /**
     * Relasi ke ProdukBundling
     */
    public function bundling_rel()
    {
        return $this->belongsTo(ProdukBundling::class, 'bundling', 'id');
    }

    /**
     * Relasi ke LogsFollup
     */
    public function logs_follup()
    {
        return $this->hasMany(LogsFollup::class, 'order', 'id');
    }

    /**
     * Order yang punya minimal satu kolom UTM non-kosong.
     */
    public function scopeHasUtmParams($query)
    {
        return $query->where(function ($q) {
            $q->where(function ($x) {
                $x->whereNotNull('utm_source')->where('utm_source', '!=', '');
            })->orWhere(function ($x) {
                $x->whereNotNull('utm_medium')->where('utm_medium', '!=', '');
            })->orWhere(function ($x) {
                $x->whereNotNull('utm_campaign')->where('utm_campaign', '!=', '');
            })->orWhere(function ($x) {
                $x->whereNotNull('utm_term')->where('utm_term', '!=', '');
            })->orWhere(function ($x) {
                $x->whereNotNull('utm_content')->where('utm_content', '!=', '');
            });
        });
    }

    /**
     * Order tanpa kolom UTM terisi (kebalikan scopeHasUtmParams).
     */
    public function scopeWithoutUtmParams($query)
    {
        return $query->where(function ($q) {
            $q->where(function ($x) {
                $x->whereNull('utm_source')->orWhere('utm_source', '');
            })->where(function ($x) {
                $x->whereNull('utm_medium')->orWhere('utm_medium', '');
            })->where(function ($x) {
                $x->whereNull('utm_campaign')->orWhere('utm_campaign', '');
            })->where(function ($x) {
                $x->whereNull('utm_term')->orWhere('utm_term', '');
            })->where(function ($x) {
                $x->whereNull('utm_content')->orWhere('utm_content', '');
            });
        });
    }

    /**
     * Tampilan ID publik (dari custom_value jika ada), fallback ke id numerik.
     */
    public function resolvePublicOrderRef(): string
    {
        if (! empty($this->custom_value)) {
            $cv = is_string($this->custom_value) ? json_decode($this->custom_value, true) : $this->custom_value;
            if (is_array($cv)) {
                foreach (['order_id', 'kode_order', 'nomor_order', 'reference', 'public_id', 'invoice_id'] as $key) {
                    if (! empty($cv[$key])) {
                        return (string) $cv[$key];
                    }
                }
            }
        }

        return (string) $this->id;
    }
}
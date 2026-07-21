<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;


class LogsFollup extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'logs_follup';
    public $timestamps = false;

    protected $fillable = [
        'follup',
        'customer',
        'keterangan',
        'create_at',
        'update_at',
        'type',
        'order',
        'invitation',
        'kehadiran',
        'status'
    ];

    public function follup_rel()
    {
        return $this->belongsTo(TemplateFollup::class, 'follup', 'id');
    }

    public function customer_rel()
    {
        return $this->belongsTo(Customer::class, 'customer', 'id');
    }

    public function order_rel()
    {
        return $this->belongsTo(OrderCustomer::class, 'order', 'id');
    }

    public function invitation_rel()
    {
        return $this->belongsTo(Invitation::class, 'invitation', 'id');
    }

    public function kehadiran_rel()
    {
        return $this->belongsTo(ProdukJadwalKehadiran::class, 'kehadiran', 'id');
    }
}
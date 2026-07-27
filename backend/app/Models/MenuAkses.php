<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MenuAkses extends Model
{
    protected $table = 'menu_akses';
    public $timestamps = false;

    protected $fillable = [
        'departemen_id',
        'jabatan_id',
        'menu_id',
        'create_at',
    ];

    public function departemen()
    {
        return $this->belongsTo(HrDepartemen::class, 'departemen_id', 'id');
    }

    public function jabatan()
    {
        return $this->belongsTo(Jabatan::class, 'jabatan_id', 'id');
    }

    public function menu()
    {
        return $this->belongsTo(Menu::class, 'menu_id', 'id');
    }
}

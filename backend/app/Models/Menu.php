<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Menu extends Model
{
    protected $table = 'menu';
    public $timestamps = false;

    protected $fillable = [
        'key',
        'label',
        'href',
        'icon_name',
        'section',
        'departemen_id',
        'urutan',
        'status',
        'create_at',
        'update_at',
    ];

    public function departemen()
    {
        return $this->belongsTo(HrDepartemen::class, 'departemen_id', 'id');
    }

    public function menuAkses()
    {
        return $this->hasMany(MenuAkses::class, 'menu_id', 'id');
    }
}

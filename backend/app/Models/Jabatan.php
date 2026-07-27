<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Jabatan extends Model
{
    protected $table = 'jabatan';
    public $timestamps = false;

    protected $fillable = [
        'nama',
        'create_at',
        'update_at',
    ];
}

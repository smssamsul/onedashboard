<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PixelMeta extends Model
{
    use HasFactory;

    protected $table = 'pixel_meta';

    protected $fillable = [
        'nama',
        'pixel',
        'conversion_api_token',
        'kode_testing',
    ];

    public $timestamps = false;
}

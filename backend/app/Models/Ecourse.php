<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ecourse extends Model
{
    use HasFactory;

    protected $table = 'ecourse';

    protected $fillable = [
        'title',
        'description',
        'video_path',
        'is_active',
    ];
}

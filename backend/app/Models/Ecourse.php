<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ecourse extends Model
{
    use HasFactory;

    protected $table = 'ecourse';

    protected $fillable = [
        'ecourse_bab_id',
        'title',
        'description',
        'video_path',
        'urutan',
        'is_active',
    ];

    public function bab()
    {
        return $this->belongsTo(EcourseBab::class, 'ecourse_bab_id', 'id');
    }

    public function progress()
    {
        return $this->hasMany(EcourseProgress::class, 'ecourse_id', 'id');
    }
}

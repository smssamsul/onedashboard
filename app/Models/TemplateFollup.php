<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class TemplateFollup extends Model
{
    use HasFactory;

    protected $table = 'template_follup';

    protected $fillable = [
        'nama',
        'text',
        'event',
        'create_at',
        'update_at',
        'status',
    ];

    public $timestamps = false;
}
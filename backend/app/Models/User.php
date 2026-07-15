<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Tymon\JWTAuth\Contracts\JWTSubject;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use App\Traits\HasActivityLog;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable;

    protected $table = 'user'; 

    protected $fillable = [
        'nama',
        'email',
        'tanggal_lahir',
        'tanggal_join',
        'alamat',
        'divisi',
        'level',
        'create_at',
        'update_at',
        'status',
        'no_telp',
    ];

    public $timestamps = false;

    // JWT methods
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [];
    }

     public function login()
    {
        return $this->hasOne(UserLogin::class, 'user', 'id');
    }
}


<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;
use App\Models\User;
use App\Models\OrderCustomer;
use Illuminate\Support\Facades\DB;

class Produk extends Model
{
    use HasFactory;

    protected $table = 'produk';

    protected $fillable = [
        'kategori',
        'kota',
        'tempat',
        'alamat',
        'user_input',
        'kode',
        'nama',
        'url',
        'header',
        'harga_coret',
        'harga_asli',
        'bundling',
        'jenis_produk',
        'deskripsi',
        'tanggal_event',
        'gambar',
        'landingpage',
        'create_at',
        'update_at',
        'status',
        'assign',
        'custom_field',
        'list_point',
        'testimoni',
        'fb_pixel',
        'event_fb_pixel',
        'gtm',
        'video',
        'trainer',
        'fee_trainer',
        'post',
        'tampil_jadwal',
    ];

    public $timestamps = false;

    protected $appends = ['assign_users', 'post_rel'];

    protected $casts = [
        'gambar'    => 'array',
        'assign' => 'array',
        'custom_field' => 'array',
        'list_point' => 'array',
        'testimoni' => 'array',
        'fb_pixel' => 'array',
        'event_fb_pixel' => 'array',
        'gtm' => 'array',
        'video' => 'array',
        'post' => 'array',
        'fee_trainer' => 'decimal:2',
    ];

    // Accessor untuk landingpage - decode JSON jika string
    public function getLandingpageAttribute($value)
    {
        if (empty($value)) {
            return null;
        }
        
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
        }
        
        return $value;
    }

    // Accessor untuk bundling - decode JSON jika string
    public function getBundlingAttribute($value)
    {
        if (empty($value)) {
            return null;
        }
        
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
        }
        
        return $value;
    }

    public function kategori_rel()
    {
        return $this->belongsTo(KategoriProduk::class, 'kategori', 'id');
    }

    public function user_rel()
    {
        return $this->belongsTo(User::class, 'user_input', 'id');
    }

    public function trainer_rel()
    {
        return $this->belongsTo(User::class, 'trainer', 'id');
    }

    public function orders()
    {
        return $this->hasMany(OrderCustomer::class, 'produk', 'id');
    }

    public function webinar()
    {
        return $this->hasOne(Webinar::class, 'produk', 'id');
    }

    /**
     * Relasi ke ProdukBundling
     */
    public function bundling_rel()
    {
        return $this->hasMany(ProdukBundling::class, 'produk', 'id');
    }

    /**
     * Relasi ke ProdukJadwal
     */
    public function jadwal_rel()
    {
        return $this->hasMany(ProdukJadwal::class, 'produk_id', 'id');
    }

    /**
     * Accessor untuk mendapatkan data Post dari array ID
     */
    public function getPostRelAttribute()
    {
        if (!$this->id) {
            return [];
        }

        try {
            // Ambil raw value dari attributes untuk handle JSON string
            $rawPost = $this->attributes['post'] ?? null;
            
            if (empty($rawPost)) {
                return [];
            }

            $postIds = [];
            
            // Handle jika berupa string JSON (format: "[1,3]")
            if (is_string($rawPost)) {
                $decoded = json_decode($rawPost, true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $postIds = $decoded;
                } else {
                    // Jika decode gagal, coba decode lagi (double encoded)
                    $decoded = json_decode($decoded, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $postIds = $decoded;
                    }
                }
            } 
            // Handle jika sudah berupa array
            elseif (is_array($rawPost)) {
                $postIds = $rawPost;
            }
            
            if (empty($postIds) || !is_array($postIds)) {
                return [];
            }

            // Filter hanya integer yang valid
            $validIds = [];
            foreach ($postIds as $id) {
                $intId = (int)$id;
                if ($intId > 0) {
                    $validIds[] = $intId;
                }
            }

            if (empty($validIds)) {
                return [];
            }

            $posts = Post::whereIn('id', $validIds)
                ->select('id', 'title', 'slug', 'status')
                ->get();

            if ($posts->isEmpty()) {
                return [];
            }

            return $posts->map(function($post) {
                return [
                    'id' => (int)$post->id,
                    'title' => $post->title ?? '',
                    'slug' => $post->slug ?? '',
                    'status' => $post->status ?? '',
                ];
            })->values()->toArray();

        } catch (\Exception $e) {
            return [];
        }
    }

    public function getAssignUsersAttribute()
    {
        if (!$this->id) {
            return [];
        }

        try {
            $rawAssign = $this->attributes['assign'] ?? null;
            
            if ($rawAssign === null) {
                $rawAssign = DB::table('produk')
                    ->where('id', $this->id)
                    ->value('assign');
            }

            if (empty($rawAssign)) {
                return [];
            }

            $assignArray = null;
            
            if (is_string($rawAssign)) {
                $decoded = json_decode($rawAssign, true);
                
                if (is_string($decoded)) {
                    $decoded = json_decode($decoded, true);
                }
                
                if (is_array($decoded)) {
                    $assignArray = $decoded;
                }
            } elseif (is_array($rawAssign)) {
                $assignArray = $rawAssign;
            }
            
            if (!is_array($assignArray) || empty($assignArray)) {
                return [];
            }

            $userIds = [];
            foreach ($assignArray as $id) {
                $intId = (int)$id;
                if ($intId > 0) {
                    $userIds[] = $intId;
                }
            }

            if (empty($userIds)) {
                return [];
            }

            $users = User::whereIn('id', $userIds)
                ->select('id', 'nama', 'email')
                ->get();

            if ($users->isEmpty()) {
                return [];
            }

            return $users->map(function($user) {
                return [
                    'id' => (int)$user->id,
                    'nama' => $user->nama ?? '',
                    'email' => $user->email ?? '',
                ];
            })->values()->toArray();

        } catch (\Exception $e) {
            return [];
        }
    }

}
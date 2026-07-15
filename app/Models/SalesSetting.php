<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesSetting extends Model
{
    use HasFactory;

    protected $table = 'sales_setting';

    public $timestamps = false;

    protected $fillable = [
        'token_google',
        'woowa_utama',
        'wa_engine',
    ];

    /**
     * Get the main Woowa Key from the database.
     * Fallback to the env('WOOWA_KEY') if not found in the database.
     */
    public static function getWoowaUtama(): ?string
    {
        $setting = self::first();
        return ($setting && !empty($setting->woowa_utama)) ? $setting->woowa_utama : env('WOOWA_KEY');
    }

    /**
     * Get the active WA engine ('woowa' or 'baileys').
     * Defaults to 'woowa' if not set.
     */
    public static function getWaEngine(): string
    {
        $setting = self::first();
        return ($setting && !empty($setting->wa_engine)) ? $setting->wa_engine : 'woowa';
    }
}

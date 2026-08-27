<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UnitBisnis extends Model
{
    protected $table = 'unit_bisnis';

    protected $fillable = ['nama', 'slug', 'domain', 'branding', 'create_at', 'update_at', 'status'];

    protected $casts = [
        'branding' => 'array',
    ];

    public $timestamps = false;

    public function produk()
    {
        return $this->hasMany(Produk::class, 'unit_bisnis', 'id');
    }

    public function customers()
    {
        return $this->hasMany(Customer::class, 'business_unit_id', 'id');
    }

    public function orders()
    {
        return $this->hasMany(OrderCustomer::class, 'business_unit_id', 'id');
    }

    public function sales()
    {
        return $this->hasMany(Sales::class, 'business_unit_id', 'id');
    }

    public function aiSetting()
    {
        return $this->hasOne(AiSetting::class, 'business_unit_id', 'id');
    }

    public function aiLeads()
    {
        return $this->hasMany(AiLead::class, 'business_unit_id', 'id');
    }

    public function templateFollups()
    {
        return $this->hasMany(TemplateFollup::class, 'business_unit_id', 'id');
    }

    public function salesSetting()
    {
        return $this->hasOne(SalesSetting::class, 'business_unit_id', 'id');
    }

    public function metaAdsAccounts()
    {
        return $this->hasMany(MetaAdsAccount::class, 'business_unit_id', 'id');
    }
}

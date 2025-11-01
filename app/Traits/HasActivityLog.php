<?php

namespace App\Traits;

use App\Models\Log;
use Illuminate\Support\Facades\Auth;

trait HasActivityLog
{
    public static function bootHasActivityLog()
    {
        static::created(function ($model) {
            self::writeLog($model, 'CREATE', [], $model->toArray());
        });

        static::updating(function ($model) {
            $old = $model->getOriginal();
            $new = $model->getDirty();
            self::writeLog($model, 'UPDATE', $old, $new);
        });

        static::deleted(function ($model) {
            self::writeLog($model, 'DELETE', $model->toArray(), []);
        });
    }

    protected static function writeLog($model, $action, $oldData = [], $newData = [])
    {
        $userId = Auth::id() ?? null;
        $modelName = class_basename($model);

        $desc = "**{$action}** pada tabel *{$modelName}* (ID: {$model->id})";

        if ($action === 'UPDATE' && !empty($newData)) {
            $changes = [];
            foreach ($newData as $key => $newValue) {
                $oldValue = $oldData[$key] ?? null;
                $changes[] = "{$key}: '{$oldValue}' → '{$newValue}'";
            }
            $desc .= "\nPerubahan: " . implode(", ", $changes);
        } elseif ($action === 'CREATE') {
            $desc .= "\nData baru: " . json_encode($newData);
        } elseif ($action === 'DELETE') {
            $desc .= "\nData terhapus: " . json_encode($oldData);
        }

        Log::create([
            'user' => $userId,
            'customer' => $model->customer_id ?? null,
            'keterangan' => $desc,
            'create_at' => now(),
            'update_at' => now(),
            'status' => substr($action, 0, 1), // C, U, D
        ]);
    }
}
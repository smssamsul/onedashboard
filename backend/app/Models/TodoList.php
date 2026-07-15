<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TodoList extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'todo_list';

    protected $fillable = [
        'title',
        'description',
        'created_by',
        'assigned_to',
        'priority',
        'status',
        'due_date',
        'completed_at',
        'is_reminder',
    ];

    protected $casts = [
        'due_date' => 'datetime',
        'completed_at' => 'datetime',
        'is_reminder' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Relasi ke User yang membuat todo
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by', 'id');
    }

    /**
     * Relasi ke User yang ditugaskan todo
     */
    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to', 'id');
    }
}

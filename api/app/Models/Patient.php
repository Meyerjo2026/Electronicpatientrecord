<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Patient extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    
    protected $fillable = [
        'id',
        'identifier',
        'active',
        'name',
        'telecom',
        'gender',
        'birth_date',
        'address',
        'marital_status',
        'contact',
        'communication',
        'managing_organization_id',
        'extension',
        'meta',
    ];
    
    protected $casts = [
        'identifier' => 'array',
        'name' => 'array',
        'telecom' => 'array',
        'address' => 'array',
        'marital_status' => 'array',
        'contact' => 'array',
        'communication' => 'array',
        'extension' => 'array',
        'meta' => 'array',
        'active' => 'boolean',
        'birth_date' => 'date',
    ];

    public function encounters(): HasMany
    {
        return $this->hasMany(Encounter::class, 'subject_id');
    }

    public function observations(): HasMany
    {
        return $this->hasMany(Observation::class, 'subject_id');
    }
}
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Fhir\PatientController;

Route::prefix('fhir')->group(function () {
    Route::apiResource('Patient', PatientController::class);
    
    // FHIR CapabilityStatement
    Route::get('metadata', function () {
        return response()->json([
            'resourceType' => 'CapabilityStatement',
            'status' => 'active',
            'date' => now()->toISOString(),
            'fhirVersion' => '4.0.1',
            'format' => ['json'],
            'rest' => [[
                'mode' => 'server',
                'resource' => [
                    ['type' => 'Patient', 'interaction' => [
                        ['code' => 'read'],
                        ['code' => 'vread'],
                        ['code' => 'update'],
                        ['code' => 'delete'],
                        ['code' => 'search-type'],
                        ['code' => 'create'],
                    ], 'searchParam' => [
                        ['name' => '_id', 'type' => 'token'],
                        ['name' => 'identifier', 'type' => 'token'],
                        ['name' => 'name', 'type' => 'string'],
                        ['name' => 'family', 'type' => 'string'],
                        ['name' => 'given', 'type' => 'string'],
                        ['name' => 'gender', 'type' => 'token'],
                        ['name' => 'birthdate', 'type' => 'date'],
                        ['name' => 'active', 'type' => 'token'],
                    ]],
                ],
            ]],
        ], 200, ['Content-Type' => 'application/fhir+json']);
    });
});

Route::get('/health', fn() => ['status' => 'ok']);
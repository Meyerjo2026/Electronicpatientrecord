<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('encounters', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->json('identifier')->nullable(); // FHIR Identifier[]
            $table->enum('status', [
                'planned', 'arrived', 'triaged', 'in-progress', 
                'on-scene', 'in-transit', 'at-destination', 
                'finished', 'cancelled', 'entered-in-error', 'unknown'
            ])->default('planned');
            $table->json('status_history')->nullable(); // FHIR Encounter.StatusHistory[]
            $table->enum('class', ['emergency', 'non-emergency', 'interfacility', 'medical-transport', 'community-paramedicine', 'standby'])->default('emergency');
            $table->json('class_history')->nullable();
            $table->json('type')->nullable(); // FHIR CodeableConcept[]
            $table->enum('priority', ['routine', 'urgent', 'emergent', 'critical'])->default('urgent');
            
            $table->foreignUlid('subject_id')->constrained('patients'); // Patient reference
            $table->json('episode_of_care')->nullable(); // Reference[]
            $table->json('based_on')->nullable(); // Reference[]
            
            $table->json('participant')->nullable(); // FHIR Encounter.Participant[]
            $table->foreignUlid('appointment_id')->nullable(); // Reference
            
            $table->json('period')->nullable(); // FHIR Period
            $table->json('length')->nullable(); // FHIR Duration
            $table->json('reason_code')->nullable(); // CodeableConcept[]
            $table->json('reason_reference')->nullable(); // Reference[]
            $table->json('diagnosis')->nullable(); // FHIR Encounter.Diagnosis[]
            $table->json('account')->nullable(); // Reference[]
            
            $table->json('hospitalization')->nullable(); // FHIR Encounter.Hospitalization
            $table->json('location')->nullable(); // FHIR Encounter.Location[]
            $table->foreignUlid('service_provider_id')->nullable(); // Organization
            $table->foreignUlid('part_of_id')->nullable()->constrained('encounters'); // Parent encounter
            
            $table->json('extension')->nullable(); // FHIR extensions (EMS-specific)
            $table->json('meta')->nullable(); // FHIR Meta
            
            $table->timestamps();
            
            $table->index('status');
            $table->index('class');
            $table->index('priority');
            $table->index('subject_id');
            $table->index(['subject_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('encounters');
    }
};
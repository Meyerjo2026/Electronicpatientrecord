<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medication_administrations', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->json('identifier')->nullable(); // Identifier[]
            $table->json('instantiates')->nullable(); // Canonical[]
            $table->json('part_of')->nullable(); // Reference[]
            
            $table->enum('status', [
                'in-progress', 'on-hold', 'completed', 'entered-in-error',
                'stopped', 'not-done', 'unknown'
            ])->default('completed');
            
            $table->json('status_reason')->nullable(); // CodeableConcept[]
            $table->json('category')->nullable(); // CodeableConcept[]
            $table->json('medication_codeable_concept')->nullable(); // CodeableConcept
            $table->foreignUlid('medication_reference_id')->nullable(); // Medication reference
            $table->foreignUlid('subject_id')->constrained('patients');
            $table->foreignUlid('context_id')->nullable()->constrained('encounters'); // Encounter
            $table->json('supporting_information')->nullable(); // Reference[]
            $table->dateTime('effective_date_time')->nullable();
            $table->json('effective_period')->nullable(); // Period
            $table->json('performer')->nullable(); // Performer[]
            $table->json('reason_code')->nullable(); // CodeableConcept[]
            $table->json('reason_reference')->nullable(); // Reference[]
            $table->foreignUlid('request_id')->nullable(); // MedicationRequest
            $table->json('device')->nullable(); // Reference[]
            $table->json('note')->nullable(); // Annotation[]
            $table->json('dosage')->nullable(); // Dosage
            
            $table->json('extension')->nullable();
            $table->json('meta')->nullable();
            
            $table->timestamps();
            
            $table->index('status');
            $table->index('subject_id');
            $table->index('context_id');
        });

        Schema::create('procedures', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->json('identifier')->nullable();
            $table->json('instantiates_canonical')->nullable();
            $table->json('instantiates_uri')->nullable();
            $table->json('based_on')->nullable();
            $table->json('part_of')->nullable();
            
            $table->enum('status', [
                'preparation', 'in-progress', 'on-hold', 'completed',
                'entered-in-error', 'stopped', 'not-done', 'unknown'
            ])->default('completed');
            
            $table->json('status_reason')->nullable();
            $table->json('category')->nullable(); // CodeableConcept
            $table->json('code')->nullable(); // CodeableConcept (required)
            $table->foreignUlid('subject_id')->constrained('patients');
            $table->foreignUlid('encounter_id')->nullable()->constrained('encounters');
            $table->dateTime('performed_date_time')->nullable();
            $table->json('performed_period')->nullable();
            $table->foreignUlid('recorder_id')->nullable(); // Practitioner
            $table->foreignUlid('asserter_id')->nullable(); // Practitioner
            $table->json('performer')->nullable(); // Performer[]
            $table->foreignUlid('location_id')->nullable(); // Location
            $table->json('reason_code')->nullable();
            $table->json('reason_reference')->nullable();
            $table->json('body_site')->nullable(); // CodeableConcept[]
            $table->json('outcome')->nullable(); // CodeableConcept
            $table->json('report')->nullable(); // Reference[]
            $table->json('complication')->nullable();
            $table->json('complication_detail')->nullable();
            $table->json('follow_up')->nullable();
            $table->json('note')->nullable();
            $table->json('focal_device')->nullable();
            $table->json('used_reference')->nullable();
            $table->json('used_code')->nullable();
            
            $table->json('extension')->nullable();
            $table->json('meta')->nullable();
            
            $table->timestamps();
            
            $table->index('status');
            $table->index('subject_id');
            $table->index('encounter_id');
        });

        Schema::create('conditions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->json('identifier')->nullable();
            $table->json('clinical_status')->nullable(); // CodeableConcept
            $table->json('verification_status')->nullable(); // CodeableConcept
            $table->json('category')->nullable(); // CodeableConcept[]
            $table->json('severity')->nullable(); // CodeableConcept
            $table->json('code')->nullable(); // CodeableConcept (required)
            $table->json('body_site')->nullable(); // CodeableConcept[]
            $table->foreignUlid('subject_id')->constrained('patients');
            $table->foreignUlid('encounter_id')->nullable()->constrained('encounters');
            $table->dateTime('onset_date_time')->nullable();
            $table->json('onset_period')->nullable();
            $table->string('onset_string')->nullable();
            $table->json('onset_age')->nullable();
            $table->json('onset_range')->nullable();
            $table->dateTime('abatement_date_time')->nullable();
            $table->json('abatement_period')->nullable();
            $table->string('abatement_string')->nullable();
            $table->json('abatement_age')->nullable();
            $table->json('abatement_range')->nullable();
            $table->dateTime('recorded_date')->nullable();
            $table->foreignUlid('recorder_id')->nullable();
            $table->foreignUlid('asserter_id')->nullable();
            $table->json('stage')->nullable();
            $table->json('evidence')->nullable();
            $table->json('note')->nullable();
            
            $table->json('extension')->nullable();
            $table->json('meta')->nullable();
            
            $table->timestamps();
            
            $table->index('subject_id');
            $table->index('encounter_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conditions');
        Schema::dropIfExists('procedures');
        Schema::dropIfExists('medication_administrations');
    }
};
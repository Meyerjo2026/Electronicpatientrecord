<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('observations', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->json('identifier')->nullable(); // FHIR Identifier[]
            $table->json('based_on')->nullable(); // Reference[]
            $table->json('part_of')->nullable(); // Reference[]
            
            $table->enum('status', [
                'registered', 'preliminary', 'final', 'amended',
                'corrected', 'cancelled', 'entered-in-error', 'unknown'
            ])->default('final');
            
            $table->json('category')->nullable(); // CodeableConcept[]
            $table->json('code')->nullable(); // CodeableConcept (required)
            $table->foreignUlid('subject_id')->constrained('patients');
            $table->json('focus')->nullable(); // Reference[]
            $table->foreignUlid('encounter_id')->nullable()->constrained('encounters');
            
            $table->json('effective_date_time')->nullable(); // dateTime
            $table->json('effective_period')->nullable(); // Period
            $table->dateTime('issued')->nullable();
            $table->json('performer')->nullable(); // Reference[]
            
            // Value[x] - only one should be set
            $table->json('value_quantity')->nullable(); // Quantity
            $table->json('value_codeable_concept')->nullable(); // CodeableConcept
            $table->string('value_string')->nullable();
            $table->boolean('value_boolean')->nullable();
            $table->json('value_range')->nullable(); // Range
            $table->json('value_ratio')->nullable(); // Ratio
            $table->json('value_sampled_data')->nullable(); // SampledData (waveforms)
            
            $table->json('data_absent_reason')->nullable(); // CodeableConcept
            $table->json('interpretation')->nullable(); // CodeableConcept[]
            $table->json('note')->nullable(); // Annotation[]
            $table->json('body_site')->nullable(); // CodeableConcept
            $table->json('method')->nullable(); // CodeableConcept
            $table->foreignUlid('specimen_id')->nullable(); // Reference
            $table->foreignUlid('device_id')->nullable(); // Device reference
            $table->json('reference_range')->nullable(); // ReferenceRange[]
            $table->json('has_member')->nullable(); // Reference[]
            $table->json('derived_from')->nullable(); // Reference[]
            $table->json('component')->nullable(); // Observation.Component[]
            
            $table->json('extension')->nullable(); // FHIR extensions
            $table->json('meta')->nullable(); // FHIR Meta
            
            $table->timestamps();
            
            $table->index('status');
            $table->index('subject_id');
            $table->index('encounter_id');
            $table->index(['subject_id', 'encounter_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('observations');
    }
};
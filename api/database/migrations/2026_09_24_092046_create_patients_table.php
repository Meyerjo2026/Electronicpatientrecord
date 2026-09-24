<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->json('identifier')->nullable(); // FHIR Identifier[]
            $table->boolean('active')->default(true);
            $table->json('name')->nullable(); // FHIR HumanName[]
            $table->json('telecom')->nullable(); // FHIR ContactPoint[]
            $table->enum('gender', ['male', 'female', 'other', 'unknown'])->nullable();
            $table->date('birth_date')->nullable();
            $table->json('address')->nullable(); // FHIR Address[]
            $table->json('marital_status')->nullable(); // CodeableConcept
            $table->json('contact')->nullable(); // FHIR Patient.Contact[]
            $table->json('communication')->nullable(); // FHIR Patient.Communication[]
            $table->ulid('managing_organization_id')->nullable();
            $table->json('extension')->nullable(); // FHIR extensions
            $table->json('meta')->nullable(); // FHIR Meta
            $table->timestamps();
            
            $table->index('active');
            $table->index('gender');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
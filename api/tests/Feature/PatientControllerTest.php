<?php

namespace Tests\Feature;

use App\Models\Patient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientControllerTest extends TestCase
{
    use RefreshDatabase;

    private function patientPayload(array $overrides = []): array
    {
        return array_merge([
            'resourceType' => 'Patient',
            'name' => [
                [
                    'use' => 'official',
                    'family' => 'Snow',
                    'given' => ['Jon'],
                ],
            ],
            'gender' => 'male',
            'birthDate' => '1980-05-15',
            'active' => true,
        ], $overrides);
    }

    public function test_metadata_returns_capability_statement(): void
    {
        $response = $this->getJson('/api/fhir/metadata');

        $response
            ->assertOk()
            ->assertHeader('content-type', 'application/fhir+json')
            ->assertJsonPath('resourceType', 'CapabilityStatement')
            ->assertJsonPath('fhirVersion', '4.0.1')
            ->assertJsonPath('rest.0.resource.0.type', 'Patient');
    }

    public function test_store_creates_patient(): void
    {
        $response = $this->postJson('/api/fhir/Patient', $this->patientPayload());

        $response
            ->assertCreated()
            ->assertHeader('content-type', 'application/fhir+json')
            ->assertHeader('Location')
            ->assertJsonPath('resourceType', 'Patient')
            ->assertJsonPath('name.0.family', 'Snow')
            ->assertJsonPath('gender', 'male');

        $this->assertDatabaseHas('patients', ['gender' => 'male']);
    }

    public function test_store_returns_operation_outcome_for_invalid_fhir(): void
    {
        $response = $this->postJson('/api/fhir/Patient', [
            'resourceType' => 'Patient',
            'name' => 'not-an-array',
        ]);

        $response
            ->assertStatus(400)
            ->assertJsonPath('resourceType', 'OperationOutcome')
            ->assertJsonPath('issue.0.code', 'invalid');
    }

    public function test_show_returns_patient_with_etag(): void
    {
        $patient = Patient::create([
            'id' => '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            'name' => [
                ['family' => 'Targaryen', 'given' => ['Daenerys']],
            ],
            'gender' => 'female',
            'active' => true,
            'meta' => ['versionId' => '1'],
        ]);

        $this->getJson("/api/fhir/Patient/{$patient->id}")
            ->assertOk()
            ->assertHeader('etag', 'W/"1"')
            ->assertJsonPath('resourceType', 'Patient')
            ->assertJsonPath('id', $patient->id)
            ->assertJsonPath('name.0.family', 'Targaryen');
    }

    public function test_show_missing_patient_returns_404(): void
    {
        $this->getJson('/api/fhir/Patient/does-not-exist')->assertNotFound();
    }

    public function test_update_increments_version_id(): void
    {
        $patient = Patient::create([
            'id' => '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            'name' => [['family' => 'Stark', 'given' => ['Arya']]],
            'gender' => 'female',
            'active' => true,
            'meta' => ['versionId' => '1'],
        ]);

        $response = $this->putJson("/api/fhir/Patient/{$patient->id}", $this->patientPayload([
            'id' => $patient->id,
            'name' => [['family' => 'Stark', 'given' => ['Arya']]],
            'gender' => 'female',
        ]));

        $response
            ->assertOk()
            ->assertHeader('etag', 'W/"2"')
            ->assertJsonPath('meta.versionId', '2');
    }

    public function test_destroy_removes_patient(): void
    {
        $patient = Patient::create([
            'id' => '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            'name' => [['family' => 'Bolton', 'given' => ['Ramsay']]],
            'active' => true,
        ]);

        $this->deleteJson("/api/fhir/Patient/{$patient->id}")->assertStatus(204);

        $this->getJson("/api/fhir/Patient/{$patient->id}")->assertNotFound();
        $this->assertDatabaseMissing('patients', ['id' => $patient->id]);
    }

    public function test_index_returns_searchset_bundle(): void
    {
        Patient::create([
            'id' => '01B5K7M9NTVZ2CFGH4JKMNP8V',
            'name' => [['family' => 'Tarley', 'given' => ['Samwell']]],
            'gender' => 'male',
            'birth_date' => '1980-05-15',
            'active' => true,
        ]);

        $response = $this->getJson('/api/fhir/Patient');

        $response
            ->assertOk()
            ->assertHeader('content-type', 'application/fhir+json')
            ->assertJsonPath('resourceType', 'Bundle')
            ->assertJsonPath('type', 'searchset')
            ->assertJsonPath('total', 1)
            ->assertJsonCount(1, 'entry');
    }

    public function test_index_filters_by_gender(): void
    {
        Patient::create([
            'id' => '01B5K7M9NTVZ2CFGH4JKMNP8V',
            'name' => [['family' => 'Tarley', 'given' => ['Samwell']]],
            'gender' => 'male',
            'active' => true,
        ]);
        Patient::create([
            'id' => '01B5K7M9NTVZ2CFGH4JKMNP8W',
            'name' => [['family' => 'Sansa', 'given' => ['Stark']]],
            'gender' => 'female',
            'active' => true,
        ]);

        $this->getJson('/api/fhir/Patient?gender=female')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('entry.0.resource.gender', 'female');
    }

    public function test_index_searches_by_name_substring(): void
    {
        Patient::create([
            'id' => '01B5K7M9NTVZ2CFGH4JKMNP8V',
            'name' => [['family' => 'Snow', 'given' => ['Jon']]],
            'gender' => 'male',
            'active' => true,
        ]);
        Patient::create([
            'id' => '01B5K7M9NTVZ2CFGH4JKMNP8W',
            'name' => [['family' => 'Lannister', 'given' => ['Tyrion']]],
            'gender' => 'male',
            'active' => true,
        ]);

        $this->getJson('/api/fhir/Patient?name=Snow')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('entry.0.resource.name.0.family', 'Snow');
    }
}
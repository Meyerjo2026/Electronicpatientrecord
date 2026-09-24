<?php

namespace App\Http\Controllers\Api\Fhir;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Ardenexal\FHIRTools\Component\Models\R4\Resource\PatientResource as FhirPatient;
use Ardenexal\FHIRTools\Component\Serialization\FHIRSerializationService;

class PatientController extends Controller
{
    protected FHIRSerializationService $serializer;

    public function __construct()
    {
        $this->serializer = FHIRSerializationService::createDefault();
    }

    /**
     * Search patients with FHIR search parameters
     */
    public function index(Request $request): JsonResponse
    {
        $query = Patient::query();

        // FHIR search parameters
        if ($request->has('identifier')) {
            $query->whereJsonContains('identifier', [['value' => $request->identifier]]);
        }
        if ($request->has('name')) {
            $query->whereRaw("JSON_SEARCH(name, 'one', ?) IS NOT NULL", [$request->name]);
        }
        if ($request->has('family')) {
            $query->whereRaw("JSON_SEARCH(name, 'one', ?) IS NOT NULL", [$request->family]);
        }
        if ($request->has('given')) {
            $query->whereRaw("JSON_SEARCH(name, 'one', ?) IS NOT NULL", [$request->given]);
        }
        if ($request->has('gender')) {
            $query->where('gender', $request->gender);
        }
        if ($request->has('birthdate')) {
            $query->where('birth_date', $request->birthdate);
        }
        if ($request->has('active')) {
            $query->where('active', filter_var($request->active, FILTER_VALIDATE_BOOLEAN));
        }

        // Pagination
        $count = min($request->integer('_count', 20), 100);
        $offset = $request->integer('_offset', 0);

        $total = $query->count();
        $patients = $query->skip($offset)->take($count)->get();

        // Build FHIR Bundle
        $bundle = [
            'resourceType' => 'Bundle',
            'type' => 'searchset',
            'total' => $total,
            'entry' => $patients->map(function ($patient) use ($request) {
                return [
                    'fullUrl' => url("/api/fhir/Patient/{$patient->id}"),
                    'resource' => $this->toFhirPatient($patient),
                    'search' => ['mode' => 'match'],
                ];
            })->values()->all(),
        ];

        // Add pagination links
        $baseUrl = url('/api/fhir/Patient');
        $bundle['link'] = [];
        if ($offset > 0) {
            $bundle['link'][] = ['relation' => 'previous', 'url' => "{$baseUrl}?_count={$count}&_offset=" . max(0, $offset - $count)];
        }
        if ($offset + $count < $total) {
            $bundle['link'][] = ['relation' => 'next', 'url' => "{$baseUrl}?_count={$count}&_offset=" . ($offset + $count)];
        }
        $bundle['link'][] = ['relation' => 'self', 'url' => $request->fullUrl()];

        return response()->json($bundle, 200, ['Content-Type' => 'application/fhir+json']);
    }

    /**
     * Create a new patient
     */
    public function store(Request $request): JsonResponse
    {
        $fhirData = $request->json()->all();
        
        // Validate as FHIR Patient using serialization service
        try {
            $fhirPatient = $this->serializer->deserialize(
                json_encode($fhirData), 
                FhirPatient::class
            );
        } catch (\Throwable $e) {
            return response()->json([
                'resourceType' => 'OperationOutcome',
                'issue' => [[
                    'severity' => 'error',
                    'code' => 'invalid',
                    'diagnostics' => 'Invalid FHIR Patient JSON: ' . $e->getMessage(),
                ]],
            ], 400, ['Content-Type' => 'application/fhir+json']);
        }

        $patient = Patient::create([
            'id' => $fhirData['id'] ?? Str::uuid(),
            'identifier' => $fhirData['identifier'] ?? null,
            'active' => $fhirData['active'] ?? true,
            'name' => $fhirData['name'] ?? null,
            'telecom' => $fhirData['telecom'] ?? null,
            'gender' => $fhirData['gender'] ?? null,
            'birth_date' => $fhirData['birthDate'] ?? null,
            'address' => $fhirData['address'] ?? null,
            'marital_status' => $fhirData['maritalStatus'] ?? null,
            'contact' => $fhirData['contact'] ?? null,
            'communication' => $fhirData['communication'] ?? null,
            'managing_organization_id' => $this->extractReferenceId($fhirData['managingOrganization'] ?? null),
            'extension' => $fhirData['extension'] ?? null,
            'meta' => array_merge([
                'versionId' => '1',
                'lastUpdated' => now()->toISOString(),
                'source' => 'prehospital-epr-api',
            ], $fhirData['meta'] ?? []),
        ]);

        return response()->json($this->toFhirPatient($patient), 201, [
            'Content-Type' => 'application/fhir+json',
            'Location' => url("/api/fhir/Patient/{$patient->id}"),
            'ETag' => 'W/"' . $patient->meta['versionId'] . '"',
        ]);
    }

    /**
     * Get a single patient
     */
    public function show(string $id): JsonResponse
    {
        $patient = Patient::findOrFail($id);
        
        return response()->json($this->toFhirPatient($patient), 200, [
            'Content-Type' => 'application/fhir+json',
            'ETag' => 'W/"' . $patient->meta['versionId'] . '"',
            'Last-Modified' => $patient->meta['lastUpdated'],
        ]);
    }

    /**
     * Update a patient (PUT - full replace)
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $patient = Patient::findOrFail($id);
        $fhirData = $request->json()->all();
        
        // Ensure ID matches
        $fhirData['id'] = $id;
        
        try {
            $fhirPatient = $this->serializer->deserialize(
                json_encode($fhirData), 
                FhirPatient::class
            );
        } catch (\Throwable $e) {
            return response()->json([
                'resourceType' => 'OperationOutcome',
                'issue' => [[
                    'severity' => 'error',
                    'code' => 'invalid',
                    'diagnostics' => 'Invalid FHIR Patient JSON: ' . $e->getMessage(),
                ]],
            ], 400, ['Content-Type' => 'application/fhir+json']);
        }

        $versionId = (int)($patient->meta['versionId'] ?? 1) + 1;
        
        $patient->update([
            'identifier' => $fhirData['identifier'] ?? null,
            'active' => $fhirData['active'] ?? true,
            'name' => $fhirData['name'] ?? null,
            'telecom' => $fhirData['telecom'] ?? null,
            'gender' => $fhirData['gender'] ?? null,
            'birth_date' => $fhirData['birthDate'] ?? null,
            'address' => $fhirData['address'] ?? null,
            'marital_status' => $fhirData['maritalStatus'] ?? null,
            'contact' => $fhirData['contact'] ?? null,
            'communication' => $fhirData['communication'] ?? null,
            'managing_organization_id' => $this->extractReferenceId($fhirData['managingOrganization'] ?? null),
            'extension' => $fhirData['extension'] ?? null,
            'meta' => array_merge([
                'versionId' => (string)$versionId,
                'lastUpdated' => now()->toISOString(),
                'source' => 'prehospital-epr-api',
            ], $fhirData['meta'] ?? []),
        ]);

        return response()->json($this->toFhirPatient($patient->fresh()), 200, [
            'Content-Type' => 'application/fhir+json',
            'ETag' => 'W/"' . $versionId . '"',
            'Last-Modified' => now()->toISOString(),
        ]);
    }

    /**
     * Delete a patient
     */
    public function destroy(string $id): JsonResponse
    {
        $patient = Patient::findOrFail($id);
        $patient->delete();
        
        return response()->json(null, 204);
    }

    /**
     * Convert Eloquent model to FHIR Patient array
     */
    protected function toFhirPatient(Patient $patient): array
    {
        $fhir = [
            'resourceType' => 'Patient',
            'id' => $patient->id,
            'meta' => $patient->meta ?? [
                'versionId' => '1',
                'lastUpdated' => $patient->updated_at->toISOString(),
                'source' => 'prehospital-epr-api',
            ],
        ];

        if ($patient->identifier) $fhir['identifier'] = $patient->identifier;
        if ($patient->active !== null) $fhir['active'] = $patient->active;
        if ($patient->name) $fhir['name'] = $patient->name;
        if ($patient->telecom) $fhir['telecom'] = $patient->telecom;
        if ($patient->gender) $fhir['gender'] = $patient->gender;
        if ($patient->birth_date) $fhir['birthDate'] = $patient->birth_date;
        if ($patient->address) $fhir['address'] = $patient->address;
        if ($patient->marital_status) $fhir['maritalStatus'] = $patient->marital_status;
        if ($patient->contact) $fhir['contact'] = $patient->contact;
        if ($patient->communication) $fhir['communication'] = $patient->communication;
        if ($patient->managing_organization_id) {
            $fhir['managingOrganization'] = [
                'reference' => "Organization/{$patient->managing_organization_id}",
            ];
        }
        if ($patient->extension) $fhir['extension'] = $patient->extension;

        return $fhir;
    }

    /**
     * Extract ID from FHIR Reference
     */
    protected function extractReferenceId(?array $reference): ?string
    {
        if (!$reference || !isset($reference['reference'])) {
            return null;
        }
        
        $parts = explode('/', $reference['reference']);
        return end($parts);
    }
}
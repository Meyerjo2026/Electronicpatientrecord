# Prehospital Electronic Patient Record (EPR) Platform - Architecture

## System Overview
A comprehensive, offline-first electronic patient record platform designed for prehospital emergency medical services (EMS) with FHIR R4 compliance, HIPAA adherence, and real-time hospital integration capabilities.

## Core Requirements

### Clinical Workflows
- **Patient Assessment**: Primary/Secondary surveys, ABCDE approach
- **Vital Signs Capture**: Manual entry + device integration (Bluetooth monitors)
- **Interventions/Treatments**: Medications, procedures, airway management
- **Triage Systems**: START, ESI, MTS, CTAS support
- **Documentation**: Narrative notes, timestamps, provider signatures
- **Handoff**: IMIST-AMBO, SBAR structured handoff to receiving facility

### Technical Requirements
- **Offline-First**: Full functionality without network connectivity
- **FHIR R4 Compliance**: Native FHIR resources for interoperability
- **HIPAA/GDPR**: End-to-end encryption, audit trails, access controls
- **Real-time Sync**: Conflict-free replicated data types (CRDTs) for multi-device
- **Device Integration**: Bluetooth LE for vital signs monitors, 12-lead ECG
- **Audit Logging**: Immutable, tamper-evident audit trail

## Architecture Components

### 1. Data Layer (Offline-First)
```
┌─────────────────────────────────────────────────────────────┐
│                    Client Devices                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Tablet     │  │  Phone      │  │  Toughbook  │          │
│  │  (Primary)  │  │  (Backup)   │  │  (Vehicle)  │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Local Database (SQLite/IndexedDB)          │    │
│  │  • Patient Records    • Encounters    • Observations │    │
│  │  • Medications        • Procedures    • Documents    │    │
│  └────────────────────────┬──────────────────────────────┘    │
│                           │                                    │
│                    Sync Engine (CRDT-based)                    │
│                           │                                    │
│         ┌─────────────────┼─────────────────┐                 │
│         ▼                 ▼                 ▼                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  FHIR       │  │  Hospital   │  │  Analytics  │          │
│  │  Server     │  │  Integration│  │  Warehouse  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 2. Data Models (FHIR R4 Resources)

#### Core Resources
- **Patient**: Demographics, identifiers, emergency contacts
- **Encounter**: EMS activation, scene, transport, hospital arrival
- **Observation**: Vital signs, assessments, device measurements
- **MedicationAdministration**: Drug administration records
- **Procedure**: Interventions, airway, vascular access
- **Condition**: Clinical impressions, diagnoses
- **ServiceRequest**: Orders, protocols, standing orders
- **DiagnosticReport**: ECG, lab results, imaging
- **DocumentReference**: PDF reports, narratives, signatures
- **AuditEvent**: Security, access, modification logs

#### Extensions (EMS-Specific)
- `EMSUnit`: Unit identifier, level (BLS/ALS/CC)
- `EMSProvider`: Provider credentials, role, signature
- `SceneDetails`: Location type, mechanism, hazards
- `TransportDetails`: Mode, destination, priority, times
- `VitalSignsSet`: Structured vital signs with device metadata
- `ProtocolDeviation`: Protocol exceptions with justification

### 3. Sync Engine (CRDT-Based)
- **Conflict Resolution**: Last-writer-wins with clinical priority
- **Vector Clocks**: Causality tracking for concurrent edits
- **Selective Sync**: Priority-based (critical data first)
- **Delta Sync**: Only transmit changes since last sync
- **Offline Queue**: Persistent operation log for replay

### 4. Security Architecture
```
┌────────────────────────────────────────────────────────────┐
│                    Security Layers                          │
├────────────────────────────────────────────────────────────┤
│  Transport: TLS 1.3, Certificate Pinning                   │
│  Storage: AES-256-GCM (data at rest), Keychain/Keystore    │
│  Auth: OAuth 2.0 + PKCE, FIDO2/WebAuthn, Biometric         │
│  Authorization: RBAC (Provider, Supervisor, Admin, Auditor)│
│  Audit: Append-only, signed, immutable (Merkle tree)       │
│  Privacy: Field-level encryption for PHI, tokenization      │
└────────────────────────────────────────────────────────────┘
```

### 5. Hospital Integration
- **FHIR Messaging**: HL7 FHIR Messages (Bundle transactions)
- **CDA/CCD**: Continuity of Care Documents for handoff
- **Direct Messaging**: Secure email for document exchange
- **API Gateway**: Rate limiting, transformation, validation
- **Event Streaming**: Kafka/FHIR Subscriptions for real-time

## Tech Stack

### Frontend (Cross-Platform)
- **Framework**: React Native / Expo (iOS, Android, Web)
- **State**: Redux Toolkit + RTK Query (offline cache)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Victory Native (vital signs trends)
- **Maps**: Mapbox GL (scene location, hospital routing)

### Backend (Cloud/Edge)
- **API**: Node.js/TypeScript (Fastify) or Go
- **FHIR Server**: HAPI FHIR / Aidbox / Custom
- **Database**: PostgreSQL (primary) + Redis (cache/sessions)
- **Sync**: Custom CRDT engine or Automerge/Yjs
- **Message Queue**: NATS / Redis Streams
- **Search**: Elasticsearch (patient lookup)

### Infrastructure
- **Container**: Docker + Kubernetes (EKS/GKE)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana + OpenTelemetry
- **Logging**: Loki + Structured JSON logs
- **Secrets**: HashiCorp Vault / AWS Secrets Manager

## Deployment Models

### 1. Cloud-Hosted (SaaS)
- Multi-tenant with data isolation
- Managed FHIR server
- Automatic updates

### 2. On-Premises / Air-Gapped
- Full offline capability
- Local FHIR server
- Manual update process

### 3. Hybrid
- Cloud for analytics/backup
- Edge for operations
- Selective sync policies

## Data Flow: Patient Encounter

```
1. DISPATCH
   └─► Create Encounter (status: planned)
       └─► Assign Unit/Providers
           └─► Navigate to Scene

2. ON SCENE
   └─► Update Encounter (status: arrived)
       └─► Patient Assessment (Observation)
           └─► Vital Signs (Observation + Device)
               └─► Interventions (Procedure/MedAdmin)
                   └─► Clinical Impression (Condition)

3. TRANSPORT
   └─► Update Encounter (status: in-transit)
       └─► Continuous Vitals (Observation stream)
           └─► Hospital Notification (ServiceRequest)
               └─► Receiving Facility Selection

4. HANDOFF
   └─► Generate Handoff Document (DocumentReference)
       └─► FHIR Bundle Transfer
           └─► Update Encounter (status: finished)

5. POST-ENCOUNTER
   └─► Quality Review (AuditEvent)
       └─► Data Warehouse (Analytics)
           └─► Protocol Compliance Reporting
```

## Compliance Checklist

### HIPAA
- [ ] Encryption at rest (AES-256)
- [ ] Encryption in transit (TLS 1.3)
- [ ] Access controls (RBAC, MFA)
- [ ] Audit logging (immutable)
- [ ] Business Associate Agreements
- [ ] Data retention/disposal policies
- [ ] Breach notification procedures

### FHIR R4
- [ ] Core resources implemented
- [ ] Search parameters supported
- [ ] Profiles/extensions validated
- [ ] Terminology bindings (SNOMED, LOINC, RxNorm)
- [ ] CapabilityStatement published

### EMS Standards
- [ ] NEMSIS v3.5 compatibility
- [ ] HL7 v2.5.1 ADT/ORM support
- [ ] IHE PAM/PDQ/PIX integration
- [ ] DICOM for ECG waveforms

## Performance Targets

| Metric | Target |
|--------|--------|
| Offline write latency | < 50ms |
| Sync time (1000 records) | < 5s |
| App cold start | < 3s |
| Vital signs chart render | < 100ms |
| Patient search (10k records) | < 200ms |
| Battery impact (12hr shift) | < 15% |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data loss | CRDT + local persistence + auto-backup |
| Network partition | Offline-first, queue operations |
| Device theft | Remote wipe, encryption, no PHI in logs |
| Protocol drift | Versioned protocols, forced updates |
| Regulatory change | Configurable compliance rules |
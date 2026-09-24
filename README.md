# Electronicpatientrecord (prehospital-epr)

Offline-first emergency medical service (EMS) electronic patient record (EPR) platform built on the FHIR R4 standard. Crews can capture patient data in the field on mobile devices with no connectivity, sync it to the cloud once back online, and hand off a full clinical record to receiving facilities.

## Architecture

Monorepo with three tiers:

| Path | Stack | Purpose |
|------|-------|---------|
| `apps/mobile` | React Native + Expo | Field-facing EPR capture app (offline-first) |
| `packages/core` | TypeScript | FHIR R4 base types, schemas, and resource factories |
| `packages/fhir` | TypeScript | FHIR bundle builders and resource validation |
| `packages/sync` | TypeScript | CRDT + vector-clock conflict-free synchronization engine |
| `packages/security` | TypeScript | Field-level encryption, JWT auth, RBAC, audit log with integrity chain, consent management |
| `packages/clinical` | TypeScript | Triage (START/JUMPSTART/ESI), handoff (IMIST-AMBO/SBAR/FHIR/CDA), device integration |
| `api/` | Laravel 11 | FHIR R4 REST API (`/api/fhir/...`): Patient CRUD, search, CapabilityStatement |

`apps/web` and `apps/fhir-server` are reserved placeholders.

### Design principles

- **FHIR R4 first** – every domain type is a validated FHIR resource (`zod` schemas in `packages/core`).
- **Offline-first sync** – operations are created locally as CRDT ops and merged conflict-free via vector clocks (`packages/sync`), with clinical-priority conflict resolution.
- **Privacy by default** – PHI fields are encrypted field-level (`packages/security`), access is governed by role-based permissions, and every data access is audited with a tamper-evident integrity chain.
- **Clinical protocols built in** – triage and handoff are driven by validated protocol definitions, and vital-sign monitors stream directly into the record.

## Getting started

Requires Node.js >= 20, npm >= 10, PHP >= 8.3, and Composer.

```sh
# Install workspace (TypeScript packages + mobile app)
npm install --include=dev

# Install the Laravel API
cd api && composer install && cp .env.example .env && php artisan key:generate
```

> **Note:** if your environment sets `npm config set omit=dev`, devDependencies (including `jest`/`typescript`) are skipped by default. Pass `--include=dev` as above.

## Running the app

```sh
npm run dev:mobile     # Expo dev server for the mobile app
cd api && php artisan serve
```

## Testing

Every change should keep the full suite green. The same commands run in CI (`.github/workflows/ci.yml`).

```sh
# TypeScript packages (core, fhir, sync, security, clinical)
npm test --workspace=packages/core \
          --workspace=packages/fhir \
          --workspace=packages/sync \
          --workspace=packages/security \
          --workspace=packages/clinical

# Laravel API (in-memory SQLite)
cd api && ./vendor/bin/phpunit

# Typecheck everything before pushing
npm run typecheck --workspace=packages/core \
                  --workspace=packages/fhir \
                  --workspace=packages/sync \
                  --workspace=packages/security \
                  --workspace=packages/clinical
```

Or run the full root script (all workspaces):

```sh
npm run test
```

## CI

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:

- **TypeScript job** – `npm ci --include=dev`, typecheck, build, and Jest test suites for the five packages.
- **PHP job** – `composer install` and `./vendor/bin/phpunit` (feature tests use an in-memory SQLite database).

## Repository layout

```
apps/mobile/                 # Expo / React Native EPR app
packages/core/               # FHIR types, zod schemas, resource factories
packages/fhir/               # Bundle builders, validation, search params
packages/sync/               # CRDT engine, vector clocks, conflict resolution
packages/security/           # Crypto, auth, RBAC, audit, consent
packages/clinical/           # Triage, handoff, device integration
api/                         # Laravel FHIR R4 API
.github/workflows/ci.yml     # CI pipeline
```
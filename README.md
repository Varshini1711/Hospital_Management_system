# Hospital Inpatient & Bed Management System

MongoDB-backed bed and admission tracker with a live occupancy dashboard.
Built for the NoSQL Databases Mini Project.

## Stack
Node.js, Express, Mongoose (MongoDB), vanilla HTML/CSS/JS frontend.

## Setup

```bash
cd hospital-bed-management
npm install
cp .env.example .env        # edit MONGO_URI if not running Mongo locally
npm run seed                # loads sample wards, doctors, patients
npm start                   # or: npm run dev (nodemon)
```

Open http://localhost:5000 — the dashboard polls the API every 8 seconds.

Requires a running MongoDB instance (local `mongod`, or a free Atlas cluster —
paste its connection string into `MONGO_URI`).

## Schema design decisions

| Relationship | Choice | Why |
|---|---|---|
| Patient → Vitals readings | **Embedded** array (`vitalsHistory`) | Vitals belong to exactly one patient, are always read alongside the patient record, and the array is bounded (a few dozen readings per stay). One query returns the full history with zero joins. |
| Patient → Doctor | **Referenced** (`assignedDoctor: ObjectId`) | A doctor is shared across many patients and updated independently (e.g. contact info, on-call status). Embedding would duplicate doctor data across every patient and require a multi-document update whenever a doctor's details change. |
| Patient → Ward | **Referenced** (`admission.ward: ObjectId`) | Wards are a small, slowly-changing reference collection (capacity, floor). Referencing keeps ward metadata in one place and lets the occupancy aggregation `$lookup` patients per ward. |

This is a deliberate embedded-vs-referenced contrast for the report: one
one-to-many "contains" relationship (embed) and two many-to-one "shared
entity" relationships (reference).

## Indexing

```js
patientSchema.index({ "admission.ward": 1, "admission.status": 1 });
```

Compound index on `(ward, status)` because the dashboard's core query is
"active beds in ward X" — Mongo answers it with a single index scan instead
of scanning a single-field index and filtering the rest in memory. Run
`.explain("executionStats")` on `Patient.find({ "admission.ward": id,
"admission.status": "Admitted" })` before/after adding the index for the
report's performance screenshots.

## Aggregation pipelines

**Occupancy by ward** (`GET /api/dashboard/occupancy`) — starts from `Ward`
(not `Patient`) so empty wards still appear at 0%, uses `$lookup` with a
sub-pipeline to pull only non-discharged patients per ward, then `$addFields`
to compute `occupiedBeds`, `availableBeds`, and `occupancyRate`. See
`routes/dashboard.js`.

**Hospital-wide summary** (`GET /api/dashboard/summary`) — `$group` on
`admission.status` for status breakdown, and a separate `$group` summing
`totalBeds` across wards, combined into one JSON payload.

## API reference

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/wards` | Create ward |
| GET | `/api/wards` | List wards |
| POST | `/api/doctors` | Create doctor |
| GET | `/api/doctors` | List doctors |
| POST | `/api/patients` | Admit patient (rejects if ward is full) |
| GET | `/api/patients?ward=&status=` | List/filter patients |
| GET | `/api/patients/:id` | Full patient record incl. vitals history |
| PATCH | `/api/patients/:id/status` | Change admission status / discharge |
| POST | `/api/patients/:id/vitals` | Push a new vitals reading |
| GET | `/api/dashboard/occupancy` | Per-ward occupancy aggregation |
| GET | `/api/dashboard/summary` | Hospital-wide counters |

## Sample mongosh queries (for the report's "Querying" section)

```js
// Find all critical patients across the hospital
db.patients.find({ "admission.status": "Critical" })

// Patients in ICU currently admitted (uses the compound index)
db.patients.find({ "admission.ward": ObjectId("..."), "admission.status": { $ne: "Discharged" } })

// Add a vitals reading (embedded array update)
db.patients.updateOne(
  { _id: ObjectId("...") },
  { $push: { vitalsHistory: { recordedAt: new Date(), heartRate: 90, bloodPressure: "120/80", temperature: 37.1, spo2: 98, recordedBy: "Nurse X" } } }
)

// Occupancy rate per ward (simplified aggregation, no $lookup)
db.patients.aggregate([
  { $match: { "admission.status": { $ne: "Discharged" } } },
  { $group: { _id: "$admission.ward", occupied: { $sum: 1 } } }
])
```

## Suggested report screenshots
1. `mongosh` / Compass view of a raw patient document (embedded vitals visible).
2. `.explain()` output before/after the compound index.
3. Dashboard homepage with live ward cards.
4. Ward modal showing a patient's vitals history table.
5. Postman/curl call to `POST /api/patients` returning a 409 when a ward is full.

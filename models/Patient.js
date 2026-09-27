const mongoose = require("mongoose");
const { Schema } = mongoose;

// Vitals are recorded every few hours per patient, belong to that patient
// alone, and are almost always read/written together with the patient
// record (e.g. "show me this patient's vitals history"). They are a
// classic one-to-many "contains" relationship with bounded growth, so they
// are EMBEDDED as a sub-document array. This lets a single query return a
// patient's full vitals history with zero joins.
const vitalsSchema = new Schema(
  {
    recordedAt: { type: Date, default: Date.now },
    heartRate: { type: Number },      // bpm
    bloodPressure: { type: String },  // e.g. "120/80"
    temperature: { type: Number },    // Celsius
    spo2: { type: Number },           // % oxygen saturation
    recordedBy: { type: String },     // nurse/staff name (kept simple, no login system)
  },
  { _id: true }
);

const patientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    contact: { type: String },

    // ---- Admission block: embedded because it is intrinsic to this one
    // patient's current stay and is always fetched together with the
    // patient (not shared or queried independently of the patient). ----
    admission: {
      ward: { type: Schema.Types.ObjectId, ref: "Ward", required: true }, // REFERENCE
      bedNumber: { type: String, required: true },
      status: {
        type: String,
        enum: ["Admitted", "Under Observation", "Critical", "Discharged"],
        default: "Admitted",
      },
      admittedAt: { type: Date, default: Date.now },
      dischargedAt: { type: Date, default: null },
      diagnosis: { type: String },
    },

    // Reference: a doctor is a shared, independently managed entity.
    assignedDoctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },

    // Embedded array: bounded, patient-owned, always read with the patient.
    vitalsHistory: [vitalsSchema],
  },
  { timestamps: true }
);

// Compound index: the dashboard's #1 query is "beds occupied in ward X with
// a given status" (or "all non-discharged patients in ward X"), so we index
// ward + status together rather than as two single-field indexes. Mongo can
// then satisfy that filter with a single index scan instead of scanning one
// index and filtering in memory.
patientSchema.index({ "admission.ward": 1, "admission.status": 1 });

module.exports = mongoose.model("Patient", patientSchema);

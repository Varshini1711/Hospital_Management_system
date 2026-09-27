const mongoose = require("mongoose");
const { Schema } = mongoose;

// Doctors are a shared, independently-updated entity (one doctor treats many
// patients, has their own login/profile, on-call schedule, etc). They are
// REFERENCED from Patient rather than embedded, so that updating a doctor's
// details doesn't require rewriting every patient document they are
// assigned to, and so patient->doctor is a clean many-to-one relationship.
const doctorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    contact: { type: String, required: true },
    onCall: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);

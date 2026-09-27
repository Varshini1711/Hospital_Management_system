const mongoose = require("mongoose");
const { Schema } = mongoose;

// Wards are small in number and change rarely, so they are kept as their
// own collection and REFERENCED from Patient (patient.admission.ward).
// This avoids duplicating ward metadata (capacity, floor, type) across
// every patient document admitted to that ward.
const wardSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // e.g. "ICU", "General-A"
    type: {
      type: String,
      enum: ["ICU", "General", "Maternity", "Pediatric", "Emergency", "Isolation"],
      required: true,
    },
    floor: { type: Number, required: true },
    totalBeds: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ward", wardSchema);

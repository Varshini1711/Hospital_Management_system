const express = require("express");
const router = express.Router();
const Patient = require("../models/Patient");
const Ward = require("../models/Ward");

// CREATE — admit a new patient
router.post("/", async (req, res) => {
  try {
    // Guard against over-admitting a ward past its physical bed count.
    const ward = await Ward.findById(req.body.admission?.ward);
    if (!ward) return res.status(400).json({ error: "Invalid ward id" });

    const occupied = await Patient.countDocuments({
      "admission.ward": ward._id,
      "admission.status": { $ne: "Discharged" },
    });
    if (occupied >= ward.totalBeds) {
      return res.status(409).json({ error: `${ward.name} is at full capacity (${ward.totalBeds} beds)` });
    }

    const patient = await Patient.create(req.body);
    res.status(201).json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ — list patients, filterable by ward / status (uses the compound index)
router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.ward) filter["admission.ward"] = req.query.ward;
  if (req.query.status) filter["admission.status"] = req.query.status;

  const patients = await Patient.find(filter)
    .populate("admission.ward", "name type floor")
    .populate("assignedDoctor", "name specialization department")
    .sort({ "admission.admittedAt": -1 });

  res.json(patients);
});

// READ — single patient, full record including embedded vitals history
router.get("/:id", async (req, res) => {
  const patient = await Patient.findById(req.params.id)
    .populate("admission.ward", "name type floor")
    .populate("assignedDoctor", "name specialization department contact");
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  res.json(patient);
});

// UPDATE — general edits (reassign doctor, change bed, edit diagnosis, etc.)
router.put("/:id", async (req, res) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json(patient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE — status transition (e.g. Admitted -> Critical -> Discharged)
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  const update = { "admission.status": status };
  if (status === "Discharged") update["admission.dischargedAt"] = new Date();

  const patient = await Patient.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  res.json(patient);
});

// UPDATE — push a new vitals reading into the embedded array (no separate collection needed)
router.post("/:id/vitals", async (req, res) => {
  const patient = await Patient.findByIdAndUpdate(
    req.params.id,
    { $push: { vitalsHistory: { ...req.body, recordedAt: new Date() } } },
    { new: true, runValidators: true }
  );
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  res.json(patient);
});

// DELETE — remove a patient record entirely (e.g. data-entry error)
router.delete("/:id", async (req, res) => {
  const patient = await Patient.findByIdAndDelete(req.params.id);
  if (!patient) return res.status(404).json({ error: "Patient not found" });
  res.json({ message: "Patient record deleted" });
});

module.exports = router;

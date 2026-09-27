const express = require("express");
const router = express.Router();
const Doctor = require("../models/Doctor");

router.post("/", async (req, res) => {
  try {
    const doctor = await Doctor.create(req.body);
    res.status(201).json(doctor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  const doctors = await Doctor.find().sort({ name: 1 });
  res.json(doctors);
});

router.get("/:id", async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ error: "Doctor not found" });
  res.json(doctor);
});

router.put("/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    res.json(doctor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const doctor = await Doctor.findByIdAndDelete(req.params.id);
  if (!doctor) return res.status(404).json({ error: "Doctor not found" });
  res.json({ message: "Doctor deleted" });
});

module.exports = router;

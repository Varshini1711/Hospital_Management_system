const express = require("express");
const router = express.Router();
const Ward = require("../models/Ward");

// CREATE
router.post("/", async (req, res) => {
  try {
    const ward = await Ward.create(req.body);
    res.status(201).json(ward);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ all
router.get("/", async (req, res) => {
  const wards = await Ward.find().sort({ name: 1 });
  res.json(wards);
});

// READ one
router.get("/:id", async (req, res) => {
  const ward = await Ward.findById(req.params.id);
  if (!ward) return res.status(404).json({ error: "Ward not found" });
  res.json(ward);
});

// UPDATE
router.put("/:id", async (req, res) => {
  try {
    const ward = await Ward.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!ward) return res.status(404).json({ error: "Ward not found" });
    res.json(ward);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  const ward = await Ward.findByIdAndDelete(req.params.id);
  if (!ward) return res.status(404).json({ error: "Ward not found" });
  res.json({ message: "Ward deleted" });
});

module.exports = router;

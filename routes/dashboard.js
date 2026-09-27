const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Ward = require("../models/Ward");
const Patient = require("../models/Patient");

// GET /api/dashboard/occupancy
// Aggregation pipeline: for every ward, count currently-occupied beds
// (any patient whose admission.status isn't "Discharged") and compute an
// occupancy rate. Pipeline starts from Ward (not Patient) so that empty
// wards with zero patients still show up at 0% instead of being silently
// dropped.
router.get("/occupancy", async (req, res) => {
  const occupancy = await Ward.aggregate([
    {
      $lookup: {
        from: "patients",
        let: { wardId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$admission.ward", "$$wardId"] },
                  { $ne: ["$admission.status", "Discharged"] },
                ],
              },
            },
          },
          { $project: { name: 1, "admission.bedNumber": 1, "admission.status": 1 } },
        ],
        as: "currentPatients",
      },
    },
    {
      $addFields: {
        occupiedBeds: { $size: "$currentPatients" },
      },
    },
    {
      $addFields: {
        availableBeds: { $subtract: ["$totalBeds", "$occupiedBeds"] },
        occupancyRate: {
          $round: [{ $multiply: [{ $divide: ["$occupiedBeds", "$totalBeds"] }, 100] }, 1],
        },
      },
    },
    {
      $project: {
        name: 1,
        type: 1,
        floor: 1,
        totalBeds: 1,
        occupiedBeds: 1,
        availableBeds: 1,
        occupancyRate: 1,
        currentPatients: 1,
      },
    },
    { $sort: { name: 1 } },
  ]);

  res.json(occupancy);
});

// GET /api/dashboard/summary
// Hospital-wide counters, grouped by admission status, plus overall
// occupancy percentage — used for the top summary cards on the dashboard.
router.get("/summary", async (req, res) => {
  const [statusCounts, bedTotals] = await Promise.all([
    Patient.aggregate([
      { $group: { _id: "$admission.status", count: { $sum: 1 } } },
    ]),
    Ward.aggregate([
      { $group: { _id: null, totalBeds: { $sum: "$totalBeds" } } },
    ]),
  ]);

  const totalBeds = bedTotals[0]?.totalBeds || 0;
  const activePatients = statusCounts
    .filter((s) => s._id !== "Discharged")
    .reduce((sum, s) => sum + s.count, 0);

  res.json({
    totalBeds,
    occupiedBeds: activePatients,
    availableBeds: totalBeds - activePatients,
    overallOccupancyRate: totalBeds ? Number(((activePatients / totalBeds) * 100).toFixed(1)) : 0,
    statusBreakdown: statusCounts.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {}),
  });
});

module.exports = router;

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Ward = require("../models/Ward");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");

async function seed() {
  await connectDB();

  console.log("[seed] clearing existing data...");
  await Promise.all([Ward.deleteMany({}), Doctor.deleteMany({}), Patient.deleteMany({})]);

  console.log("[seed] inserting wards...");
  const wards = await Ward.insertMany([
    { name: "ICU", type: "ICU", floor: 3, totalBeds: 6 },
    { name: "General-A", type: "General", floor: 1, totalBeds: 20 },
    { name: "General-B", type: "General", floor: 2, totalBeds: 20 },
    { name: "Maternity", type: "Maternity", floor: 4, totalBeds: 10 },
    { name: "Pediatric", type: "Pediatric", floor: 2, totalBeds: 12 },
    { name: "Emergency", type: "Emergency", floor: 0, totalBeds: 8 },
  ]);
  const wardByName = Object.fromEntries(wards.map((w) => [w.name, w]));

  console.log("[seed] inserting doctors...");
  const doctors = await Doctor.insertMany([
    { name: "Dr. Anjali Rao", specialization: "Critical Care", department: "ICU", contact: "9900011111" },
    { name: "Dr. Vikram Shah", specialization: "General Medicine", department: "General", contact: "9900022222" },
    { name: "Dr. Priya Menon", specialization: "Obstetrics", department: "Maternity", contact: "9900033333" },
    { name: "Dr. Karan Iyer", specialization: "Pediatrics", department: "Pediatric", contact: "9900044444" },
    { name: "Dr. Fatima Sheikh", specialization: "Emergency Medicine", department: "Emergency", contact: "9900055555" },
  ]);
  const doctorByDept = Object.fromEntries(doctors.map((d) => [d.department, d]));

  console.log("[seed] inserting patients (with embedded vitals)...");
  const now = Date.now();
  const hoursAgo = (h) => new Date(now - h * 3600 * 1000);

  await Patient.insertMany([
    {
      name: "Ramesh Kulkarni",
      age: 64,
      gender: "Male",
      contact: "9812345601",
      admission: {
        ward: wardByName["ICU"]._id,
        bedNumber: "ICU-1",
        status: "Critical",
        admittedAt: hoursAgo(30),
        diagnosis: "Post-cardiac surgery observation",
      },
      assignedDoctor: doctorByDept["ICU"]._id,
      vitalsHistory: [
        { recordedAt: hoursAgo(20), heartRate: 98, bloodPressure: "140/90", temperature: 37.8, spo2: 94, recordedBy: "Nurse Latha" },
        { recordedAt: hoursAgo(8), heartRate: 92, bloodPressure: "135/88", temperature: 37.4, spo2: 96, recordedBy: "Nurse Latha" },
        { recordedAt: hoursAgo(1), heartRate: 88, bloodPressure: "128/85", temperature: 37.0, spo2: 97, recordedBy: "Nurse Divya" },
      ],
    },
    {
      name: "Sunita Patil",
      age: 45,
      gender: "Female",
      contact: "9812345602",
      admission: {
        ward: wardByName["General-A"]._id,
        bedNumber: "GA-04",
        status: "Admitted",
        admittedAt: hoursAgo(50),
        diagnosis: "Typhoid fever",
      },
      assignedDoctor: doctorByDept["General"]._id,
      vitalsHistory: [
        { recordedAt: hoursAgo(40), heartRate: 84, bloodPressure: "118/76", temperature: 38.6, spo2: 98, recordedBy: "Nurse Rekha" },
        { recordedAt: hoursAgo(12), heartRate: 78, bloodPressure: "116/74", temperature: 37.2, spo2: 99, recordedBy: "Nurse Rekha" },
      ],
    },
    {
      name: "Aarav Joshi",
      age: 7,
      gender: "Male",
      contact: "9812345603",
      admission: {
        ward: wardByName["Pediatric"]._id,
        bedNumber: "PED-02",
        status: "Under Observation",
        admittedAt: hoursAgo(15),
        diagnosis: "Severe dengue - platelet monitoring",
      },
      assignedDoctor: doctorByDept["Pediatric"]._id,
      vitalsHistory: [
        { recordedAt: hoursAgo(10), heartRate: 110, bloodPressure: "100/65", temperature: 39.1, spo2: 97, recordedBy: "Nurse Sowmya" },
      ],
    },
    {
      name: "Meera Nair",
      age: 29,
      gender: "Female",
      contact: "9812345604",
      admission: {
        ward: wardByName["Maternity"]._id,
        bedNumber: "MAT-06",
        status: "Admitted",
        admittedAt: hoursAgo(6),
        diagnosis: "Post-delivery recovery (normal)",
      },
      assignedDoctor: doctorByDept["Maternity"]._id,
      vitalsHistory: [
        { recordedAt: hoursAgo(2), heartRate: 76, bloodPressure: "112/72", temperature: 36.9, spo2: 99, recordedBy: "Nurse Anita" },
      ],
    },
    {
      name: "George Thomas",
      age: 71,
      gender: "Male",
      contact: "9812345605",
      admission: {
        ward: wardByName["General-B"]._id,
        bedNumber: "GB-11",
        status: "Discharged",
        admittedAt: hoursAgo(96),
        dischargedAt: hoursAgo(4),
        diagnosis: "Community-acquired pneumonia - resolved",
      },
      assignedDoctor: doctorByDept["General"]._id,
      vitalsHistory: [
        { recordedAt: hoursAgo(90), heartRate: 88, bloodPressure: "130/85", temperature: 38.9, spo2: 93, recordedBy: "Nurse Rekha" },
        { recordedAt: hoursAgo(24), heartRate: 80, bloodPressure: "122/80", temperature: 37.0, spo2: 97, recordedBy: "Nurse Latha" },
      ],
    },
    {
      name: "Farhan Ali",
      age: 34,
      gender: "Male",
      contact: "9812345606",
      admission: {
        ward: wardByName["Emergency"]._id,
        bedNumber: "ER-2",
        status: "Critical",
        admittedAt: hoursAgo(1),
        diagnosis: "Road traffic accident - trauma assessment",
      },
      assignedDoctor: doctorByDept["Emergency"]._id,
      vitalsHistory: [
        { recordedAt: hoursAgo(0.5), heartRate: 120, bloodPressure: "90/60", temperature: 36.5, spo2: 91, recordedBy: "Nurse Vinod" },
      ],
    },
  ]);

  console.log("[seed] done. Wards:", wards.length, "| Doctors:", doctors.length, "| Patients: 6");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});

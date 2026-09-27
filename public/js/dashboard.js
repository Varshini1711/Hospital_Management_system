const REFRESH_MS = 8000;

const summaryEl = document.getElementById("summary-strip");
const gridEl = document.getElementById("ward-grid");
const connDot = document.getElementById("conn-dot");
const clockEl = document.getElementById("clock");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalContent = document.getElementById("modal-content");

function statusClass(status) {
  return "status-" + status.replace(/\s+/g, "-");
}

function tickClock() {
  clockEl.textContent = new Date().toLocaleString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    day: "2-digit", month: "short",
  });
}
setInterval(tickClock, 1000);
tickClock();

async function loadSummary() {
  const res = await fetch("/api/dashboard/summary");
  const s = await res.json();
  summaryEl.innerHTML = `
    <div class="stat"><div class="label">Total beds</div><div class="value">${s.totalBeds}</div></div>
    <div class="stat"><div class="label">Occupied</div><div class="value">${s.occupiedBeds}</div></div>
    <div class="stat"><div class="label">Available</div><div class="value">${s.availableBeds}</div></div>
    <div class="stat"><div class="label">Occupancy rate</div><div class="value">${s.overallOccupancyRate}%</div></div>
  `;
}

async function loadOccupancy() {
  const res = await fetch("/api/dashboard/occupancy");
  const wards = await res.json();
  gridEl.innerHTML = wards.map(wardCardHTML).join("");

  gridEl.querySelectorAll(".ward-card").forEach((card) => {
    card.addEventListener("click", () => {
      const wardData = wards.find((w) => w._id === card.dataset.wardId);
      openWardModal(wardData);
    });
  });
}

function wardCardHTML(w) {
  const pct = Math.min(w.occupancyRate, 100);
  const isFull = w.occupiedBeds >= w.totalBeds;
  const chips = w.currentPatients.length
    ? w.currentPatients
        .map(
          (p) => `<span class="patient-chip"><span class="status-dot ${statusClass(p.admission.status)}"></span>${p.name} · ${p.admission.bedNumber}</span>`
        )
        .join("")
    : `<span class="empty-note">No patients currently admitted</span>`;

  return `
    <article class="ward-card ${isFull ? "full" : ""}" data-ward-id="${w._id}">
      <div class="ward-card-head">
        <h2>${w.name}</h2>
        <span class="ward-type">${w.type}</span>
      </div>
      <div class="ward-floor">Floor ${w.floor}</div>
      <div class="bed-bar"><div class="bed-bar-fill" style="width:${pct}%; background:${isFull ? "var(--critical)" : "var(--teal)"}"></div></div>
      <div class="bed-counts">
        <span>${w.occupiedBeds} / ${w.totalBeds} beds occupied</span>
        <span class="rate">${w.occupancyRate}%</span>
      </div>
      <div class="patient-chip-list">${chips}</div>
    </article>
  `;
}

async function openWardModal(ward) {
  modalContent.innerHTML = `<span class="close-btn" id="close-modal">Close</span>
    <h2>${ward.name}</h2>
    <div class="meta">${ward.type} · Floor ${ward.floor} · ${ward.occupiedBeds}/${ward.totalBeds} beds occupied</div>
    <div id="patient-detail-list">Loading patient details…</div>`;
  modalBackdrop.classList.add("open");
  document.getElementById("close-modal").onclick = () => modalBackdrop.classList.remove("open");

  const detailEl = document.getElementById("patient-detail-list");
  if (!ward.currentPatients.length) {
    detailEl.innerHTML = `<p class="empty-note">No patients currently admitted to this ward.</p>`;
    return;
  }

  const patients = await Promise.all(
    ward.currentPatients.map((p) => fetch(`/api/patients/${p._id}`).then((r) => r.json()))
  );

  detailEl.innerHTML = patients
    .map((p) => {
      const latestVitals = p.vitalsHistory.slice(-3).reverse();
      const vitalsRows = latestVitals.length
        ? latestVitals
            .map(
              (v) => `<div class="vitals-row">
                <span>${new Date(v.recordedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                <span>HR ${v.heartRate ?? "-"}</span>
                <span>BP ${v.bloodPressure ?? "-"}</span>
                <span>Temp ${v.temperature ?? "-"}°C</span>
                <span>SpO₂ ${v.spo2 ?? "-"}%</span>
              </div>`
            )
            .join("")
        : `<p class="empty-note">No vitals recorded yet.</p>`;

      return `
        <div style="margin-top:18px; padding-top:14px; border-top:1px solid var(--line);">
          <strong>${p.name}</strong> — ${p.age}${p.gender[0]} · Bed ${p.admission.bedNumber}
          <div class="meta">${p.admission.diagnosis || "No diagnosis on file"} · Dr. assigned: ${p.assignedDoctor?.name || "Unassigned"}</div>
          <div class="vitals-row head"><span>Time</span><span>HR</span><span>BP</span><span>Temp</span><span>SpO₂</span></div>
          ${vitalsRows}
        </div>
      `;
    })
    .join("");
}

modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) modalBackdrop.classList.remove("open");
});

async function refreshAll() {
  try {
    await Promise.all([loadSummary(), loadOccupancy()]);
    connDot.classList.remove("offline");
  } catch (err) {
    connDot.classList.add("offline");
    console.error("Dashboard refresh failed:", err);
  }
}

refreshAll();
setInterval(refreshAll, REFRESH_MS);

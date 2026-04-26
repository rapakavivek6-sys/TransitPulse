let passengerChartInstance = null;
let leftBehindChartInstance = null;
let routeChartInstance = null;

let map;
let markersLayer;

async function apiGet(url) {
  const res = await fetch(url);
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function loadControllerPage() {
  const buses = await apiGet("/api/buses");
  const traffic = await apiGet("/api/traffic");
  const alerts = await apiGet("/api/alerts");
  const etaPredictions = await apiGet("/api/predictions/eta");
  const occupancyPredictions = await apiGet("/api/predictions/occupancy");
  const dispatchRecommendations = await apiGet("/api/dispatch/recommendations");

  const etaMap = {};
  etaPredictions.forEach(p => {
    etaMap[p.bus_id] = p.predicted_value;
  });

  const occupancyMap = {};
  occupancyPredictions.forEach(p => {
    occupancyMap[p.bus_id] = p.predicted_value;
  });

  const trafficEl = document.getElementById("traffic");
  const busesEl = document.getElementById("buses");
  const alertsEl = document.getElementById("alerts");
  const dispatchEl = document.getElementById("dispatchRecommendations");

  if (trafficEl) {
    trafficEl.innerHTML = `
      <div class="card">
        <h3>Traffic</h3>
        <p>Level: ${traffic.level}</p>
        <p>Multiplier: ${traffic.multiplier}</p>
        <p class="small">Updated: ${traffic.updated_at}</p>
      </div>
    `;
  }

  if (busesEl) {
    busesEl.innerHTML = buses.map(bus => {
      const predictedEta = etaMap[bus.id];
      const predictedOcc = occupancyMap[bus.id];

      const risk =
        predictedOcc !== undefined && Number(predictedOcc) >= bus.capacity * 0.9
          ? "⚠️ High"
          : "✅ Normal";

      return `
        <div class="card">
          <h3>${bus.id}</h3>
          <p>Route: ${bus.route_id}</p>
          <p>Direction: ${bus.direction}</p>
          <p>Status: ${bus.status}</p>
          <p>Current Stop: ${bus.currentStopName}</p>

          <p>Occupancy: ${bus.occupancy} / ${bus.capacity}</p>
          <p>Predicted Occupancy: ${
            predictedOcc !== undefined ? Number(predictedOcc).toFixed(2) : "-"
          } / ${bus.capacity}</p>

          <p>Next ETA: ${bus.next_eta_min ?? "-"} min</p>
          <p>Predicted ETA: ${
            predictedEta !== undefined ? Number(predictedEta).toFixed(2) : "-"
          } min</p>

          <p>Overcrowding Risk: ${risk}</p>

          <button onclick="toggleBreak('${bus.id}', ${!bus.on_break})">
            ${bus.on_break ? "Resume Bus" : "Put On Break"}
          </button>

          <button onclick="reportBreakdown('${bus.id}')">
            Report Breakdown
          </button>
        </div>
      `;
    }).join("");
  }

  if (alertsEl) {
    alertsEl.innerHTML = alerts.length
      ? alerts.map(alert => {
          let color = "#22c55e";

          if (alert.type === "delay") color = "#f59e0b";
          if (alert.type === "high_occupancy") color = "#ef4444";
          if (alert.type === "left_behind") color = "#dc2626";
          if (alert.type === "breakdown") color = "#991b1b";

          return `
            <div class="card" style="border-left: 5px solid ${color}">
              <strong>${alert.type.toUpperCase()}</strong>
              <p>${alert.message}</p>
              <p class="small">${alert.created_at}</p>
            </div>
          `;
        }).join("")
      : `<div class="card"><p>No alerts yet.</p></div>`;
  }

  if (dispatchEl) {
    dispatchEl.innerHTML = dispatchRecommendations.length
      ? dispatchRecommendations.map(item => {
          let badgeColor = "#22c55e";

          if (item.priority === "high") badgeColor = "#ef4444";
          else if (item.priority === "medium") badgeColor = "#f59e0b";

          return `
            <div class="card">
              <span style="
                display:inline-block;
                padding:4px 10px;
                border-radius:10px;
                background:${badgeColor};
                color:white;
                font-size:12px;
                margin-bottom:6px;
              ">
                ${item.priority.toUpperCase()}
              </span>

              <p><strong>Bus:</strong> ${item.bus_id}</p>
              <p><strong>Route:</strong> ${item.route_id}</p>
              <p><strong>Reason:</strong> ${item.reason}</p>
              <p>${item.recommendation}</p>
              <p class="small">${item.created_at}</p>
            </div>
          `;
        }).join("")
      : `<div class="card"><p>No dispatch recommendations.</p></div>`;
  }
}

async function loadManagerPage() {
  const summary = await apiGet("/api/manager-summary");
  const buses = await apiGet("/api/buses");
  const evaluation = await apiGet("/api/evaluation");

  const overload = summary.totalLeftBehind > 20 ? "⚠️ High" : "✅ Normal";

  const summaryEl = document.getElementById("summary");
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="grid">
        <div class="card"><h3>Total Buses</h3><p>${summary.totalBuses}</p></div>
        <div class="card"><h3>Total Boarded</h3><p>${summary.totalBoarded}</p></div>
        <div class="card"><h3>Total Terminated</h3><p>${summary.totalTerminated}</p></div>
        <div class="card"><h3>Total Left Behind</h3><p>${summary.totalLeftBehind}</p></div>
        <div class="card"><h3>Traffic Level</h3><p>${summary.trafficLevel}</p></div>
        <div class="card"><h3>System Load</h3><p>${overload}</p></div>
      </div>
    `;
  }

  const evaluationEl = document.getElementById("evaluation");
  if (evaluationEl) {
    evaluationEl.innerHTML = `
      <div class="grid">
        <div class="card">
          <h3>Avg ETA Error</h3>
          <p>${evaluation.avgEtaError} min</p>
        </div>
        <div class="card">
          <h3>Avg Occupancy Error</h3>
          <p>${evaluation.avgOccupancyError}</p>
        </div>
        <div class="card">
          <h3>Sample Size</h3>
          <p>${evaluation.sampleSize}</p>
        </div>
      </div>
    `;
  }

  const passengerCtx = document.getElementById("passengerChart");
  const leftBehindCtx = document.getElementById("leftBehindChart");
  const routeCtx = document.getElementById("routeChart");

  if (!passengerCtx || !leftBehindCtx || !routeCtx) return;

  const servedCount = Math.max(summary.totalBoarded - summary.totalLeftBehind, 0);

  const routeCounts = {};
  buses.forEach(bus => {
    routeCounts[bus.route_id] = (routeCounts[bus.route_id] || 0) + 1;
  });

  if (passengerChartInstance) passengerChartInstance.destroy();
  if (leftBehindChartInstance) leftBehindChartInstance.destroy();
  if (routeChartInstance) routeChartInstance.destroy();

  passengerChartInstance = new Chart(passengerCtx, {
    type: "bar",
    data: {
      labels: ["Boarded", "Terminated"],
      datasets: [{
        label: "Passengers",
        data: [summary.totalBoarded, summary.totalTerminated],
        backgroundColor: ["#4CAF50", "#2196F3"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  leftBehindChartInstance = new Chart(leftBehindCtx, {
    type: "doughnut",
    data: {
      labels: ["Left Behind", "Served"],
      datasets: [{
        data: [summary.totalLeftBehind, servedCount],
        backgroundColor: ["#F44336", "#4CAF50"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  routeChartInstance = new Chart(routeCtx, {
    type: "pie",
    data: {
      labels: Object.keys(routeCounts),
      datasets: [{
        data: Object.values(routeCounts),
        backgroundColor: [
          "#3F51B5",
          "#009688",
          "#FF9800",
          "#9C27B0",
          "#E91E63"
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

async function submitAmbassadorForm(event) {
  event.preventDefault();

  const busId = document.getElementById("busId").value;
  const boarded = document.getElementById("boarded").value;
  const terminated = document.getElementById("terminated").value;
  const leftBehind = document.getElementById("leftBehind").value;

  const result = await apiPost("/api/ambassador/update", {
    busId,
    boarded,
    terminated,
    leftBehind
  });

  const resultEl = document.getElementById("result");
  if (!resultEl) return;

  if (!result.ok && result.message) {
    resultEl.innerHTML = `
      <div class="card"><p>${result.message}</p></div>
    `;
    return;
  }

  resultEl.innerHTML = `
    <div class="card">
      <p>Update submitted successfully.</p>
      <p>Bus: ${result.bus.id}</p>
      <p>Occupancy: ${result.bus.occupancy}/${result.bus.capacity}</p>
    </div>
  `;
}

async function loadPassengerPage() {
  const etaResultEl = document.getElementById("etaResult");
  const stopSelect = document.getElementById("stopSelect");

  if (!etaResultEl) return;

  const params = new URLSearchParams(window.location.search);
  let stopId = params.get("stopId");

  if (!stopId && stopSelect) {
    stopId = stopSelect.value;
  }

  if (stopSelect && stopId) {
    stopSelect.value = stopId;
  }

  if (!stopId) {
    etaResultEl.innerHTML = `<div class="card"><p>No stop selected.</p></div>`;
    return;
  }

  try {
    const eta = await apiGet(`/api/eta/${stopId}`);

    if (!eta || eta.message) {
      etaResultEl.innerHTML = `
        <div class="card">
          <p>${eta?.message || "No ETA data available for this stop."}</p>
        </div>
      `;
      return;
    }

    const risk =
      eta.predictedOccupancy &&
      eta.capacity &&
      Number(eta.predictedOccupancy) >= eta.capacity * 0.9
        ? "⚠️ High"
        : "✅ Normal";

    etaResultEl.innerHTML = `
      <div class="card">
        <h3>${eta.stopName}</h3>
        <p>Next Bus: ${eta.nextBusMinutes} min</p>
        <p>Predicted Next Bus: ${eta.predictedNextBusMinutes ?? "-"} min</p>
        <p>Predicted Occupancy: ${eta.predictedOccupancy ?? "-"} / ${eta.capacity ?? "-"}</p>
        <p>Overcrowding Risk: ${risk}</p>
        <p>Route: ${eta.route}</p>
        <p>Status: ${eta.status}</p>
      </div>
    `;
  } catch (error) {
    etaResultEl.innerHTML = `
      <div class="card">
        <p>Failed to load ETA data.</p>
      </div>
    `;
    console.error(error);
  }
}

async function login(event) {
  event.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  const result = await res.json();

  if (!result.ok) {
    alert("Invalid credentials");
    return;
  }

  localStorage.setItem("user", JSON.stringify(result.user));

  if (result.user.role === "controller") window.location.href = "/controller.html";
  else if (result.user.role === "manager") window.location.href = "/manager.html";
  else if (result.user.role === "ambassador") window.location.href = "/ambassador.html";
  else if (result.user.role === "admin") window.location.href = "/index.html";
}

async function toggleBreak(busId, onBreak) {
  await apiPost("/api/controller/break", { busId, onBreak });
  await loadControllerPage();
}

async function reportBreakdown(busId) {
  await apiPost("/api/controller/report-breakdown", { busId });
  await loadControllerPage();
}

async function runSimulationNow() {
  await apiPost("/api/simulate-now", {});
  await loadControllerPage();
}

async function setTrafficLevel() {
  const level = document.getElementById("trafficLevelSelect").value;
  await apiPost("/api/controller/set-traffic", { level });
  await loadControllerPage();
}

async function setSimulationSpeed() {
  const refreshMs = document.getElementById("simulationSpeedSelect").value;
  const result = await apiPost("/api/simulation-settings", { refreshMs });
  alert(`Simulation speed updated to ${result.refreshMs / 1000} seconds`);
}

async function generateDispatchRecommendations() {
  await apiPost("/api/dispatch/generate", {});
  await loadControllerPage();
}

async function loadMapPage() {
  const stops = await apiGet("/api/stops");
  const buses = await apiGet("/api/buses");

  if (!document.getElementById("map")) return;

  if (!map) {
    map = L.map("map").setView([51.505, -0.09], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
  }

  markersLayer.clearLayers();

  stops.forEach(stop => {
    if (!stop.lat || !stop.lon) return;

    L.circleMarker([stop.lat, stop.lon], {
      radius: 6,
      color: "green"
    })
      .bindPopup(`<b>${stop.name}</b><br>Route: ${stop.route_id}`)
      .addTo(markersLayer);
  });

  buses.forEach(bus => {
    const stop = stops.find(
      s => s.route_id === bus.route_id && s.sequence === bus.current_stop_index + 1
    );

    if (!stop) return;

    let iconUrl = "https://maps.google.com/mapfiles/ms/icons/blue-dot.png";

    if (bus.status === "delayed") {
      iconUrl = "https://maps.google.com/mapfiles/ms/icons/orange-dot.png";
    }

    if (bus.status === "broken_down") {
      iconUrl = "https://maps.google.com/mapfiles/ms/icons/red-dot.png";
    }

    if (bus.on_break) {
      iconUrl = "https://maps.google.com/mapfiles/ms/icons/grey-dot.png";
    }

    const icon = L.icon({
      iconUrl,
      iconSize: [32, 32]
    });

    L.marker([stop.lat, stop.lon], { icon })
      .bindPopup(`
        <b>${bus.id}</b><br>
        Route: ${bus.route_id}<br>
        Status: ${bus.status}<br>
        Occupancy: ${bus.occupancy}/${bus.capacity}<br>
        ETA: ${bus.next_eta_min ?? "-"} min
      `)
      .addTo(markersLayer);
  });
}

async function loadQrGalleryPage() {
  const galleryEl = document.getElementById("qrGallery");
  if (!galleryEl) return;

  const stops = await apiGet("/api/stops");

  galleryEl.innerHTML = stops.map(stop => {
    const qrPath = `/qrcodes/${stop.id}.png`;
    const passengerUrl = `${window.location.origin}/passenger.html?stopId=${stop.id}`;

    return `
      <div class="qr-card">
        <h3>${stop.name}</h3>
        <p>Route: ${stop.route_id}</p>
        <img src="${qrPath}" alt="QR for ${stop.name}">
        <div class="qr-link">${passengerUrl}</div>
      </div>
    `;
  }).join("");
}

function logout() {
  localStorage.removeItem("user");
  window.location.href = "/login.html";
}

function requireRole(allowedRoles) {
  const user = localStorage.getItem("user");

  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  const parsed = JSON.parse(user);

  if (!allowedRoles.includes(parsed.role)) {
    alert("You do not have permission to access this page.");
    window.location.href = "/login.html";
  }
}
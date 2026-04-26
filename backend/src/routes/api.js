const { generateDispatchRecommendations } = require("../services/dispatchService");
const express = require("express");
const router = express.Router();
const {
  runSimulationTick,
  setSimulationInterval,
  getSimulationInterval
} = require("../services/simulation");
const db = require("../services/dbService");

router.get("/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await db.getUsers();

    const user = users.find(
      u => u.username === username && u.password === password
    );

    if (!user) {
      return res.status(401).json({ ok: false, message: "Invalid credentials" });
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.get("/routes", async (req, res) => {
  try {
    const routes = await db.getRoutes();
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/stops", async (req, res) => {
  try {
    const stops = await db.getStops();
    res.json(stops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/buses", async (req, res) => {
  try {
    const buses = await db.getBuses();
    const stops = await db.getStops();

    const mapped = buses.map(bus => {
      const routeStops = stops
        .filter(stop => stop.route_id === bus.route_id)
        .sort((a, b) => a.sequence - b.sequence);

      const stop = routeStops[bus.current_stop_index];

      return {
        ...bus,
        currentStopName: stop ? stop.name : null
      };
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/traffic", async (req, res) => {
  try {
    const traffic = await db.getTraffic();
    res.json(traffic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/alerts", async (req, res) => {
  try {
    const alerts = await db.getAlerts();
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/manager-summary", async (req, res) => {
  try {
    const summary = await db.getManagerSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/eta/:stopId", async (req, res) => {
  try {
    const { stopId } = req.params;
    const stops = await db.getStops();
    const buses = await db.getBuses();

    const stop = stops.find(s => s.id === stopId);

    if (!stop) {
      return res.status(404).json({ message: "Stop not found" });
    }

    const routeBuses = buses.filter(b => b.route_id === stop.route_id);

    if (!routeBuses.length) {
      return res.status(404).json({ message: "No buses available for this route" });
    }

    const nearestBus = routeBuses.reduce((best, current) => {
      const bestDistance = Math.abs((best.current_stop_index ?? 0) - (stop.sequence - 1));
      const currentDistance = Math.abs((current.current_stop_index ?? 0) - (stop.sequence - 1));
      return currentDistance < bestDistance ? current : best;
    });

    const etaPredictions = await db.getLatestPredictions("eta");
    const etaPrediction = etaPredictions.find(p => p.bus_id === nearestBus.id);

    const occupancyPredictions = await db.getLatestPredictions("occupancy");
    const occupancyPrediction = occupancyPredictions.find(p => p.bus_id === nearestBus.id);

    res.json({
      stopId: stop.id,
      stopName: stop.name,
      nextBusMinutes: nearestBus.next_eta_min ?? 0,
      predictedNextBusMinutes: etaPrediction
        ? Number(etaPrediction.predicted_value).toFixed(2)
        : null,
      predictedOccupancy: occupancyPrediction
        ? Number(occupancyPrediction.predicted_value).toFixed(2)
        : null,
      capacity: nearestBus.capacity,
      route: nearestBus.route_id,
      status: nearestBus.status
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/ambassador/update", async (req, res) => {
  try {
    const { busId, boarded, terminated, leftBehind } = req.body;

    const safeBoarded = Number(boarded) || 0;
    const safeTerminated = Number(terminated) || 0;
    const safeLeftBehind = Number(leftBehind) || 0;

    const bus = await db.updateAmbassadorCounts(
      busId,
      safeBoarded,
      safeTerminated,
      safeLeftBehind
    );

    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    if (safeLeftBehind >= 20) {
      await db.insertAlert(
        "left_behind",
        `Ambassador reported ${safeLeftBehind} left behind on ${bus.id}`,
        bus.id
      );
    }

    res.json({ ok: true, bus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/controller/break", async (req, res) => {
  try {
    const { busId, onBreak } = req.body;
    const bus = await db.updateBusBreak(busId, Boolean(onBreak));

    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    res.json({ ok: true, bus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/simulate-now", (req, res) => {
  runSimulationTick();
  res.json({ ok: true, message: "Simulation tick executed" });
});

router.get("/underground", async (req, res) => {
  try {
    const rows = await db.getUnderground();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/overground", async (req, res) => {
  try {
    const rows = await db.getOverground();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/local-trains", async (req, res) => {
  try {
    const rows = await db.getLocalTrains();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/simulation-settings", async (req, res) => {
  res.json({
    refreshMs: getSimulationInterval(),
    mode: "auto",
    lastTickAt: new Date().toISOString()
  });
});

router.post("/controller/set-traffic", async (req, res) => {
  try {
    const { level } = req.body;

    const mapping = {
      low: 0.9,
      moderate: 1.0,
      high: 1.2,
      severe: 1.5
    };

    if (!mapping[level]) {
      return res.status(400).json({ ok: false, message: "Invalid traffic level" });
    }

    const traffic = await db.updateTraffic(level, mapping[level]);
    res.json({ ok: true, traffic });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/controller/report-breakdown", async (req, res) => {
  try {
    const { busId } = req.body;
    const bus = await db.updateBusStatus(busId, "broken_down");

    if (!bus) {
      return res.status(404).json({ ok: false, message: "Bus not found" });
    }

    await db.insertAlert(
      "breakdown",
      `${bus.id} has been reported as broken down`,
      bus.id
    );

    res.json({ ok: true, bus });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/simulation-settings", async (req, res) => {
  try {
    const { refreshMs } = req.body;
    const ms = Number(refreshMs);

    if (!ms || ms < 1000) {
      return res.status(400).json({
        ok: false,
        message: "refreshMs must be at least 1000"
      });
    }

    const updated = setSimulationInterval(ms);

    res.json({
      ok: true,
      refreshMs: updated
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.get("/predictions/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const rows = await db.getLatestPredictions(type);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/dispatch/generate", async (req, res) => {
  try {
    await generateDispatchRecommendations();
    res.json({ ok: true, message: "Dispatch recommendations generated" });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

router.get("/dispatch/recommendations", async (req, res) => {
  try {
    const rows = await db.getDispatchRecommendations();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/evaluation", async (req, res) => {
  try {
    const buses = await db.getBuses();
    const etaPred = await db.getLatestPredictions("eta");
    const occPred = await db.getLatestPredictions("occupancy");

    let totalEtaError = 0;
    let etaCount = 0;

    buses.forEach(bus => {
      const pred = etaPred.find(p => p.bus_id === bus.id);
      if (pred && bus.next_eta_min !== null) {
        totalEtaError += Math.abs(bus.next_eta_min - Number(pred.predicted_value));
        etaCount++;
      }
    });

    let totalOccError = 0;
    let occCount = 0;

    buses.forEach(bus => {
      const pred = occPred.find(p => p.bus_id === bus.id);
      if (pred) {
        totalOccError += Math.abs(bus.occupancy - Number(pred.predicted_value));
        occCount++;
      }
    });

    res.json({
      avgEtaError: etaCount ? (totalEtaError / etaCount).toFixed(2) : 0,
      avgOccupancyError: occCount ? (totalOccError / occCount).toFixed(2) : 0,
      sampleSize: buses.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
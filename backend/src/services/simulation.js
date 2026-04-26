const db = require("./dbService");

let simulationIntervalMs = 10000;
let intervalHandle = null;

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function updateTraffic() {
  const levels = [
    { level: "low", multiplier: 0.9 },
    { level: "moderate", multiplier: 1.0 },
    { level: "high", multiplier: 1.2 },
    { level: "severe", multiplier: 1.5 }
  ];

  const selected = randomChoice(levels);
  await db.updateTraffic(selected.level, selected.multiplier);
  return selected;
}

async function createAlert(type, message, busId) {
  await db.insertAlert(type, message, busId);
}

async function updateBus(bus, routeStopsLength, trafficMultiplier) {
  if (bus.on_break) {
    await db.updateBusSimulation(bus.id, {
      occupancy: bus.occupancy,
      boarded_total: bus.boarded_total,
      terminated_total: bus.terminated_total,
      left_behind_total: bus.left_behind_total,
      current_stop_index: bus.current_stop_index,
      status: "on_break",
      next_eta_min: null
    });

    await db.insertFeatureLog({
      bus_id: bus.id,
      route_id: bus.route_id,
      current_stop_index: nextStopIndex,
      occupancy: newOccupancy,
      capacity: bus.capacity,
      status,
      traffic_level: "dynamic",
      traffic_multiplier: trafficMultiplier,
      actual_next_eta: nextEta,
      actual_occupancy: newOccupancy
    });
    return;
  }

  if (bus.status === "broken_down") {
    return;
  }

  const boarded = Math.floor(Math.random() * 8);
  const terminated = Math.floor(Math.random() * 5);

  let newOccupancy = bus.occupancy + boarded - terminated;
  if (newOccupancy < 0) newOccupancy = 0;

  let leftBehind = 0;
  if (newOccupancy > bus.capacity) {
    leftBehind = newOccupancy - bus.capacity;
    newOccupancy = bus.capacity;
  }

  const nextStopIndex = routeStopsLength > 0
    ? (bus.current_stop_index + 1) % routeStopsLength
    : 0;

  const baseEta = Math.floor(Math.random() * 5) + 2;
  const nextEta = Math.ceil(baseEta * trafficMultiplier);

  let status = "in_service";
  if (nextEta >= 8) {
    status = "delayed";
  }

  const updated = await db.updateBusSimulation(bus.id, {
    occupancy: newOccupancy,
    boarded_total: bus.boarded_total + boarded,
    terminated_total: bus.terminated_total + terminated,
    left_behind_total: bus.left_behind_total + leftBehind,
    current_stop_index: nextStopIndex,
    status,
    next_eta_min: nextEta
  });

  if (leftBehind >= 20) {
    await createAlert(
      "left_behind",
      `High left-behind passengers detected on ${bus.id}`,
      bus.id
    );
  }

  const occupancyPercent = (updated.occupancy / updated.capacity) * 100;
  if (occupancyPercent >= 90) {
    await createAlert(
      "high_occupancy",
      `${bus.id} is above 90% occupancy`,
      bus.id
    );
  }

  if (status === "delayed") {
    await createAlert(
      "delay",
      `${bus.id} is delayed`,
      bus.id
    );
  }
}

async function runSimulationTick() {
  const buses = await db.getBuses();
  const stops = await db.getStops();
  const traffic = await updateTraffic();

  for (const bus of buses) {
    const routeStops = stops.filter(stop => stop.route_id === bus.route_id);
    await updateBus(bus, routeStops.length, traffic.multiplier);
  }
}

function startInterval() {
  if (intervalHandle) clearInterval(intervalHandle);

  intervalHandle = setInterval(() => {
    runSimulationTick().catch(err => {
      console.error("Simulation tick error:", err.message);
    });
  }, simulationIntervalMs);
}

function startSimulation() {
  runSimulationTick().catch(err => {
    console.error("Initial simulation error:", err.message);
  });

  startInterval();
}

function setSimulationInterval(ms) {
  simulationIntervalMs = ms;
  startInterval();
  return simulationIntervalMs;
}

function getSimulationInterval() {
  return simulationIntervalMs;
}

module.exports = {
  startSimulation,
  runSimulationTick,
  setSimulationInterval,
  getSimulationInterval
};
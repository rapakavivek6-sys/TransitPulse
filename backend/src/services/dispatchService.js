const db = require("./dbService");

async function generateDispatchRecommendations() {
  const buses = await db.getBuses();
  const occupancyPredictions = await db.getLatestPredictions("occupancy");
  const etaPredictions = await db.getLatestPredictions("eta");

  const occupancyMap = {};
  occupancyPredictions.forEach(p => {
    occupancyMap[p.bus_id] = Number(p.predicted_value);
  });

  const etaMap = {};
  etaPredictions.forEach(p => {
    etaMap[p.bus_id] = Number(p.predicted_value);
  });

  await db.clearDispatchRecommendations();

  for (const bus of buses) {
    const predictedOcc = occupancyMap[bus.id];
    const predictedEta = etaMap[bus.id];

    if (bus.status === "broken_down") {
      await db.insertDispatchRecommendation(
        bus.id,
        bus.route_id,
        "breakdown",
        `Dispatch a spare bus to route ${bus.route_id} due to breakdown of ${bus.id}.`,
        "high"
      );
      continue;
    }

    if (predictedOcc !== undefined && predictedOcc >= bus.capacity * 0.9) {
      await db.insertDispatchRecommendation(
        bus.id,
        bus.route_id,
        "overcrowding_risk",
        `Predicted occupancy is high for ${bus.id}. Consider dispatching a spare bus on route ${bus.route_id}.`,
        "high"
      );
    }

    if (bus.left_behind_total >= 20) {
      await db.insertDispatchRecommendation(
        bus.id,
        bus.route_id,
        "left_behind",
        `Left-behind passengers are high for ${bus.id}. Consider dispatch support on route ${bus.route_id}.`,
        "medium"
      );
    }

    if (predictedEta !== undefined && predictedEta >= 8) {
      await db.insertDispatchRecommendation(
        bus.id,
        bus.route_id,
        "delay_risk",
        `Predicted ETA is high for ${bus.id}. Monitor route ${bus.route_id} and consider extra vehicle support.`,
        "medium"
      );
    }
  }
}

module.exports = {
  generateDispatchRecommendations
};
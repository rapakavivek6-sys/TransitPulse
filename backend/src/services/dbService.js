const pool = require("../config/db");

async function getUsers() {
  const result = await pool.query("SELECT * FROM users ORDER BY id");
  return result.rows;
}

async function getBuses() {
  const result = await pool.query("SELECT * FROM buses ORDER BY id");
  return result.rows;
}

async function getStops() {
  const result = await pool.query("SELECT * FROM stops ORDER BY sequence");
  return result.rows;
}

async function getTraffic() {
  const result = await pool.query(`
    SELECT * FROM traffic
    ORDER BY updated_at DESC, id DESC
    LIMIT 1
  `);
  return result.rows[0];
}

async function getRoutes() {
  const result = await pool.query("SELECT * FROM routes ORDER BY id");
  return result.rows;
}

async function getAlerts() {
  const result = await pool.query(`
    SELECT * FROM alerts
    ORDER BY created_at DESC, id DESC
    LIMIT 50
  `);
  return result.rows;
}

async function getUnderground() {
  const result = await pool.query("SELECT * FROM underground_stations ORDER BY id");
  return result.rows;
}

async function getOverground() {
  const result = await pool.query("SELECT * FROM overground_stations ORDER BY id");
  return result.rows;
}

async function getLocalTrains() {
  const result = await pool.query("SELECT * FROM local_train_timings ORDER BY id");
  return result.rows;
}

async function updateBusBreak(busId, onBreak) {
  const result = await pool.query(
    `
    UPDATE buses
    SET on_break = $1,
        status = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
    `,
    [onBreak, onBreak ? "on_break" : "in_service", busId]
  );
  return result.rows[0];
}

async function updateBusStatus(busId, status) {
  const result = await pool.query(
    `
    UPDATE buses
    SET status = $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
    `,
    [status, busId]
  );
  return result.rows[0];
}

async function insertAlert(type, message, busId) {
  const result = await pool.query(
    `
    INSERT INTO alerts (type, message, bus_id)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [type, message, busId]
  );
  return result.rows[0];
}

async function updateTraffic(level, multiplier) {
  const result = await pool.query(
    `
    INSERT INTO traffic (level, multiplier)
    VALUES ($1, $2)
    RETURNING *
    `,
    [level, multiplier]
  );
  return result.rows[0];
}

async function updateAmbassadorCounts(busId, boarded, terminated, leftBehind) {
  const result = await pool.query(
    `
    UPDATE buses
    SET boarded_total = boarded_total + $1,
        terminated_total = terminated_total + $2,
        left_behind_total = left_behind_total + $3,
        occupancy = GREATEST(0, LEAST(capacity, occupancy + $1 - $2)),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *
    `,
    [boarded, terminated, leftBehind, busId]
  );
  return result.rows[0];
}

async function getManagerSummary() {
  const busesResult = await pool.query(`
    SELECT
      COUNT(*) AS total_buses,
      COALESCE(SUM(boarded_total), 0) AS total_boarded,
      COALESCE(SUM(terminated_total), 0) AS total_terminated,
      COALESCE(SUM(left_behind_total), 0) AS total_left_behind
    FROM buses
  `);

  const trafficResult = await pool.query(`
    SELECT level
    FROM traffic
    ORDER BY updated_at DESC, id DESC
    LIMIT 1
  `);

  return {
    totalBuses: Number(busesResult.rows[0].total_buses),
    totalBoarded: Number(busesResult.rows[0].total_boarded),
    totalTerminated: Number(busesResult.rows[0].total_terminated),
    totalLeftBehind: Number(busesResult.rows[0].total_left_behind),
    trafficLevel: trafficResult.rows[0]?.level || "unknown"
  };
}

async function getBusById(busId) {
  const result = await pool.query(
    "SELECT * FROM buses WHERE id = $1",
    [busId]
  );
  return result.rows[0];
}

async function updateBusSimulation(busId, updates) {
  const result = await pool.query(
    `
    UPDATE buses
    SET occupancy = $1,
        boarded_total = $2,
        terminated_total = $3,
        left_behind_total = $4,
        current_stop_index = $5,
        status = $6,
        next_eta_min = $7,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $8
    RETURNING *
    `,
    [
      updates.occupancy,
      updates.boarded_total,
      updates.terminated_total,
      updates.left_behind_total,
      updates.current_stop_index,
      updates.status,
      updates.next_eta_min,
      busId
    ]
  );
  return result.rows[0];
}

async function getLatestPredictions(predictionType = "eta") {
  const result = await pool.query(
    `
    SELECT DISTINCT ON (bus_id)
      bus_id,
      prediction_type,
      predicted_value,
      created_at
    FROM predictions
    WHERE prediction_type = $1
    ORDER BY bus_id, created_at DESC, id DESC
    `,
    [predictionType]
  );
  return result.rows;
}

async function clearDispatchRecommendations() {
  await pool.query("DELETE FROM dispatch_recommendations");
}

async function insertDispatchRecommendation(busId, routeId, reason, recommendation, priority) {
  const result = await pool.query(
    `
    INSERT INTO dispatch_recommendations (bus_id, route_id, reason, recommendation, priority)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [busId, routeId, reason, recommendation, priority]
  );
  return result.rows[0];
}

async function getDispatchRecommendations() {
  const result = await pool.query(`
    SELECT *
    FROM dispatch_recommendations
    ORDER BY created_at DESC, id DESC
  `);
  return result.rows;
}

async function insertFeatureLog(data) {
  const result = await pool.query(
    `
    INSERT INTO ml_feature_log (
      bus_id, route_id, current_stop_index,
      occupancy, capacity, status,
      traffic_level, traffic_multiplier,
      actual_next_eta, actual_occupancy
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `,
    [
      data.bus_id,
      data.route_id,
      data.current_stop_index,
      data.occupancy,
      data.capacity,
      data.status,
      data.traffic_level,
      data.traffic_multiplier,
      data.actual_next_eta,
      data.actual_occupancy
    ]
  );
}


module.exports = {
  getUsers,
  getBuses,
  getStops,
  getTraffic,
  getRoutes,
  getAlerts,
  getUnderground,
  getOverground,
  getLocalTrains,
  updateBusBreak,
  updateBusStatus,
  insertAlert,
  updateTraffic,
  updateAmbassadorCounts,
  getManagerSummary,
  getBusById,
  clearDispatchRecommendations,
  insertDispatchRecommendation,
  getDispatchRecommendations,
  insertFeatureLog,
  updateBusSimulation,
  getLatestPredictions
};
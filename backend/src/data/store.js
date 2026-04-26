const store = {
  users: [
    { id: 1, username: "admin", password: "admin123", role: "admin" },
    { id: 2, username: "controller1", password: "pass123", role: "controller" },
    { id: 3, username: "manager1", password: "pass123", role: "manager" },
    { id: 4, username: "ambassador1", password: "pass123", role: "ambassador" }
  ],

  routes: [
    {
      id: "R1",
      code: "BUS-R1",
      name: "Central Connector",
      mode: "bus",
      directionA: "Outbound",
      directionB: "Inbound",
      active: true
    }
  ],

  stops: [
    { id: "S1", routeId: "R1", name: "Alpha Stop", sequence: 1, lat: 51.5000, lon: -0.1000 },
    { id: "S2", routeId: "R1", name: "Bravo Stop", sequence: 2, lat: 51.5010, lon: -0.1010 },
    { id: "S3", routeId: "R1", name: "Charlie Stop", sequence: 3, lat: 51.5020, lon: -0.1020 },
    { id: "S4", routeId: "R1", name: "Delta Stop", sequence: 4, lat: 51.5030, lon: -0.1030 },
    { id: "S5", routeId: "R1", name: "Echo Stop", sequence: 5, lat: 51.5040, lon: -0.1040 }
  ],

  undergroundStations: [
    { id: "U1", name: "Central Underground", line: "Central Line", lat: 51.5005, lon: -0.1005 },
    { id: "U2", name: "Park Underground", line: "Piccadilly Line", lat: 51.5035, lon: -0.1035 }
  ],

  overgroundStations: [
    { id: "O1", name: "West Overground", line: "Mildmay Line", lat: 51.5050, lon: -0.1050 },
    { id: "O2", name: "East Overground", line: "Windrush Line", lat: 51.4985, lon: -0.0985 }
  ],

  localTrainTimings: [
    { id: 1, stationName: "Central Underground", destination: "North Terminal", departure: "08:00", platform: "1" },
    { id: 2, stationName: "Park Underground", destination: "City Junction", departure: "08:05", platform: "2" },
    { id: 3, stationName: "West Overground", destination: "South Cross", departure: "08:10", platform: "3" }
  ],

  buses: [
    {
      id: "BUS1",
      routeId: "R1",
      direction: "Outbound",
      type: "double_decker",
      capacity: 85,
      occupancy: 40,
      boardedTotal: 40,
      terminatedTotal: 0,
      leftBehindTotal: 0,
      currentStopIndex: 0,
      status: "in_service",
      nextEtaMin: 3,
      onBreak: false,
      updatedAt: new Date().toISOString()
    },
    {
      id: "BUS2",
      routeId: "R1",
      direction: "Inbound",
      type: "single_decker",
      capacity: 40,
      occupancy: 18,
      boardedTotal: 18,
      terminatedTotal: 0,
      leftBehindTotal: 0,
      currentStopIndex: 2,
      status: "in_service",
      nextEtaMin: 5,
      onBreak: false,
      updatedAt: new Date().toISOString()
    }
  ],

  traffic: {
    level: "moderate",
    multiplier: 1.0,
    updatedAt: new Date().toISOString()
  },

  simulationSettings: {
    refreshMs: 60000,
    lastTickAt: new Date().toISOString(),
    mode: "auto"
  },

  alerts: []
};

module.exports = store;
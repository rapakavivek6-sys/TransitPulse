const express = require("express");
const cors = require("cors");
const path = require("path");
const apiRoutes = require("./routes/api");
const { startSimulation } = require("./services/simulation");
const pool = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.redirect("/login.html");
});

app.use(express.static(path.join(__dirname, "../../frontend/public")));




const PORT = 5000;

pool.connect()
  .then(() => console.log("PostgreSQL connected successfully"))
  .catch(err => console.error("PostgreSQL connection error:", err.message));

app.listen(PORT, () => {
  console.log(`TransitPulse running at http://localhost:${PORT}`);
});

startSimulation();
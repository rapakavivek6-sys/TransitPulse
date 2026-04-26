const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "bus_ops",
  password: "Sunitha@1970",
  port: 5432
});

module.exports = pool;
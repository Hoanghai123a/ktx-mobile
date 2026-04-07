const { Pool, types } = require("pg");
require("dotenv").config();

types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/postgres",
});

pool.on("connect", () => {
  console.log("Connected to the database");
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};

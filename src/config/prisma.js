require("dotenv").config();

const { Temporal } = require("@js-temporal/polyfill");
if (!globalThis.Temporal) {
  globalThis.Temporal = Temporal;
}

const postgres = require("@prisma/orm-postgres/runtime").default;
const contract = require("../../prisma/contract.json");

const db = postgres({
  contractJson: contract,
  url: process.env.DATABASE_URL,
});

module.exports = db;
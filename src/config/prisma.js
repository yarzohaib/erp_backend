require("dotenv").config();

const postgres = require("@prisma/orm-postgres/runtime").default;
const contract = require("../../prisma/contract.json");

const db = postgres({
  contractJson: contract,
  url: process.env.DATABASE_URL,
});

module.exports = db;
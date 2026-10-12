require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const oauthLoginCodeRepository = {
  async create({ userId, codeHash, expiresAt }) {
    const res = await pool.query(
      `INSERT INTO "OAuthLoginCode" ("id", "userId", "codeHash", "expiresAt", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
       RETURNING "id", "userId", "codeHash", "expiresAt", "usedAt"`,
      [userId, codeHash, expiresAt]
    );

    return res.rows[0];
  },

  async consume(codeHash) {
    const res = await pool.query(
      `UPDATE "OAuthLoginCode"
       SET "usedAt" = NOW()
       WHERE "codeHash" = $1
         AND "usedAt" IS NULL
         AND "expiresAt" > NOW()
       RETURNING "userId"`,
      [codeHash]
    );

    return res.rows[0] ? res.rows[0].userId : null;
  },

  async findByCodeHash(codeHash) {
    const res = await pool.query(
      `SELECT "id", "userId", "codeHash", "expiresAt", "usedAt"
       FROM "OAuthLoginCode"
       WHERE "codeHash" = $1`,
      [codeHash]
    );

    return res.rows[0] || null;
  },
};

module.exports = oauthLoginCodeRepository;

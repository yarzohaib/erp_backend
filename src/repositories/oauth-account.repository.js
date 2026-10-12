require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const oauthAccountRepository = {
  async findByProviderAndAccountId(provider, providerAccountId) {
    const res = await pool.query(
      `SELECT "id", "userId", "provider", "providerAccountId", "email", "createdAt", "updatedAt"
       FROM "OAuthAccount"
       WHERE "provider" = $1 AND "providerAccountId" = $2`,
      [provider, providerAccountId]
    );

    return res.rows[0] || null;
  },

  async create({ userId, provider, providerAccountId, email }) {
    const res = await pool.query(
      `INSERT INTO "OAuthAccount" ("id", "userId", "provider", "providerAccountId", "email", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
       RETURNING "id", "userId", "provider", "providerAccountId", "email", "createdAt", "updatedAt"`,
      [userId, provider, providerAccountId, email || null]
    );

    return res.rows[0];
  },

  async findByUserId(userId) {
    const res = await pool.query(
      `SELECT "id", "userId", "provider", "providerAccountId", "email", "createdAt", "updatedAt"
       FROM "OAuthAccount"
       WHERE "userId" = $1`,
      [userId]
    );

    return res.rows;
  },
};

module.exports = oauthAccountRepository;

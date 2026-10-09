require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const emailVerificationRepository = {
  async create({ userId, tokenHash, expiresAt }) {
    const res = await pool.query(
      `INSERT INTO "EmailVerificationToken" ("id", "userId", "tokenHash", "expiresAt", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
       RETURNING "id", "userId", "tokenHash", "expiresAt", "usedAt"`,
      [userId, tokenHash, expiresAt]
    );

    return res.rows[0];
  },

  async findByTokenHash(tokenHash) {
    const res = await pool.query(
      `SELECT "id", "userId", "tokenHash", "expiresAt", "usedAt"
       FROM "EmailVerificationToken"
       WHERE "tokenHash" = $1`,
      [tokenHash]
    );

    return res.rows[0] || null;
  },

  async markAsUsed(id) {
    const res = await pool.query(
      `UPDATE "EmailVerificationToken"
       SET "usedAt" = NOW(), "updatedAt" = NOW()
       WHERE "id" = $1 AND "usedAt" IS NULL
       RETURNING "id", "usedAt"`,
      [id]
    );

    return res.rows[0];
  },

  async deletePendingByUserId(userId) {
    await pool.query(
      `DELETE FROM "EmailVerificationToken"
       WHERE "userId" = $1 AND "usedAt" IS NULL`,
      [userId]
    );
  },
};

module.exports = emailVerificationRepository;

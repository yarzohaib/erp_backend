const { Temporal } = require("@js-temporal/polyfill");
const db = require("../config/prisma");

const EmailVerificationToken = db.orm.public.EmailVerificationToken;

const emailVerificationRepository = {
  async create(data) {
    return EmailVerificationToken.create(data);
  },

  async findByTokenHash(tokenHash) {
    return EmailVerificationToken.first({
      tokenHash,
    });
  },

  async markAsUsed(id) {
    const usedAt = Temporal.Now.instant().toString();

    const query = db.raw.sql`
      UPDATE "EmailVerificationToken"
      SET "usedAt" = ${usedAt}::timestamptz
      WHERE "id" = ${id}
        AND "usedAt" IS NULL
    `
      .affectedCount()
      .build();

    const result = await db.runtime().execute(query);
    return typeof result === "number" ? result : (result?.affectedRows ?? result?.rowCount ?? 0);
  },

  async invalidateAllUnusedForUser(userId) {
    const usedAt = Temporal.Now.instant().toString();

    const query = db.raw.sql`
      UPDATE "EmailVerificationToken"
      SET "usedAt" = ${usedAt}::timestamptz
      WHERE "userId" = ${userId}
        AND "usedAt" IS NULL
    `
      .affectedCount()
      .build();

    const result = await db.runtime().execute(query);
    return typeof result === "number" ? result : (result?.affectedRows ?? result?.rowCount ?? 0);
  },
};

module.exports = emailVerificationRepository;

const { Temporal } = require("@js-temporal/polyfill");
const db = require("../config/prisma");

const PasswordResetToken =
  db.orm.public.PasswordResetToken;

const passwordResetRepository = {
  async create(data) {
    return PasswordResetToken.create(data);
  },

  async findByTokenHash(tokenHash) {
    return PasswordResetToken.first({
      tokenHash,
    });
  },

  async markAsUsed(id) {
    const usedAt = Temporal.Now.instant().toString();

    const query = db.raw.sql`
      UPDATE "PasswordResetToken"
      SET "usedAt" = ${usedAt}::timestamptz
      WHERE "id" = ${id}
        AND "usedAt" IS NULL
    `
      .affectedCount()
      .build();

    return db.runtime().execute(query);
  },
};

module.exports = passwordResetRepository;
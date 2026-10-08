const { Temporal } = require("@js-temporal/polyfill");
const db = require("../config/prisma");

const Session = db.orm.public.Session;

const sessionRepository = {
  async create(data) {
    return Session.create(data);
  },

  async findById(id) {
    return Session.first({ id });
  },

  async findByRefreshTokenHash(refreshTokenHash) {
    return Session.first({ refreshTokenHash });
  },

  async findByUserId(userId) {
    return Session.where({ userId }).all();
  },

  async revokeById(id) {
    const revokedAt = Temporal.Now.instant().toString();

    const query = db.raw.sql`
      UPDATE "Session"
      SET "revokedAt" = ${revokedAt}::timestamptz
      WHERE "id" = ${id}
    `
      .affectedCount()
      .build();

    return db.runtime().execute(query);
  },

  async revokeAllByUserId(userId) {
    const revokedAt = Temporal.Now.instant().toString();

    const query = db.raw.sql`
      UPDATE "Session"
      SET "revokedAt" = ${revokedAt}::timestamptz
      WHERE "userId" = ${userId}
        AND "revokedAt" IS NULL
    `
      .affectedCount()
      .build();

    return db.runtime().execute(query);
  },

  async deleteById(id) {
    return Session.delete({ id });
  },
};

module.exports = sessionRepository;
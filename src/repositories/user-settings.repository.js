const { Temporal } = require("@js-temporal/polyfill");
const db = require("../config/prisma");

const UserSettings = db.orm.public.UserSettings;

const userSettingsRepository = {
  /**
   * Find settings for a specific user.
   */
  async findByUserId(userId) {
    return UserSettings.where({ userId }).first();
  },

  /**
   * Upsert settings for a user.
   */
  async upsert(userId, settingsData) {
    const existing = await UserSettings.where({ userId }).first();
    const now = Temporal.Now.instant();

    if (existing) {
      await UserSettings.where({ userId }).update({
        ...settingsData,
        updatedAt: now,
      });
    } else {
      await UserSettings.create({
        userId,
        ...settingsData,
        updatedAt: now,
      });
    }

    return UserSettings.where({ userId }).first();
  },

  /**
   * Set premiumWaitlistAt to now if not already set (idempotent).
   */
  async joinWaitlist(userId) {
    const existing = await UserSettings.where({ userId }).first();
    const now = Temporal.Now.instant();

    if (existing) {
      if (!existing.premiumWaitlistAt) {
        await UserSettings.where({ userId }).update({
          premiumWaitlistAt: now,
          updatedAt: now,
        });
      }
    } else {
      await UserSettings.create({
        userId,
        premiumWaitlistAt: now,
        updatedAt: now,
      });
    }

    return UserSettings.where({ userId }).first();
  },
};

module.exports = userSettingsRepository;

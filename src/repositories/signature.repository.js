const { Temporal } = require("@js-temporal/polyfill");
const db = require("../config/prisma");

const Signature = db.orm.public.Signature;

const signatureRepository = {
  /**
   * List all signatures for a user, newest updatedAt first.
   * Every query filters strictly by userId.
   */
  async listByUser(userId) {
    return Signature.where({ userId })
      .orderBy((s) => s.updatedAt.desc())
      .all();
  },

  /**
   * Find a specific signature by id and userId.
   * Ensures a user can never access another user's signature.
   */
  async findByIdForUser(id, userId) {
    return Signature.where({ id, userId }).first();
  },

  /**
   * Count signatures owned by a user.
   */
  async countByUser(userId) {
    const signatures = await Signature.where({ userId }).all();
    return signatures.length;
  },

  /**
   * Create a new signature for a user.
   */
  async create({ userId, name, templateId, templateVersion = 1, data }) {
    return Signature.create({
      userId,
      name,
      templateId,
      templateVersion,
      data,
    });
  },

  /**
   * Update an existing signature owned by a user.
   * Automatically refreshes updatedAt timestamp.
   */
  async update(id, userId, updateData) {
    const now = Temporal.Now.instant();
    const payload = {
      ...updateData,
      updatedAt: now,
    };
    return Signature.where({ id, userId }).update(payload);
  },

  /**
   * Delete a signature owned by a user.
   */
  async delete(id, userId) {
    return Signature.where({ id, userId }).delete();
  },
};

module.exports = signatureRepository;

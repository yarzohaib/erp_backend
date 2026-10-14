const signatureRepository = require("../repositories/signature.repository");
const { NotFoundError, ForbiddenError } = require("../utils/errors");

const signatureService = {
  /**
   * List all signatures for the authenticated user.
   */
  async list(userId) {
    return signatureRepository.listByUser(userId);
  },

  /**
   * Get a single signature by id for the authenticated user.
   * Throws 404 if signature does not exist or belongs to another user.
   */
  async get(id, userId) {
    const signature = await signatureRepository.findByIdForUser(id, userId);
    if (!signature) {
      throw new NotFoundError("Signature not found", "SIGNATURE_NOT_FOUND");
    }
    return signature;
  },

  /**
   * Create a new signature for the authenticated user.
   * Enforces the account plan limit (SIGNATURE_LIMIT_PER_USER).
   */
  async create(userId, { name, templateId, templateVersion, data }) {
    const limit = Number(process.env.SIGNATURE_LIMIT_PER_USER || 3);
    const count = await signatureRepository.countByUser(userId);

    if (count >= limit) {
      throw new ForbiddenError(
        `You have reached the maximum signature limit (${limit}) for your account. Please delete an existing signature or upgrade your plan.`,
        "SIGNATURE_LIMIT_REACHED"
      );
    }

    return signatureRepository.create({
      userId,
      name,
      templateId,
      templateVersion,
      data,
    });
  },

  /**
   * Update an existing signature for the authenticated user.
   * Throws 404 if signature does not exist or belongs to another user.
   */
  async update(id, userId, updateData) {
    const existing = await signatureRepository.findByIdForUser(id, userId);
    if (!existing) {
      throw new NotFoundError("Signature not found", "SIGNATURE_NOT_FOUND");
    }

    const updated = await signatureRepository.update(id, userId, updateData);
    if (!updated || !updated.id) {
      return signatureRepository.findByIdForUser(id, userId);
    }
    return updated;
  },

  /**
   * Remove a signature for the authenticated user.
   * Throws 404 if signature does not exist or belongs to another user.
   */
  async remove(id, userId) {
    const existing = await signatureRepository.findByIdForUser(id, userId);
    if (!existing) {
      throw new NotFoundError("Signature not found", "SIGNATURE_NOT_FOUND");
    }

    await signatureRepository.delete(id, userId);
    return true;
  },

  /**
   * Duplicate an existing signature with a new ID and name `${name} (Copy)`.
   * Enforces the account plan limit (SIGNATURE_LIMIT_PER_USER).
   */
  async duplicate(id, userId) {
    const limit = Number(process.env.SIGNATURE_LIMIT_PER_USER || 3);
    const count = await signatureRepository.countByUser(userId);

    if (count >= limit) {
      throw new ForbiddenError(
        `You have reached the maximum signature limit (${limit}) for your account. Please delete an existing signature or upgrade your plan.`,
        "SIGNATURE_LIMIT_REACHED"
      );
    }

    const original = await signatureRepository.findByIdForUser(id, userId);
    if (!original) {
      throw new NotFoundError("Signature not found", "SIGNATURE_NOT_FOUND");
    }

    const duplicateName = `${original.name} (Copy)`.slice(0, 100);

    return signatureRepository.create({
      userId,
      name: duplicateName,
      templateId: original.templateId,
      templateVersion: original.templateVersion,
      data: original.data,
    });
  },
};

module.exports = signatureService;

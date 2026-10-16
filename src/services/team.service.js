const teamRepository = require("../repositories/team.repository");
const signatureRepository = require("../repositories/signature.repository");
const {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} = require("../utils/errors");

const teamService = {
  /**
   * Get team owned by user with its members ordered by createdAt ascending.
   * Returns null if user does not have a team.
   */
  async getByOwner(userId) {
    return teamRepository.getWithMembersByOwner(userId);
  },

  /**
   * Create a team from an existing signature snapshot.
   * Loads signature, validates ownership, checks team uniqueness,
   * creates the team with a deep copy of data and default memberLimit.
   * Original signature remains untouched.
   */
  async createFromSignature(userId, { signatureId, name }) {
    const signature = await signatureRepository.findByIdForUser(signatureId, userId);
    if (!signature) {
      throw new NotFoundError("Signature not found", "SIGNATURE_NOT_FOUND");
    }

    const existingTeam = await teamRepository.findByOwner(userId);
    if (existingTeam) {
      throw new ConflictError("User already has a team", "TEAM_EXISTS");
    }

    const memberLimit = Number(process.env.TEAM_MEMBER_LIMIT_FREE || 3);
    const kind = signature.templateId === "design-studio" ? "studio" : "template";
    const teamName = name && name.trim() ? name.trim() : signature.name;
    const snapshotData = JSON.parse(JSON.stringify(signature.data));

    const team = await teamRepository.createTeam({
      ownerId: userId,
      name: teamName,
      kind,
      templateId: signature.templateId,
      templateVersion: signature.templateVersion,
      data: snapshotData,
      memberLimit,
    });

    return {
      ...team,
      members: [],
    };
  },

  /**
   * Update team name and/or data.
   * Throws 404 TEAM_NOT_FOUND if user has no team.
   */
  async updateTeam(userId, patch) {
    const team = await teamRepository.findByOwner(userId);
    if (!team) {
      throw new NotFoundError("Team not found", "TEAM_NOT_FOUND");
    }

    const updatePayload = {};
    if (patch.name !== undefined) {
      updatePayload.name = patch.name.trim();
    }
    if (patch.data !== undefined) {
      updatePayload.data = patch.data;
    }

    await teamRepository.updateTeam(team.id, updatePayload);
    return teamRepository.getWithMembersByOwner(userId);
  },

  /**
   * Delete team and cascade delete its members.
   * Throws 404 TEAM_NOT_FOUND if user has no team.
   */
  async deleteTeam(userId) {
    const team = await teamRepository.findByOwner(userId);
    if (!team) {
      throw new NotFoundError("Team not found", "TEAM_NOT_FOUND");
    }

    await teamRepository.deleteTeam(team.id);
    return true;
  },

  /**
   * Add a member to the user's team.
   * Enforces memberLimit and unique email within the team.
   */
  async addMember(userId, input) {
    const team = await teamRepository.findByOwner(userId);
    if (!team) {
      throw new NotFoundError("Team not found", "TEAM_NOT_FOUND");
    }

    const currentMemberCount = await teamRepository.countMembers(team.id);
    if (currentMemberCount >= team.memberLimit) {
      throw new ForbiddenError(
        `You have reached the maximum limit of ${team.memberLimit} team members allowed on your plan.`,
        "TEAM_MEMBER_LIMIT_REACHED"
      );
    }

    const email = input.email.trim().toLowerCase();
    const existingMember = await teamRepository.findMemberByTeamAndEmail(team.id, email);
    if (existingMember) {
      throw new ConflictError(
        "A team member with this email already exists in your team",
        "TEAM_MEMBER_EXISTS"
      );
    }

    return teamRepository.createMember({
      teamId: team.id,
      name: input.name.trim(),
      email,
      jobTitle: input.jobTitle !== undefined ? input.jobTitle.trim() : "",
      phone: input.phone !== undefined ? input.phone.trim() : "",
      photoUrl: input.photoUrl !== undefined ? input.photoUrl.trim() : "",
      status: "draft",
    });
  },

  /**
   * Update an existing team member.
   * Scoped strictly through the user's own team.
   * If email is changed after status is sent or accepted, reset status to draft
   * and clear tokenHash, tokenExpiresAt, sentAt and acceptedAt.
   */
  async updateMember(userId, memberId, input) {
    const team = await teamRepository.findByOwner(userId);
    if (!team) {
      throw new NotFoundError("Team not found", "TEAM_NOT_FOUND");
    }

    const member = await teamRepository.findMemberById(memberId);
    if (!member || member.teamId !== team.id) {
      throw new NotFoundError("Team member not found", "TEAM_MEMBER_NOT_FOUND");
    }

    const updatePayload = {};
    if (input.name !== undefined) {
      updatePayload.name = input.name.trim();
    }
    if (input.jobTitle !== undefined) {
      updatePayload.jobTitle = input.jobTitle.trim();
    }
    if (input.phone !== undefined) {
      updatePayload.phone = input.phone.trim();
    }
    if (input.photoUrl !== undefined) {
      updatePayload.photoUrl = input.photoUrl.trim();
    }

    if (input.email !== undefined) {
      const newEmail = input.email.trim().toLowerCase();
      if (newEmail !== member.email) {
        const duplicate = await teamRepository.findMemberByTeamAndEmail(team.id, newEmail);
        if (duplicate && duplicate.id !== memberId) {
          throw new ConflictError(
            "A team member with this email already exists in your team",
            "TEAM_MEMBER_EXISTS"
          );
        }

        updatePayload.email = newEmail;
        if (member.status === "sent" || member.status === "accepted") {
          updatePayload.status = "draft";
          updatePayload.tokenHash = null;
          updatePayload.tokenExpiresAt = null;
          updatePayload.sentAt = null;
          updatePayload.acceptedAt = null;
        }
      }
    }

    return teamRepository.updateMember(memberId, updatePayload);
  },

  /**
   * Remove a member from the user's team.
   * Scoped strictly through the user's own team.
   */
  async removeMember(userId, memberId) {
    const team = await teamRepository.findByOwner(userId);
    if (!team) {
      throw new NotFoundError("Team not found", "TEAM_NOT_FOUND");
    }

    const member = await teamRepository.findMemberById(memberId);
    if (!member || member.teamId !== team.id) {
      throw new NotFoundError("Team member not found", "TEAM_MEMBER_NOT_FOUND");
    }

    await teamRepository.deleteMember(memberId);
    return true;
  },
};

module.exports = teamService;

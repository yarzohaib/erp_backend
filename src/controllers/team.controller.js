const teamService = require("../services/team.service");

/**
 * Computes live member status: returns "expired" if status is "sent" and tokenExpiresAt has elapsed.
 */
function computeMemberStatus(member) {
  if (member.status === "sent" && member.tokenExpiresAt) {
    const expiresAtDate = new Date(member.tokenExpiresAt.toString());
    if (expiresAtDate.getTime() <= Date.now()) {
      return "expired";
    }
  }
  return member.status || "draft";
}

/**
 * Formats a TeamMember record ensuring tokenHash is never exposed.
 */
function formatMember(member) {
  if (!member) return null;
  return {
    id: member.id,
    teamId: member.teamId,
    name: member.name,
    email: member.email,
    jobTitle: member.jobTitle || "",
    phone: member.phone || "",
    photoUrl: member.photoUrl || "",
    socials: Array.isArray(member.socials) ? member.socials : [],
    status: computeMemberStatus(member),
    tokenExpiresAt:
      member.tokenExpiresAt
        ? typeof member.tokenExpiresAt?.toISOString === "function"
          ? member.tokenExpiresAt.toISOString()
          : String(member.tokenExpiresAt)
        : null,
    sentAt:
      member.sentAt
        ? typeof member.sentAt?.toISOString === "function"
          ? member.sentAt.toISOString()
          : String(member.sentAt)
        : null,
    acceptedAt:
      member.acceptedAt
        ? typeof member.acceptedAt?.toISOString === "function"
          ? member.acceptedAt.toISOString()
          : String(member.acceptedAt)
        : null,
    sendCount: member.sendCount ?? 0,
    createdAt:
      typeof member.createdAt?.toISOString === "function"
        ? member.createdAt.toISOString()
        : String(member.createdAt),
    updatedAt:
      typeof member.updatedAt?.toISOString === "function"
        ? member.updatedAt.toISOString()
        : String(member.updatedAt),
  };
}

/**
 * Formats a Team record ensuring consistent response shape.
 */
function formatTeam(team) {
  if (!team) return null;
  return {
    id: team.id,
    ownerId: team.ownerId,
    name: team.name,
    kind: team.kind,
    templateId: team.templateId,
    templateVersion: team.templateVersion,
    data: team.data,
    memberLimit: team.memberLimit,
    createdAt:
      typeof team.createdAt?.toISOString === "function"
        ? team.createdAt.toISOString()
        : String(team.createdAt),
    updatedAt:
      typeof team.updatedAt?.toISOString === "function"
        ? team.updatedAt.toISOString()
        : String(team.updatedAt),
    members: Array.isArray(team.members) ? team.members.map(formatMember) : [],
  };
}

const teamController = {
  /**
   * GET /api/v1/team
   * Get the authenticated user's team with members.
   */
  async getTeam(req, res, next) {
    try {
      const userId = req.user.id || req.user.sub;
      const team = await teamService.getByOwner(userId);

      return res.status(200).json({
        success: true,
        data: team ? formatTeam(team) : null,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/team
   * Create a team from an existing signature snapshot.
   */
  async createTeam(req, res, next) {
    try {
      const userId = req.user.id || req.user.sub;
      const team = await teamService.createFromSignature(userId, req.body);

      return res.status(201).json({
        success: true,
        message: "Team created successfully",
        data: formatTeam(team),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/v1/team
   * Update team name and/or data.
   */
  async updateTeam(req, res, next) {
    try {
      const userId = req.user.id || req.user.sub;
      const updated = await teamService.updateTeam(userId, req.body);

      return res.status(200).json({
        success: true,
        message: "Team updated successfully",
        data: formatTeam(updated),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/team
   * Delete team and all members.
   */
  async deleteTeam(req, res, next) {
    try {
      const userId = req.user.id || req.user.sub;
      await teamService.deleteTeam(userId);

      return res.status(200).json({
        success: true,
        message: "Team deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/team/members
   * Add a new member to the team.
   */
  async addMember(req, res, next) {
    try {
      const userId = req.user.id || req.user.sub;
      const member = await teamService.addMember(userId, req.body);

      return res.status(201).json({
        success: true,
        message: "Team member added successfully",
        data: formatMember(member),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/v1/team/members/:memberId
   * Update an existing team member.
   */
  async updateMember(req, res, next) {
    try {
      const userId = req.user.id || req.user.sub;
      const { memberId } = req.params;
      const member = await teamService.updateMember(userId, memberId, req.body);

      return res.status(200).json({
        success: true,
        message: "Team member updated successfully",
        data: formatMember(member),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/v1/team/members/:memberId
   * Remove a member from the team.
   */
  async removeMember(req, res, next) {
    try {
      const userId = req.user.id || req.user.sub;
      const { memberId } = req.params;
      await teamService.removeMember(userId, memberId);

      return res.status(200).json({
        success: true,
        message: "Team member removed successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/team/members/:memberId/send
   * Generate token and send or resend invite email.
   */
  async sendInvite(req, res, next) {
    try {
      const userId = req.user.id || req.user.sub;
      const { memberId } = req.params;
      const result = await teamService.sendInvite(userId, memberId);

      if (result.suppressed) {
        return res.status(200).json({
          success: true,
          delivered: false,
          suppressed: true,
          ...(result.devInviteUrl && { devInviteUrl: result.devInviteUrl }),
          data: {
            ...formatMember(result.member),
            ...(result.devInviteUrl && { devInviteUrl: result.devInviteUrl }),
          },
        });
      }

      return res.status(200).json({
        success: true,
        delivered: true,
        message: "Invite email sent successfully",
        data: formatMember(result.member),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/team/members/:memberId/revoke
   * Revoke an active invite link for a team member.
   */
  async revokeInvite(req, res, next) {
    try {
      const userId = req.user.id || req.user.sub;
      const { memberId } = req.params;
      const updatedMember = await teamService.revokeInvite(userId, memberId);

      return res.status(200).json({
        success: true,
        message: "Team invite revoked successfully",
        data: formatMember(updatedMember),
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/public/team/invite/:token
   * Public endpoint to retrieve invite details for recipient.
   */
  async getPublicInvite(req, res, next) {
    try {
      const { token } = req.params;
      const data = await teamService.getPublicInvite(token);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/public/team/invite/:token/accept
   * Public endpoint to accept a team invite.
   */
  async acceptPublicInvite(req, res, next) {
    try {
      const { token } = req.params;
      const data = await teamService.acceptPublicInvite(token);

      return res.status(200).json({
        success: true,
        message: "Team invite accepted successfully",
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = {
  teamController,
  formatTeam,
  formatMember,
};

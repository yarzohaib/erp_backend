const { Temporal } = require("@js-temporal/polyfill");
const db = require("../config/prisma");

const Team = db.orm.public.Team;
const TeamMember = db.orm.public.TeamMember;

const teamRepository = {
  /**
   * Find team by ownerId.
   */
  async findByOwner(ownerId) {
    return Team.where({ ownerId }).first();
  },

  /**
   * Find team by ownerId with members ordered by createdAt ascending.
   */
  async getWithMembersByOwner(ownerId) {
    const team = await Team.where({ ownerId }).first();
    if (!team) return null;

    const members = await TeamMember.where({ teamId: team.id })
      .orderBy((m) => m.createdAt.asc())
      .all();

    return {
      ...team,
      members: members || [],
    };
  },

  /**
   * Create a new team.
   */
  async createTeam({
    ownerId,
    name,
    kind,
    templateId,
    templateVersion = 1,
    data,
    memberLimit = 3,
  }) {
    return Team.create({
      ownerId,
      name,
      kind,
      templateId,
      templateVersion,
      data,
      memberLimit,
    });
  },

  /**
   * Update an existing team.
   */
  async updateTeam(id, updateData) {
    const now = Temporal.Now.instant();
    const payload = {
      ...updateData,
      updatedAt: now,
    };
    const res = await Team.where({ id }).update(payload);
    if (!res || !res.id) {
      return Team.where({ id }).first();
    }
    return res;
  },

  /**
   * Delete a team by id.
   */
  async deleteTeam(id) {
    return Team.where({ id }).delete();
  },

  /**
   * Find all members belonging to a team ordered by createdAt ascending.
   */
  async findMembersByTeam(teamId) {
    return TeamMember.where({ teamId })
      .orderBy((m) => m.createdAt.asc())
      .all();
  },

  /**
   * Count all members in a team.
   */
  async countMembers(teamId) {
    const members = await TeamMember.where({ teamId }).all();
    return members.length;
  },

  /**
   * Find a single team member by id.
   */
  async findMemberById(id) {
    return TeamMember.where({ id }).first();
  },

  /**
   * Find a team member by teamId and email.
   */
  async findMemberByTeamAndEmail(teamId, email) {
    return TeamMember.where({ teamId, email }).first();
  },

  /**
   * Create a new team member.
   */
  async createMember({
    teamId,
    name,
    email,
    jobTitle = "",
    phone = "",
    photoUrl = "",
    status = "draft",
  }) {
    return TeamMember.create({
      teamId,
      name,
      email,
      jobTitle,
      phone,
      photoUrl,
      status,
    });
  },

  /**
   * Update a team member.
   */
  async updateMember(id, updateData) {
    const now = Temporal.Now.instant();
    const payload = {
      ...updateData,
      updatedAt: now,
    };
    const res = await TeamMember.where({ id }).update(payload);
    if (!res || !res.id) {
      return TeamMember.where({ id }).first();
    }
    return res;
  },

  /**
   * Delete a team member by id.
   */
  async deleteMember(id) {
    return TeamMember.where({ id }).delete();
  },
};

module.exports = teamRepository;

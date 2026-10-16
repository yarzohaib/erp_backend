const express = require("express");
const { teamController } = require("../controllers/team.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate, validateParams } = require("../middleware/validate.middleware");
const { createRateLimiter } = require("../middleware/rateLimiter.middleware");
const {
  createTeamSchema,
  updateTeamSchema,
  memberSchema,
  updateMemberSchema,
  teamMemberIdParamSchema,
} = require("../validators/team.validator");

const router = express.Router();

// All team routes require authentication
router.use(authenticate);

// Write rate limiter: 60 write requests per 15 minutes per user
const writeRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Too many write requests. Please try again later.",
  keyGenerator: (req) => req.user?.id || req.user?.sub || req.ip,
});

/**
 * @route   GET /api/v1/team
 * @desc    Get the current user's team signature with members
 * @access  Private
 */
router.get("/", teamController.getTeam);

/**
 * @route   POST /api/v1/team
 * @desc    Create a team from an existing signature snapshot
 * @access  Private
 */
router.post(
  "/",
  writeRateLimiter,
  validate(createTeamSchema),
  teamController.createTeam
);

/**
 * @route   PATCH /api/v1/team
 * @desc    Update team name and/or signature data
 * @access  Private
 */
router.patch(
  "/",
  writeRateLimiter,
  validate(updateTeamSchema),
  teamController.updateTeam
);

/**
 * @route   DELETE /api/v1/team
 * @desc    Delete team and cascade delete its members
 * @access  Private
 */
router.delete(
  "/",
  writeRateLimiter,
  teamController.deleteTeam
);

/**
 * @route   POST /api/v1/team/members
 * @desc    Add a new member to the team
 * @access  Private
 */
router.post(
  "/members",
  writeRateLimiter,
  validate(memberSchema),
  teamController.addMember
);

/**
 * @route   PATCH /api/v1/team/members/:memberId
 * @desc    Update an existing team member
 * @access  Private
 */
router.patch(
  "/members/:memberId",
  writeRateLimiter,
  validateParams(teamMemberIdParamSchema),
  validate(updateMemberSchema),
  teamController.updateMember
);

/**
 * @route   DELETE /api/v1/team/members/:memberId
 * @desc    Remove a member from the team
 * @access  Private
 */
router.delete(
  "/members/:memberId",
  writeRateLimiter,
  validateParams(teamMemberIdParamSchema),
  teamController.removeMember
);

module.exports = router;

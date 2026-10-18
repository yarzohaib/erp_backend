const express = require("express");
const { z } = require("zod");
const { teamController } = require("../controllers/team.controller");
const { validateParams } = require("../middleware/validate.middleware");
const { createRateLimiter } = require("../middleware/rateLimiter.middleware");

const router = express.Router();

// On all public responses set security headers: Cache-Control: no-store, Referrer-Policy: no-referrer, X-Robots-Tag: noindex
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Robots-Tag", "noindex");
  next();
});

// Validator for :token param (string, 20..100 characters, base64url characters only)
const inviteTokenParamSchema = z
  .object({
    token: z
      .string({ error: "Invite token is required" })
      .trim()
      .min(20, { error: "Invite token must be at least 20 characters" })
      .max(100, { error: "Invite token cannot exceed 100 characters" })
      .regex(/^[A-Za-z0-9_-]+$/, {
        error: "Invite token must contain only valid base64url characters",
      }),
  })
  .strip();

// Rate limit GET: 30 requests per 15 minutes per IP
const publicGetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many requests. Please try again later.",
  keyGenerator: (req) =>
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "unknown",
});

// Rate limit POST: 10 requests per 15 minutes per IP
const publicPostLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many accept requests. Please try again later.",
  keyGenerator: (req) =>
    req.ip ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    "unknown",
});

/**
 * @route   GET /api/v1/public/team/invite/:token
 * @desc    Get invite details for recipient
 * @access  Public
 */
router.get(
  "/invite/:token",
  publicGetLimiter,
  validateParams(inviteTokenParamSchema),
  teamController.getPublicInvite
);

/**
 * @route   POST /api/v1/public/team/invite/:token/accept
 * @desc    Accept a team signature invite
 * @access  Public
 */
router.post(
  "/invite/:token/accept",
  publicPostLimiter,
  validateParams(inviteTokenParamSchema),
  teamController.acceptPublicInvite
);

module.exports = router;

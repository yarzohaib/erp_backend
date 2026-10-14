const express = require("express");

const authController = require("../controllers/auth.controller");
const oauthController = require("../controllers/oauth.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  generalAuthLimiter,
  loginLimiter,
  signupLimiter,
  forgotPasswordLimiter,
  resendVerificationLimiter,
} = require("../middleware/rateLimiter.middleware");
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  requestVerificationSchema,
  verifyEmailSchema,
  oauthExchangeSchema,
} = require("../validators/auth.validator");

const router = express.Router();

// Apply general rate limiter across all auth routes
router.use(generalAuthLimiter);

// OAuth Routes
router.get("/google", oauthController.googleAuth);
router.get("/google/callback", oauthController.googleCallback);

router.get("/github", oauthController.githubAuth);
router.get("/github/callback", oauthController.githubCallback);

router.post(
  "/oauth/exchange",
  validate(oauthExchangeSchema),
  oauthController.oauthExchange
);

// Account creation & authentication
router.post("/signup", signupLimiter, validate(signupSchema), authController.signup);
router.post("/login", loginLimiter, validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

// Protected session management
router.get("/me", authenticate, authController.me);
router.post("/logout-all", authenticate, authController.logoutAll);
router.get("/sessions", authenticate, authController.sessions);
router.delete("/sessions/:id", authenticate, authController.revokeSession);

// Password recovery & email verification with abuse/cost protection
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  authController.resetPassword
);

router.post(
  "/request-verification",
  resendVerificationLimiter,
  validate(requestVerificationSchema),
  authController.requestVerification
);

router.post(
  "/verify-email",
  validate(verifyEmailSchema),
  authController.verifyEmail
);

module.exports = router;
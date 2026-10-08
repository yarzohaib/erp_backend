const express = require("express");

const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/signup", authController.signup);

router.post("/login", authController.login);

router.post("/refresh", authController.refresh);

router.post("/logout", authController.logout);

router.get("/me", authenticate, authController.me);

router.post(
  "/logout-all",
  authenticate,
  authController.logoutAll
);

router.get(
  "/sessions",
  authenticate,
  authController.sessions
);

router.delete(
  "/sessions/:id",
  authenticate,
  authController.revokeSession
);

router.post(
  "/forgot-password",
  authController.forgotPassword
);

router.post(
  "/reset-password",
  authController.resetPassword
);

module.exports = router;
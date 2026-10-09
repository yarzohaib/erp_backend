const authService = require("../services/auth.service");

const authController = {
  async signup(req, res) {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!firstName || !firstName.trim()) {
        return res.status(400).json({
          success: false,
          message: "First name is required",
        });
      }

      if (!email || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      const user = await authService.signup({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName ? lastName.trim() : null,
      });

      return res.status(201).json({
        success: true,
        message: "User created successfully",
        data: {
          user,
        },
      });
    } catch (error) {
      console.error("SIGNUP ERROR:", error);

      if (error.message === "User already exists") {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create user",
      });
    }
  },

async me(req, res) {
  try {
    const user = await authService.getCurrentUser(req.user.sub);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    console.error("ME ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get current user",
    });
  }
},

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Password is required",
        });
      }

      const result = await authService.login({
        email: email.trim(),
        password,
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      console.error("LOGIN ERROR:", error);

      if (error.message === "Invalid email or password") {
        return res.status(401).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message === "User account is inactive. Please contact support.") {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Login failed",
      });
    }
  },

  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      const tokens = await authService.refreshTokens(refreshToken);

      return res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: tokens,
      });
    } catch (error) {
      console.error("REFRESH ERROR:", error);

      return res.status(401).json({
        success: false,
        message: error.message || "Invalid refresh token",
      });
    }
  },

  async logout(req, res) {
  try {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return res.status(401).json({
      success: false,
      message: error.message || "Logout failed",
    });
  }
},

async logoutAll(req, res) {
  try {
    await authService.logoutAll(req.user.sub);

    return res.status(200).json({
      success: true,
      message: "Logged out from all sessions",
    });
  } catch (error) {
    console.error("LOGOUT ALL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to logout from all sessions",
    });
  }
},

async sessions(req, res) {
  try {
    const sessions = await authService.getSessions(req.user.sub);

    return res.status(200).json({
      success: true,
      data: {
        sessions,
      },
    });
  } catch (error) {
    console.error("SESSIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get sessions",
    });
  }
},

async revokeSession(req, res) {
  try {
    const { id } = req.params;

    await authService.revokeSession(req.user.sub, id);

    return res.status(200).json({
      success: true,
      message: "Session revoked successfully",
    });
  } catch (error) {
    console.error("REVOKE SESSION ERROR:", error);

    if (error.message === "Session not found") {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to revoke session",
    });
  }
},
async forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    await authService.forgotPassword(email);

    /*
     * Always return the same response whether
     * the email exists or not.
     */
    return res.status(200).json({
      success: true,
      message:
        "If an account exists for this email, a password reset link has been generated",
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process password reset request",
    });
  }
},

async resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    await authService.resetPassword(
      token,
      newPassword
    );

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    if (
      error.message ===
        "Invalid or expired reset token"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
},

async verifyEmail(req, res) {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    await authService.verifyEmail(email.trim());

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("VERIFY EMAIL ERROR:", error);

    if (error.message === "User not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to verify email",
    });
  }
},
};

module.exports = authController;
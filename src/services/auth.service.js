const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const { Temporal } = require("@js-temporal/polyfill");
const passwordResetRepository = require("../repositories/password-reset.repository");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");
const crypto = require("crypto");
const sessionRepository = require("../repositories/session.repository");

const userRepository = require("../repositories/user.repository");

const emailVerificationRepository = require("../repositories/email-verification.repository");
const mailService = require("./mail.service");

const RESET_TOKEN_TTL_MINUTES = 30;
const VERIFICATION_TOKEN_TTL_HOURS = 24;

function hashRefreshToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function hashResetToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function hashVerificationToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function isTokenExpired(expiresAt) {
  if (!expiresAt) return true;
  if (expiresAt instanceof Temporal.Instant) {
    return Temporal.Instant.compare(expiresAt, Temporal.Now.instant()) <= 0;
  }
  const time = new Date(expiresAt).getTime();
  return isNaN(time) || time <= Date.now();
}

async function issueUserSession(user, { userAgent, ipAddress } = {}) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const refreshTokenHash = hashRefreshToken(refreshToken);

  const expiresAt = Temporal.Instant.fromEpochMilliseconds(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  await sessionRepository.create({
    userId: user.id,
    refreshTokenHash,
    expiresAt,
    userAgent: userAgent || null,
    ipAddress: ipAddress || null,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}

const authService = {
  async signup({ email, password, firstName, lastName }) {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await userRepository.findFirst({
      email: normalizedEmail,
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await argon2.hash(password);

    const user = await userRepository.create({
      email: normalizedEmail,
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName ? lastName.trim() : null,
    });

    // Generate verification token (24-hour expiration)
    try {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashVerificationToken(rawToken);

      const expiresAt = Temporal.Instant.fromEpochMilliseconds(
        Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000
      );

      await emailVerificationRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const frontendBase = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
      const verificationUrl = `${frontendBase}/verify?token=${rawToken}`;

      // Send verification email unawaited; signup must not fail if sending fails
      mailService
        .sendVerificationEmail({
          to: user.email,
          firstName: user.firstName,
          actionUrl: verificationUrl,
          expiresIn: `${VERIFICATION_TOKEN_TTL_HOURS} hours`,
        })
        .catch((err) => {
          console.error("[Auth Service] Failed to send verification email on signup:", err.message || err);
        });
    } catch (err) {
      console.error("[Auth Service] Failed to create verification token on signup:", err.message || err);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  },

async getCurrentUser(userId) {
  const user = await userRepository.findFirst({
    id: userId,
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
},

  issueUserSession,

  async login({ email, password }, context = {}) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findFirst({
      email: normalizedEmail,
    });

    if (!user || !user.password) {
      throw new Error("Invalid email or password");
    }

    if (!user.isActive) {
      throw new Error("User account is inactive. Please contact support.");
    }

    const passwordValid = await argon2.verify(
      user.password,
      password
    );

    if (!passwordValid) {
      throw new Error("Invalid email or password");
    }

    if (!user.isVerified) {
      throw new Error("Please verify your email address before logging in.");
    }

    return issueUserSession(user, context);
  },

async logout(refreshToken) {
  if (!refreshToken) {
    throw new Error("Refresh token is required");
  }

  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new Error("Invalid refresh token");
  }

  if (payload.type !== "refresh") {
    throw new Error("Invalid refresh token");
  }

  const refreshTokenHash = hashRefreshToken(refreshToken);

  const session = await sessionRepository.findByRefreshTokenHash(
    refreshTokenHash
  );

  if (!session) {
    throw new Error("Session not found");
  }

  if (!session.revokedAt) {
    await sessionRepository.revokeById(session.id);
  }

  return {
    success: true,
  };
},

async logoutAll(userId) {
  await sessionRepository.revokeAllByUserId(userId);

  return {
    success: true,
  };
},

async getSessions(userId) {
  const sessions = await sessionRepository.findByUserId(userId);

  return sessions.map((session) => ({
    id: session.id,
    userId: session.userId,
    deviceName: session.deviceName,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }));
},

async revokeSession(userId, sessionId) {
  const session = await sessionRepository.findById(sessionId);

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.userId !== userId) {
    throw new Error("Session not found");
  }

  if (!session.revokedAt) {
    await sessionRepository.revokeById(session.id);
  }

  return {
    success: true,
  };
},

async refreshTokens(refreshToken) {
  if (!refreshToken) {
    throw new Error("Refresh token is required");
  }

  let payload;

  try {
  payload = verifyRefreshToken(refreshToken);
} catch (error) {
  console.error("JWT REFRESH ERROR:", error);
  throw new Error("Invalid refresh token");
}

  if (payload.type !== "refresh") {
    throw new Error("Invalid refresh token");
  }

  const refreshTokenHash = hashRefreshToken(refreshToken);

  const session = await sessionRepository.findByRefreshTokenHash(
    refreshTokenHash
  );

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.revokedAt) {
    throw new Error("Session has been revoked");
  }

  if (
    Temporal.Instant.compare(
      Temporal.Instant.from(session.expiresAt),
      Temporal.Now.instant()
    ) <= 0
  ) {
    throw new Error("Session has expired");
  }

  const user = await userRepository.findFirst({
    id: payload.sub,
  });

  if (!user || !user.isActive) {
    throw new Error("User is inactive or does not exist");
  }

  if (!user.isVerified) {
    throw new Error("Please verify your email address before continuing.");
  }

  await sessionRepository.revokeById(session.id);

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

  const newExpiresAt = Temporal.Instant.fromEpochMilliseconds(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  await sessionRepository.create({
    userId: user.id,
    refreshTokenHash: newRefreshTokenHash,
    expiresAt: newExpiresAt,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
},

  async forgotPassword(email) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findFirst({
      email: normalizedEmail,
    });

    /*
     * Always return success here.
     * This prevents attackers from discovering
     * which email addresses have accounts.
     */
    if (!user) {
      return {
        success: true,
      };
    }

    // Invalidate older unused reset tokens for this user
    await passwordResetRepository.invalidateAllUnusedForUser(user.id);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(rawToken);

    // Shared 30-minute expiration
    const expiresAt = Temporal.Instant.fromEpochMilliseconds(
      Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000
    );

    await passwordResetRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const frontendBase = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    const resetUrl = `${frontendBase}/reset?token=${rawToken}`;

    // Send email unawaited, never log the link or token
    mailService
      .sendPasswordResetEmail({
        to: user.email,
        firstName: user.firstName,
        actionUrl: resetUrl,
        expiresIn: `${RESET_TOKEN_TTL_MINUTES} minutes`,
      })
      .catch((err) => {
        console.error("[Auth Service] Failed to send password reset email:", err);
      });

    return {
      success: true,
    };
  },

  async resetPassword(token, newPassword) {
    if (!token) {
      throw new Error("Invalid or expired reset token");
    }

    if (!newPassword) {
      throw new Error("New password is required");
    }

    const tokenHash = hashResetToken(token.trim());

    const resetToken =
      await passwordResetRepository.findByTokenHash(tokenHash);

    if (!resetToken) {
      console.warn("[Auth Service] Reset token record not found for submitted token");
      throw new Error("Invalid or expired reset token");
    }

    if (resetToken.usedAt) {
      console.warn(`[Auth Service] Reset token was already used at: ${resetToken.usedAt}`);
      throw new Error("Invalid or expired reset token");
    }

    if (isTokenExpired(resetToken.expiresAt)) {
      console.warn(`[Auth Service] Reset token expired (expiresAt: ${resetToken.expiresAt})`);
      throw new Error("Invalid or expired reset token");
    }

    const user = await userRepository.findFirst({
      id: resetToken.userId,
    });

    if (!user || !user.isActive) {
      console.warn("[Auth Service] User account not found or inactive for reset token");
      throw new Error("Invalid or expired reset token");
    }

    // Fix race condition: mark the token as used FIRST using conditional update (usedAt IS NULL)
    // and verify that affected count is exactly 1 before updating the password
    const rawAffectedCount = await passwordResetRepository.markAsUsed(
      resetToken.id
    );
    const affectedCount = typeof rawAffectedCount === "number"
      ? rawAffectedCount
      : (rawAffectedCount?.affectedRows ?? rawAffectedCount?.rowCount ?? 0);

    if (affectedCount !== 1) {
      console.warn(`[Auth Service] markAsUsed returned affectedCount ${affectedCount} (expected 1)`);
      throw new Error("Invalid or expired reset token");
    }

    const passwordHash = await argon2.hash(newPassword);

    await userRepository.updatePassword(
      user.id,
      passwordHash
    );

    /*
     * Password change invalidates all existing
     * refresh-token sessions.
     */
    await sessionRepository.revokeAllByUserId(
      user.id
    );

    return {
      success: true,
    };
  },

  async requestEmailVerification(email) {
    const genericResponse = {
      success: true,
      message:
        "If an account exists for this email, a verification link has been generated",
    };

    if (!email) {
      return genericResponse;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findFirst({
      email: normalizedEmail,
    });

    // Always return generic response whether or not user exists
    if (!user) {
      return genericResponse;
    }

    // If user is already verified, do nothing and return generic response
    if (user.isVerified) {
      return genericResponse;
    }

    // Invalidate older unused verification tokens for this user
    await emailVerificationRepository.invalidateAllUnusedForUser(user.id);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashVerificationToken(rawToken);

    // 24 hours expiration
    const expiresAt = Temporal.Instant.fromEpochMilliseconds(
      Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000
    );

    await emailVerificationRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const frontendBase = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
    const verificationUrl = `${frontendBase}/verify?token=${rawToken}`;

    // Send email unawaited, never log token or link
    mailService
      .sendVerificationEmail({
        to: user.email,
        firstName: user.firstName,
        actionUrl: verificationUrl,
        expiresIn: `${VERIFICATION_TOKEN_TTL_HOURS} hours`,
      })
      .catch((err) => {
        console.error("[Auth Service] Failed to send verification email on request:", err);
      });

    return genericResponse;
  },

  async verifyEmailToken(token) {
    const INVALID_TOKEN_MESSAGE = "Invalid or expired verification token";

    if (!token) {
      throw new Error(INVALID_TOKEN_MESSAGE);
    }

    const tokenHash = hashVerificationToken(token.trim());
    const record = await emailVerificationRepository.findByTokenHash(tokenHash);

    if (!record) {
      console.warn("[Auth Service] Email verification token record not found");
      throw new Error(INVALID_TOKEN_MESSAGE);
    }

    if (record.usedAt) {
      console.warn(`[Auth Service] Email verification token already used at ${record.usedAt}`);
      throw new Error(INVALID_TOKEN_MESSAGE);
    }

    if (isTokenExpired(record.expiresAt)) {
      console.warn(`[Auth Service] Email verification token expired (expiresAt: ${record.expiresAt})`);
      throw new Error(INVALID_TOKEN_MESSAGE);
    }

    const user = await userRepository.findFirst({
      id: record.userId,
    });

    if (!user) {
      console.warn("[Auth Service] User not found for verification token");
      throw new Error(INVALID_TOKEN_MESSAGE);
    }

    // Mark as used atomically FIRST and check that affected count is 1
    const rawAffectedCount = await emailVerificationRepository.markAsUsed(record.id);
    const affectedCount = typeof rawAffectedCount === "number"
      ? rawAffectedCount
      : (rawAffectedCount?.affectedRows ?? rawAffectedCount?.rowCount ?? 0);

    if (affectedCount !== 1) {
      console.warn(`[Auth Service] markAsUsed returned affectedCount ${affectedCount} (expected 1)`);
      throw new Error(INVALID_TOKEN_MESSAGE);
    }

    // Set User.isVerified to true
    await userRepository.markAsVerified(user.email);

    return {
      success: true,
      message: "Email verified successfully",
    };
  },
};

module.exports = authService;
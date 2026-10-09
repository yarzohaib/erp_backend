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

  async login({ email, password }) {
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
   *
   * This prevents attackers from discovering
   * which email addresses have accounts.
   */
  if (!user) {
    return {
      success: true,
    };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");

  const tokenHash = hashResetToken(rawToken);

  // Match the design: 30 minutes expiration
  const expiresAt = Temporal.Instant.fromEpochMilliseconds(
    Date.now() + 30 * 60 * 1000
  );

  await passwordResetRepository.create({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const resetUrl =
    `${process.env.APP_URL}/api/v1/auth/reset-password?token=${rawToken}`;

  console.log("PASSWORD RESET URL (valid for 30 minutes):");
  console.log(resetUrl);

  return {
    success: true,
  };
},

async resetPassword(token, newPassword) {
  if (!token) {
    throw new Error("Reset token is required");
  }

  if (!newPassword) {
    throw new Error("New password is required");
  }

  const tokenHash = hashResetToken(token);

  const resetToken =
    await passwordResetRepository.findByTokenHash(tokenHash);

  if (!resetToken) {
    throw new Error("Invalid or expired reset token");
  }

  if (resetToken.usedAt) {
    throw new Error("Invalid or expired reset token");
  }

  const now = Temporal.Now.instant();

  if (
    Temporal.Instant.compare(
      Temporal.Instant.from(resetToken.expiresAt),
      now
    ) <= 0
  ) {
    throw new Error("Invalid or expired reset token");
  }

  const user = await userRepository.findFirst({
    id: resetToken.userId,
  });

  if (!user || !user.isActive) {
    throw new Error("Invalid or expired reset token");
  }

  const passwordHash = await argon2.hash(newPassword);

  await userRepository.updatePassword(
    user.id,
    passwordHash
  );

  await passwordResetRepository.markAsUsed(
    resetToken.id
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
  const normalizedEmail = email.trim().toLowerCase();
  const user = await userRepository.findFirst({
    email: normalizedEmail,
  });

  if (!user) {
    return {
      success: true,
      message:
        "If an account exists for this email, a verification link has been generated",
    };
  }

  if (user.isVerified) {
    return {
      success: true,
      message: "This email address is already verified.",
    };
  }

  await emailVerificationRepository.deletePendingByUserId(user.id);

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashVerificationToken(rawToken);

  // 24 hours expiration matching the email design
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await emailVerificationRepository.create({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const verifyUrl = `${process.env.APP_URL || "http://localhost:3000"}/verify?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

  console.log("EMAIL VERIFICATION URL (valid for 24 hours):");
  console.log(verifyUrl);

  return {
    success: true,
    message:
      "If an account exists for this email, a verification link has been generated",
  };
},

async verifyEmailToken(token) {
  if (!token) {
    throw new Error("Verification token is required");
  }

  const tokenHash = hashVerificationToken(token.trim());
  const record = await emailVerificationRepository.findByTokenHash(tokenHash);

  if (!record) {
    throw new Error("Invalid or expired verification token");
  }

  if (record.usedAt) {
    throw new Error("Verification token has already been used");
  }

  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    throw new Error("Verification token has expired. Please request a new verification link.");
  }

  const user = await userRepository.findFirst({
    id: record.userId,
  });

  if (!user) {
    throw new Error("User associated with this token not found");
  }

  await userRepository.markAsVerified(user.email);
  await emailVerificationRepository.markAsUsed(record.id);

  return {
    success: true,
    message: "Email verified successfully",
  };
},
};

module.exports = authService;
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_ALGORITHM = "HS256";
const JWT_ISSUER = process.env.JWT_ISSUER || "sigsignature.com";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "sigsignature-app";

function generateAccessToken(user, sessionId = null) {
  const payload = {
    sub: user.id,
    email: user.email,
    type: "access",
  };
  if (sessionId) {
    payload.sessionId = sessionId;
  }
  return jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET,
    {
      algorithm: JWT_ALGORITHM,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      type: "refresh",
      jti: crypto.randomUUID(),
    },
    process.env.JWT_REFRESH_SECRET,
    {
      algorithm: JWT_ALGORITHM,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  JWT_ALGORITHM,
  JWT_ISSUER,
  JWT_AUDIENCE,
};
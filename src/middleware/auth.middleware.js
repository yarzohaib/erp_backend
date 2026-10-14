const { verifyAccessToken } = require("../utils/jwt");

function authenticate(req, res, next) {
  try {
    let token = null;

    // 1. Prefer secure server-set HttpOnly cookie if present
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    // 2. Fall back to Authorization: Bearer <token> header for API / mobile clients
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      } else {
        return res.status(401).json({
          success: false,
          message: "Invalid authorization header format",
        });
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const payload = verifyAccessToken(token);

    if (payload.type !== "access") {
      return res.status(401).json({
        success: false,
        message: "Invalid access token type",
      });
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
}

module.exports = {
  authenticate,
};
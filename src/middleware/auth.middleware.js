const { verifyAccessToken } = require("../utils/jwt");

function authenticate(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const payload = verifyAccessToken(token);

    if (payload.type !== "access") {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
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
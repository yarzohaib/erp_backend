const { AppError } = require("../utils/errors");

function errorHandler(err, req, res, next) {
  // If headers have already been sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle known operational AppErrors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code && { code: err.code }),
    });
  }

  // Handle malformed JSON body errors
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Malformed JSON payload in request body",
    });
  }

  // Unhandled / unexpected errors: Log securely, do not leak raw stack traces or internal details
  console.error("[Unhandled Error]:", err);

  return res.status(500).json({
    success: false,
    message: "An unexpected error occurred. Please try again later.",
  });
}

module.exports = errorHandler;

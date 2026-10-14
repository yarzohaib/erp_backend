function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const firstIssue = result.error.issues?.[0];
      const errorMessage = firstIssue
        ? firstIssue.message
        : "Validation failed";

      return res.status(400).json({
        success: false,
        message: errorMessage,
        errors: result.error.issues,
      });
    }

    // Replace req.body with the sanitized and normalized data
    req.body = result.data;
    next();
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const firstIssue = result.error.issues?.[0];
      const errorMessage = firstIssue
        ? firstIssue.message
        : "Invalid parameters";

      return res.status(400).json({
        success: false,
        message: errorMessage,
        errors: result.error.issues,
      });
    }

    req.params = result.data;
    next();
  };
}

module.exports = {
  validate,
  validateParams,
};


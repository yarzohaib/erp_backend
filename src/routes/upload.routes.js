const express = require("express");
const uploadController = require("../controllers/upload.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { uploadPresignLimiter } = require("../middleware/rateLimiter.middleware");
const { presignUploadSchema } = require("../validators/upload.validator");

const router = express.Router();

/**
 * @route   POST /api/v1/uploads/presign
 * @desc    Generate a presigned S3 PUT URL for avatar or logo uploads
 * @access  Private (Authenticated users only, max 30 per hour)
 */
router.post(
  "/presign",
  authenticate,
  uploadPresignLimiter,
  validate(presignUploadSchema),
  uploadController.presign
);

module.exports = router;

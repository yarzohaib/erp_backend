const express = require("express");
const signatureController = require("../controllers/signature.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate, validateParams } = require("../middleware/validate.middleware");
const {
  createSignatureSchema,
  updateSignatureSchema,
  signatureIdParamSchema,
} = require("../validators/signature.validator");

const router = express.Router();

// All signature routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/signatures
 * @desc    List all signatures for the logged in user
 * @access  Private
 */
router.get("/", signatureController.list);

/**
 * @route   GET /api/v1/signatures/:id
 * @desc    Get a single signature by ID
 * @access  Private
 */
router.get(
  "/:id",
  validateParams(signatureIdParamSchema),
  signatureController.get
);

/**
 * @route   POST /api/v1/signatures
 * @desc    Create a new signature
 * @access  Private
 */
router.post(
  "/",
  validate(createSignatureSchema),
  signatureController.create
);

/**
 * @route   PATCH /api/v1/signatures/:id
 * @desc    Update an existing signature
 * @access  Private
 */
router.patch(
  "/:id",
  validateParams(signatureIdParamSchema),
  validate(updateSignatureSchema),
  signatureController.update
);

/**
 * @route   DELETE /api/v1/signatures/:id
 * @desc    Delete a signature
 * @access  Private
 */
router.delete(
  "/:id",
  validateParams(signatureIdParamSchema),
  signatureController.remove
);

/**
 * @route   POST /api/v1/signatures/:id/duplicate
 * @desc    Duplicate an existing signature
 * @access  Private
 */
router.post(
  "/:id/duplicate",
  validateParams(signatureIdParamSchema),
  signatureController.duplicate
);

module.exports = router;

const { z } = require("zod");

/**
 * Validator for updating user profile.
 * - firstName: 1 to 60, trimmed, required if sent
 * - lastName: 0 to 60, nullable
 * - companyName: 0 to 100, nullable
 * - email: ignored silently if sent
 * - strips unknown keys
 */
const updateProfileSchema = z
  .object({
    firstName: z
      .string({ error: "First name must be a string" })
      .trim()
      .min(1, { error: "First name cannot be empty" })
      .max(60, { error: "First name cannot exceed 60 characters" })
      .optional(),
    lastName: z
      .string({ error: "Last name must be a string" })
      .trim()
      .max(60, { error: "Last name cannot exceed 60 characters" })
      .nullable()
      .optional(),
    companyName: z
      .string({ error: "Company name must be a string" })
      .trim()
      .max(100, { error: "Company name cannot exceed 100 characters" })
      .nullable()
      .optional(),
    email: z.any().optional(), // Ignored silently
  })
  .strip()
  .refine(
    (body) => {
      return (
        body.firstName !== undefined ||
        body.lastName !== undefined ||
        body.companyName !== undefined
      );
    },
    {
      error: "At least one field (firstName, lastName, or companyName) must be provided for update",
    }
  );

/**
 * Validator for updating account settings.
 * - defaultTemplateId: null or slug string max 64, safe characters only
 * - defaultExportFormat: "html" or "plain"
 * - signatureFont: string max 40, letters digits spaces only
 * - brandColor: hex like #245FD4
 * - includePhoto: boolean
 * - notifyProductUpdates: boolean
 * - notifyTips: boolean
 * - strips unknown keys
 */
const updateSettingsSchema = z
  .object({
    defaultTemplateId: z
      .string({ error: "Default template ID must be a string" })
      .trim()
      .max(64, { error: "Default template ID cannot exceed 64 characters" })
      .regex(/^[a-zA-Z0-9_-]+$/, {
        error: "Default template ID may only contain letters, numbers, hyphens, and underscores",
      })
      .nullable()
      .optional(),
    defaultExportFormat: z
      .enum(["html", "plain"], {
        error: "Default export format must be 'html' or 'plain'",
      })
      .optional(),
    signatureFont: z
      .string({ error: "Signature font must be a string" })
      .trim()
      .min(1, { error: "Signature font cannot be empty" })
      .max(40, { error: "Signature font cannot exceed 40 characters" })
      .regex(/^[a-zA-Z0-9 ]+$/, {
        error: "Signature font may only contain letters, numbers, and spaces",
      })
      .optional(),
    brandColor: z
      .string({ error: "Brand color must be a string" })
      .trim()
      .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, {
        error: "Brand color must be a valid hex color code (e.g. #245FD4)",
      })
      .optional(),
    includePhoto: z
      .boolean({ error: "includePhoto must be a boolean" })
      .optional(),
    notifyProductUpdates: z
      .boolean({ error: "notifyProductUpdates must be a boolean" })
      .optional(),
    notifyTips: z
      .boolean({ error: "notifyTips must be a boolean" })
      .optional(),
  })
  .strip()
  .refine(
    (body) => {
      return (
        body.defaultTemplateId !== undefined ||
        body.defaultExportFormat !== undefined ||
        body.signatureFont !== undefined ||
        body.brandColor !== undefined ||
        body.includePhoto !== undefined ||
        body.notifyProductUpdates !== undefined ||
        body.notifyTips !== undefined
      );
    },
    {
      error: "At least one settings field must be provided for update",
    }
  );

/**
 * Validator for password change.
 * - currentPassword: string, required
 * - newPassword: adheres to signup password rules (min 8, 1 uppercase, 1 lowercase, 1 number, 1 special char)
 * - must differ from currentPassword
 */
const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: "Current password is required" })
      .min(1, { error: "Current password is required" }),
    newPassword: z
      .string({ error: "New password is required" })
      .min(8, { error: "Password must be at least 8 characters long" })
      .regex(/[A-Z]/, { error: "Password must contain at least one uppercase letter" })
      .regex(/[a-z]/, { error: "Password must contain at least one lowercase letter" })
      .regex(/[0-9]/, { error: "Password must contain at least one number" })
      .regex(
        /[^A-Za-z0-9]/,
        { error: "Password must contain at least one special character (!@#$%^&* etc.)" }
      ),
  })
  .strip()
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must differ from the current password",
    path: ["newPassword"],
  });

/**
 * Validator for account deletion.
 * - password: string optional (required if account has password)
 * - confirm: string optional (must equal 'DELETE' if account is OAuth only)
 */
const deleteAccountSchema = z
  .object({
    password: z.string().optional(),
    confirm: z.string().optional(),
  })
  .strip();

module.exports = {
  updateProfileSchema,
  updateSettingsSchema,
  changePasswordSchema,
  deleteAccountSchema,
};

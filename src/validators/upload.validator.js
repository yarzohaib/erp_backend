const { z } = require("zod");

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

const presignUploadSchema = z.object({
  kind: z.enum(["avatar", "logo"], {
    error: "Kind must be either 'avatar' or 'logo'",
  }),
  contentType: z.enum(ALLOWED_CONTENT_TYPES, {
    error: "Content type must be image/jpeg, image/png, or image/webp. SVG and other file types are not permitted.",
  }),
  size: z
    .number({ error: "Size is required" })
    .int("Size must be an integer")
    .min(1, "File size must be at least 1 byte")
    .max(2097152, "File size cannot exceed 2MB (2,097,152 bytes)"),
});

module.exports = {
  presignUploadSchema,
  ALLOWED_CONTENT_TYPES,
};

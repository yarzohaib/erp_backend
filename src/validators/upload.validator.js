const { z } = require("zod");

const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_KINDS = ["avatar", "logo"];
const MAX_UPLOAD_SIZE = 2097152; // 2MB (2,097,152 bytes)

function friendlyEnum(name, allowedValues, isOptional = false) {
  return z
    .any()
    .superRefine((val, ctx) => {
      if (val === undefined) {
        if (!isOptional) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${name} is required`,
          });
        }
        return;
      }
      const checkVal = typeof val === "string" ? val.trim() : val;
      if (!allowedValues.includes(checkVal)) {
        const displayVal =
          typeof val === "object" && val !== null
            ? JSON.stringify(val)
            : String(val);
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid ${name} "${displayVal}". Allowed values: ${allowedValues.join(", ")}`,
        });
      }
    })
    .transform((val) => (typeof val === "string" ? val.trim() : val));
}

const presignUploadSchema = z.object({
  kind: friendlyEnum("kind", ALLOWED_KINDS, true).default("avatar"),
  contentType: friendlyEnum("contentType", ALLOWED_CONTENT_TYPES, false),
  size: z.any().superRefine((val, ctx) => {
    if (val === undefined || val === null || val === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Size is required",
      });
      return;
    }
    if (typeof val !== "number" || !Number.isInteger(val)) {
      const displayVal =
        typeof val === "object" && val !== null
          ? JSON.stringify(val)
          : String(val);
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid size "${displayVal}". File size must be an integer`,
      });
      return;
    }
    if (val < 1 || val > MAX_UPLOAD_SIZE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid size "${val}". File size must be between 1 and ${MAX_UPLOAD_SIZE} bytes (2MB)`,
      });
    }
  }),
});

module.exports = {
  presignUploadSchema,
  ALLOWED_CONTENT_TYPES,
  ALLOWED_KINDS,
  MAX_UPLOAD_SIZE,
};

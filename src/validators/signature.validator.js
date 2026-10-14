const { z } = require("zod");

/**
 * Validates that an image URL is either:
 * 1. A relative path starting with "/" and containing no "//" or ".."
 * 2. An HTTPS URL starting with process.env.S3_PUBLIC_BASE_URL
 * Reject data: URLs and anything else.
 */
const isValidImageUrl = (val) => {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("data:")) return false;

  // Relative path starting with "/" and containing no "//" or ".."
  if (trimmed.startsWith("/")) {
    if (trimmed.includes("//") || trimmed.includes("..")) {
      return false;
    }
    return true;
  }

  // HTTPS URL starting with process.env.S3_PUBLIC_BASE_URL
  const s3Base = (
    process.env.S3_PUBLIC_BASE_URL ||
    "https://sigsignature-assets-prod.s3.ap-southeast-2.amazonaws.com"
  ).replace(/\/+$/, "");

  if (trimmed.startsWith("https://") && trimmed.startsWith(s3Base)) {
    return true;
  }

  return false;
};

/**
 * Validates social URL: must be empty string or a valid HTTP/HTTPS URL (max 300 chars)
 */
const isValidSocialUrl = (val) => {
  if (val === "" || val === undefined || val === null) return true;
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const socialsSchema = z
  .object({
    linkedin: z
      .string()
      .trim()
      .max(300, { error: "LinkedIn URL cannot exceed 300 characters" })
      .refine(isValidSocialUrl, {
        error: "LinkedIn URL must be empty or a valid HTTP/HTTPS URL",
      })
      .default(""),
    twitter: z
      .string()
      .trim()
      .max(300, { error: "Twitter URL cannot exceed 300 characters" })
      .refine(isValidSocialUrl, {
        error: "Twitter URL must be empty or a valid HTTP/HTTPS URL",
      })
      .default(""),
    facebook: z
      .string()
      .trim()
      .max(300, { error: "Facebook URL cannot exceed 300 characters" })
      .refine(isValidSocialUrl, {
        error: "Facebook URL must be empty or a valid HTTP/HTTPS URL",
      })
      .default(""),
    instagram: z
      .string()
      .trim()
      .max(300, { error: "Instagram URL cannot exceed 300 characters" })
      .refine(isValidSocialUrl, {
        error: "Instagram URL must be empty or a valid HTTP/HTTPS URL",
      })
      .optional()
      .default(""),
  })
  .strip()
  .default({});

const optionalSchema = z
  .object({
    address: z
      .string()
      .trim()
      .max(250, { error: "Address cannot exceed 250 characters" })
      .optional()
      .default(""),
    tagline: z
      .string()
      .trim()
      .max(150, { error: "Tagline cannot exceed 150 characters" })
      .optional()
      .default(""),
    disclaimer: z
      .string()
      .trim()
      .max(1000, { error: "Disclaimer cannot exceed 1000 characters" })
      .optional()
      .default(""),
  })
  .strip()
  .default({});

const signatureDataSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .max(100, { error: "Full name cannot exceed 100 characters" })
      .default(""),
    jobTitle: z
      .string()
      .trim()
      .max(100, { error: "Job title cannot exceed 100 characters" })
      .default(""),
    companyName: z
      .string()
      .trim()
      .max(100, { error: "Company name cannot exceed 100 characters" })
      .default(""),
    email: z
      .string()
      .trim()
      .max(254, { error: "Email cannot exceed 254 characters" })
      .default(""),
    phone: z
      .string()
      .trim()
      .max(40, { error: "Phone cannot exceed 40 characters" })
      .default(""),
    website: z
      .string()
      .trim()
      .max(200, { error: "Website cannot exceed 200 characters" })
      .default(""),
    avatarUrl: z
      .string({ error: "Avatar URL is required" })
      .trim()
      .refine(isValidImageUrl, {
        error:
          "Avatar URL must be a relative path starting with '/' or an HTTPS URL hosted on authorized storage",
      }),
    companyLogoUrl: z
      .string()
      .trim()
      .refine((val) => val === "" || isValidImageUrl(val), {
        error:
          "Company logo URL must be empty, a relative path starting with '/', or an HTTPS URL hosted on authorized storage",
      })
      .optional()
      .default(""),
    themeColor: z
      .string({ error: "Theme color is required" })
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, {
        error: "Theme color must be a valid hex color code matching #RRGGBB",
      }),
    fontFamily: z
      .string({ error: "Font family is required" })
      .trim()
      .max(40, { error: "Font family cannot exceed 40 characters" }),
    layout: z.enum(["two-column", "horizontal", "compact"], {
      error: "Layout must be one of 'two-column', 'horizontal', or 'compact'",
    }),
    socialIconsStyle: z.enum(["filled", "outline", "circle"], {
      error:
        "Social icons style must be one of 'filled', 'outline', or 'circle'",
    }),
    socials: socialsSchema,
    optional: optionalSchema,
    address: z
      .string()
      .trim()
      .max(250, { error: "Address cannot exceed 250 characters" })
      .optional(),
    tagline: z
      .string()
      .trim()
      .max(150, { error: "Tagline cannot exceed 150 characters" })
      .optional(),
    disclaimer: z
      .string()
      .trim()
      .max(1000, { error: "Disclaimer cannot exceed 1000 characters" })
      .optional(),
  })
  .strip();

const createSignatureSchema = z
  .object({
    name: z
      .string({ error: "Name is required" })
      .trim()
      .min(1, { error: "Name cannot be empty" })
      .max(100, { error: "Name cannot exceed 100 characters" }),
    templateId: z
      .string({ error: "Template ID is required" })
      .trim()
      .min(1, { error: "Template ID cannot be empty" })
      .max(64, { error: "Template ID cannot exceed 64 characters" })
      .regex(/^[a-z0-9-]+$/, {
        error:
          "Template ID must contain only lowercase letters, digits, and dashes",
      }),
    templateVersion: z
      .number({ error: "Template version must be a number" })
      .int({ error: "Template version must be an integer" })
      .min(1, { error: "Template version must be between 1 and 1000" })
      .max(1000, { error: "Template version must be between 1 and 1000" })
      .default(1),
    data: signatureDataSchema,
  })
  .strip()
  .refine(
    (body) => Buffer.byteLength(JSON.stringify(body.data), "utf8") <= 20480,
    {
      error: "Signature data payload size cannot exceed 20 KB",
      path: ["data"],
    }
  );

const updateSignatureSchema = z
  .object({
    name: z
      .string({ error: "Name must be a string" })
      .trim()
      .min(1, { error: "Name cannot be empty" })
      .max(100, { error: "Name cannot exceed 100 characters" })
      .optional(),
    templateId: z
      .string({ error: "Template ID must be a string" })
      .trim()
      .min(1, { error: "Template ID cannot be empty" })
      .max(64, { error: "Template ID cannot exceed 64 characters" })
      .regex(/^[a-z0-9-]+$/, {
        error:
          "Template ID must contain only lowercase letters, digits, and dashes",
      })
      .optional(),
    templateVersion: z
      .number({ error: "Template version must be a number" })
      .int({ error: "Template version must be an integer" })
      .min(1, { error: "Template version must be between 1 and 1000" })
      .max(1000, { error: "Template version must be between 1 and 1000" })
      .optional(),
    data: signatureDataSchema.optional(),
  })
  .strip()
  .refine(
    (body) => {
      return (
        body.name !== undefined ||
        body.templateId !== undefined ||
        body.templateVersion !== undefined ||
        body.data !== undefined
      );
    },
    {
      error:
        "At least one field (name, templateId, templateVersion, or data) must be provided for update",
    }
  )
  .refine(
    (body) => {
      if (!body.data) return true;
      return Buffer.byteLength(JSON.stringify(body.data), "utf8") <= 20480;
    },
    {
      error: "Signature data payload size cannot exceed 20 KB",
      path: ["data"],
    }
  );

const signatureIdParamSchema = z
  .object({
    id: z
      .string({ error: "Signature ID is required" })
      .trim()
      .min(1, { error: "Signature ID cannot be empty" })
      .max(64, { error: "Signature ID cannot exceed 64 characters" }),
  })
  .strip();

module.exports = {
  createSignatureSchema,
  updateSignatureSchema,
  signatureIdParamSchema,
  signatureDataSchema,
  isValidImageUrl,
};

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
 * Validates that an S3 image URL is strictly an HTTPS URL
 * starting with process.env.S3_PUBLIC_BASE_URL.
 * Relative paths, data: URLs, and other origins are rejected.
 */
const isValidS3Url = (val) => {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("data:")) return false;

  const s3Base = (
    process.env.S3_PUBLIC_BASE_URL ||
    "https://sigsignature-assets-prod.s3.ap-southeast-2.amazonaws.com"
  ).replace(/\/+$/, "");

  return trimmed.startsWith("https://") && trimmed.startsWith(s3Base);
};

/**
 * Validates optional HTTP/HTTPS URL (max 300 chars, empty string or undefined allowed).
 */
const isValidHttpUrl = (val) => {
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

/**
 * Validates social URL: must be empty string or a valid HTTP/HTTPS URL (max 300 chars)
 */
const isValidSocialUrl = (val) => {
  return isValidHttpUrl(val);
};

const ALLOWED_FONT_FAMILIES = [
  "Arial",
  "Georgia",
  "Verdana",
  "Trebuchet MS",
  "Tahoma",
  "Inter",
  "Roboto",
  "DM Sans",
  "Montserrat",
  "Commissioner",
];

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

/**
 * Optional design configuration (Design Studio).
 * Rejects premium themes (luxury, glass, neon) and shapes (glass, blob).
 */
const designSchema = z
  .object({
    theme: z.enum(["corporate", "minimal", "modern", "dark"], {
      error:
        "Theme must be one of 'corporate', 'minimal', 'modern', or 'dark'",
    }),
    shape: z.enum(["rounded", "square", "pill"], {
      error: "Shape must be one of 'rounded', 'square', or 'pill'",
    }),
    buttonStyle: z.enum(["solid", "outline"], {
      error: "Button style must be one of 'solid' or 'outline'",
    }),
  })
  .strip();

/**
 * Discriminated union of extra items (maximum 20 items in extras array).
 */
const extraTextSchema = z
  .object({
    type: z.literal("text"),
    id: z
      .string({ error: "Item ID is required" })
      .trim()
      .min(1, { error: "Item ID cannot be empty" })
      .max(40, { error: "Item ID cannot exceed 40 characters" }),
    text: z
      .string({ error: "Text is required" })
      .trim()
      .max(300, { error: "Text cannot exceed 300 characters" }),
    align: z.enum(["left", "center", "right"], {
      error: "Align must be one of 'left', 'center', or 'right'",
    }),
    size: z.enum(["sm", "md", "lg"], {
      error: "Size must be one of 'sm', 'md', or 'lg'",
    }),
    bold: z.boolean({ error: "Bold must be a boolean" }),
    width: z
      .number({ error: "Width must be a number" })
      .int({ error: "Width must be an integer" })
      .min(20, { error: "Width must be between 20 and 600" })
      .max(600, { error: "Width must be between 20 and 600" })
      .optional(),
    column: z.enum(["left", "right", "full"]).optional(),
  })
  .strip();

const extraImageSchema = z
  .object({
    type: z.literal("image"),
    id: z
      .string({ error: "Item ID is required" })
      .trim()
      .min(1, { error: "Item ID cannot be empty" })
      .max(40, { error: "Item ID cannot exceed 40 characters" }),
    url: z
      .string({ error: "Image URL is required" })
      .trim()
      .refine(isValidS3Url, {
        error:
          "Image URL must be an HTTPS URL hosted on authorized storage",
      }),
    width: z
      .number({ error: "Width must be a number" })
      .int({ error: "Width must be an integer" })
      .min(20, { error: "Width must be between 20 and 600" })
      .max(600, { error: "Width must be between 20 and 600" }),
    align: z.enum(["left", "center", "right"], {
      error: "Align must be one of 'left', 'center', or 'right'",
    }),
    linkUrl: z
      .string()
      .trim()
      .max(300, { error: "Link URL cannot exceed 300 characters" })
      .refine(isValidHttpUrl, {
        error: "Link URL must be a valid HTTP or HTTPS URL",
      })
      .optional(),
    column: z.enum(["left", "right", "full"]).optional(),
  })
  .strip();

const extraDividerSchema = z
  .object({
    type: z.literal("divider"),
    id: z
      .string({ error: "Item ID is required" })
      .trim()
      .min(1, { error: "Item ID cannot be empty" })
      .max(40, { error: "Item ID cannot exceed 40 characters" }),
    width: z
      .number({ error: "Width must be a number" })
      .int({ error: "Width must be an integer" })
      .min(20, { error: "Width must be between 20 and 600" })
      .max(600, { error: "Width must be between 20 and 600" })
      .optional(),
    align: z
      .enum(["left", "center", "right"], {
        error: "Align must be one of 'left', 'center', or 'right'",
      })
      .optional(),
    thickness: z
      .number({ error: "Thickness must be a number" })
      .int({ error: "Thickness must be an integer" })
      .min(1, { error: "Thickness must be between 1 and 20" })
      .max(20, { error: "Thickness must be between 1 and 20" })
      .optional(),
    orientation: z
      .enum(["horizontal", "vertical"], {
        error: "Orientation must be 'horizontal' or 'vertical'",
      })
      .optional(),
    column: z.enum(["left", "right", "full"]).optional(),
  })
  .strip();

const extraCtaSchema = z
  .object({
    type: z.literal("cta"),
    id: z
      .string({ error: "Item ID is required" })
      .trim()
      .min(1, { error: "Item ID cannot be empty" })
      .max(40, { error: "Item ID cannot exceed 40 characters" }),
    label: z
      .string({ error: "Label is required" })
      .trim()
      .min(1, { error: "Label cannot be empty" })
      .max(40, { error: "Label cannot exceed 40 characters" }),
    url: z
      .string({ error: "URL is required" })
      .trim()
      .max(300, { error: "URL cannot exceed 300 characters" })
      .refine(
        (val) => {
          if (!val) return false;
          try {
            const parsed = new URL(val);
            return (
              parsed.protocol === "http:" || parsed.protocol === "https:"
            );
          } catch {
            return false;
          }
        },
        { error: "URL must be a valid HTTP or HTTPS URL" }
      ),
    align: z.enum(["left", "center", "right"], {
      error: "Align must be one of 'left', 'center', or 'right'",
    }),
    width: z
      .number({ error: "Width must be a number" })
      .int({ error: "Width must be an integer" })
      .min(20, { error: "Width must be between 20 and 600" })
      .max(600, { error: "Width must be between 20 and 600" })
      .optional(),
    column: z.enum(["left", "right", "full"]).optional(),
  })
  .strip();

const extraBannerSchema = z
  .object({
    type: z.literal("banner"),
    id: z
      .string({ error: "Item ID is required" })
      .trim()
      .min(1, { error: "Item ID cannot be empty" })
      .max(40, { error: "Item ID cannot exceed 40 characters" }),
    imageUrl: z
      .string({ error: "Banner image URL is required" })
      .trim()
      .refine(isValidS3Url, {
        error:
          "Banner image URL must be an HTTPS URL hosted on authorized storage",
      }),
    linkUrl: z
      .string()
      .trim()
      .max(300, { error: "Link URL cannot exceed 300 characters" })
      .refine(isValidHttpUrl, {
        error: "Link URL must be a valid HTTP or HTTPS URL",
      })
      .optional(),
    column: z.enum(["left", "right", "full"]).optional(),
  })
  .strip();

const extraItemSchema = z.discriminatedUnion(
  "type",
  [
    extraTextSchema,
    extraImageSchema,
    extraDividerSchema,
    extraCtaSchema,
    extraBannerSchema,
  ],
  {
    error:
      "Extra item type must be one of 'text', 'image', 'divider', 'cta', or 'banner'",
  }
);

const extrasSchema = z
  .array(extraItemSchema, {
    error: "Extras must be an array",
  })
  .max(20, { error: "Extras cannot exceed 20 items" })
  .optional();

const freeTextSchema = z
  .object({
    id: z.string().min(1).max(64),
    type: z.literal("text"),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    locked: z.boolean().optional(),
    text: z.string().max(1000).default(""),
    size: z.enum(["sm", "md", "lg"]).default("md"),
    bold: z.boolean().default(false),
    align: z.enum(["left", "center", "right"]).default("left"),
    bind: z.enum(["name", "jobTitle", "email", "phone"]).optional(),
  })
  .passthrough();

const freeImageSchema = z
  .object({
    id: z.string().min(1).max(64),
    type: z.literal("image"),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    locked: z.boolean().optional(),
    url: z.string().max(2000).default(""),
    linkUrl: z.string().max(2000).optional(),
    bind: z.enum(["photo"]).optional(),
  })
  .passthrough();

const freeLogoSchema = z
  .object({
    id: z.string().min(1).max(64),
    type: z.literal("logo"),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    locked: z.boolean().optional(),
    url: z.string().max(2000).default(""),
    linkUrl: z.string().max(2000).optional(),
  })
  .passthrough();

const freeBannerSchema = z
  .object({
    id: z.string().min(1).max(64),
    type: z.literal("banner"),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    locked: z.boolean().optional(),
    url: z.string().max(2000).default(""),
    linkUrl: z.string().max(2000).optional(),
  })
  .passthrough();

const freeDividerSchema = z
  .object({
    id: z.string().min(1).max(64),
    type: z.literal("divider"),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    locked: z.boolean().optional(),
    orientation: z.enum(["horizontal", "vertical"]).default("horizontal"),
    thickness: z.number().min(1).max(50).default(1),
  })
  .passthrough();

const freeCtaSchema = z
  .object({
    id: z.string().min(1).max(64),
    type: z.literal("cta"),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    locked: z.boolean().optional(),
    label: z.string().max(200).default("Button"),
    url: z.string().max(2000).default("#"),
  })
  .passthrough();

const freeSocialSchema = z
  .object({
    id: z.string().min(1).max(64),
    type: z.literal("social"),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    locked: z.boolean().optional(),
  })
  .passthrough();

const freeElementSchema = z.discriminatedUnion("type", [
  freeTextSchema,
  freeImageSchema,
  freeLogoSchema,
  freeBannerSchema,
  freeDividerSchema,
  freeCtaSchema,
  freeSocialSchema,
]);

const freeElementsSchema = z.array(freeElementSchema).max(50).optional();

const canvasSchema = z
  .object({
    width: z.number().int().min(100).max(1200).default(600),
    height: z.number().int().min(50).max(2000).default(200),
  })
  .passthrough()
  .optional();

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
      .string()
      .trim()
      .refine((val) => val === "" || isValidImageUrl(val), {
        error:
          "Avatar URL must be empty, a relative path starting with '/', or an HTTPS URL hosted on authorized storage",
      })
      .optional()
      .default(""),
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
    fontFamily: z.enum(ALLOWED_FONT_FAMILIES, {
      error:
        "Font family must be one of: Arial, Georgia, Verdana, Trebuchet MS, Tahoma, Inter, Roboto, DM Sans, Montserrat, Commissioner",
    }),
    layout: z.enum(["two-column", "horizontal", "compact", "single"], {
      error:
        "Layout must be one of 'two-column', 'horizontal', 'compact', or 'single'",
    }),
    socialIconsStyle: z.enum(["filled", "outline", "circle", "minimal"], {
      error:
        "Social icons style must be one of 'filled', 'outline', 'circle', or 'minimal'",
    }),
    design: designSchema.optional(),
    extras: extrasSchema,
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
    canvas: canvasSchema,
    elements: freeElementsSchema,
  })
  .passthrough();

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
    (body) => Buffer.byteLength(JSON.stringify(body.data), "utf8") <= 65536,
    {
      error: "Signature data payload size cannot exceed 64 KB",
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
      return Buffer.byteLength(JSON.stringify(body.data), "utf8") <= 65536;
    },
    {
      error: "Signature data payload size cannot exceed 64 KB",
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
  isValidS3Url,
  ALLOWED_FONT_FAMILIES,
};

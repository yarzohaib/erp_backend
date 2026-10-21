const { z } = require("zod");
const {
  signatureDataSchema,
  updateSignatureDataSchema,
  isValidS3Url,
} = require("./signature.validator");
const { plainTextString } = require("../utils/plainText");

const createTeamSchema = z
  .object({
    signatureId: z
      .string({ error: "Signature ID is required" })
      .trim()
      .min(1, { error: "Signature ID cannot be empty" })
      .max(64, { error: "Signature ID cannot exceed 64 characters" }),
    name: plainTextString({ max: 100, required: true }).optional(),
  })
  .strip();

const updateTeamSchema = z
  .object({
    name: plainTextString({ max: 100, required: true }).optional(),
    data: updateSignatureDataSchema.optional(),
  })
  .strip()
  .refine(
    (body) => body.name !== undefined || body.data !== undefined,
    {
      error: "At least one field (name or data) must be provided for update",
    }
  )
  .refine(
    (body) => {
      if (!body.data) return true;
      return Buffer.byteLength(JSON.stringify(body.data), "utf8") <= 65536;
    },
    {
      error: "Team signature data payload size cannot exceed 64 KB",
      path: ["data"],
    }
  );

const memberSocialItemSchema = z
  .object({
    platform: z.enum(
      [
        "linkedin",
        "x",
        "twitter",
        "facebook",
        "instagram",
        "github",
        "youtube",
        "website",
      ],
      { error: "Invalid social platform" }
    ),
    url: z
      .string({ error: "URL is required" })
      .trim()
      .max(300, { error: "URL cannot exceed 300 characters" })
      .refine(
        (val) => {
          try {
            const parsed = new URL(val);
            return parsed.protocol === "https:";
          } catch {
            return false;
          }
        },
        {
          error:
            "URL must be a valid HTTPS URL (http, javascript, and data schemes are not allowed)",
        }
      ),
  })
  .strip();

const memberSocialsSchema = z
  .array(memberSocialItemSchema, { error: "Socials must be an array" })
  .max(8, { error: "Socials cannot exceed 8 items" })
  .refine(
    (items) => {
      const platforms = items.map((i) => i.platform);
      return new Set(platforms).size === platforms.length;
    },
    { error: "Duplicate platforms are not allowed" }
  );

const memberSchema = z
  .object({
    name: plainTextString({ max: 100, required: true }),
    email: z
      .string({ error: "Email is required" })
      .trim()
      .toLowerCase()
      .max(254, { error: "Email cannot exceed 254 characters" })
      .email({ error: "Must be a valid email address" }),
    jobTitle: plainTextString({ max: 100 }).optional().default(""),
    phone: plainTextString({ max: 40 }).optional().default(""),
    photoUrl: z
      .string({ error: "Photo URL must be a string" })
      .trim()
      .refine((val) => val === "" || isValidS3Url(val), {
        error:
          "Photo URL must be empty or an HTTPS URL on authorized storage",
      })
      .optional()
      .default(""),
    socials: memberSocialsSchema.optional().default([]),
  })
  .strip();

const updateMemberSchema = z
  .object({
    name: plainTextString({ max: 100, required: true }).optional(),
    email: z
      .string({ error: "Email must be a string" })
      .trim()
      .toLowerCase()
      .max(254, { error: "Email cannot exceed 254 characters" })
      .email({ error: "Must be a valid email address" })
      .optional(),
    jobTitle: plainTextString({ max: 100 }).optional(),
    phone: plainTextString({ max: 40 }).optional(),
    photoUrl: z
      .string({ error: "Photo URL must be a string" })
      .trim()
      .refine((val) => val === "" || isValidS3Url(val), {
        error:
          "Photo URL must be empty or an HTTPS URL on authorized storage",
      })
      .optional(),
    socials: memberSocialsSchema.optional(),
  })
  .strip()
  .refine(
    (body) =>
      body.name !== undefined ||
      body.email !== undefined ||
      body.jobTitle !== undefined ||
      body.phone !== undefined ||
      body.photoUrl !== undefined ||
      body.socials !== undefined,
    {
      error:
        "At least one field (name, email, jobTitle, phone, photoUrl, or socials) must be provided for update",
    }
  );

const teamMemberIdParamSchema = z
  .object({
    memberId: z
      .string({ error: "Member ID is required" })
      .trim()
      .min(1, { error: "Member ID cannot be empty" })
      .max(64, { error: "Member ID cannot exceed 64 characters" }),
  })
  .strip();

module.exports = {
  createTeamSchema,
  updateTeamSchema,
  memberSchema,
  updateMemberSchema,
  teamMemberIdParamSchema,
};

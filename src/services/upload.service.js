const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const { BadRequestError, AppError } = require("../utils/errors");

// S3Client configured with default credential provider chain (supports EC2 instance IAM role)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

const ALLOWED_CONTENT_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const ALLOWED_KINDS = ["avatar", "logo"];

/**
 * Generate a presigned S3 PUT URL for client-side direct uploads.
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated user identifier
 * @param {'avatar'|'logo'} params.kind - Upload classification
 * @param {string} params.contentType - MIME type (image/jpeg, image/png, image/webp)
 * @param {number} params.size - Content length in bytes (max 2MB)
 * @returns {Promise<{ uploadUrl: string, key: string, publicUrl: string }>}
 */
async function createUploadUrl({ userId, kind, contentType, size }) {
  if (!userId) {
    throw new BadRequestError("User ID is required for generating an upload URL");
  }

  if (!ALLOWED_KINDS.includes(kind)) {
    throw new BadRequestError("Invalid upload kind. Must be 'avatar' or 'logo'");
  }

  const ext = ALLOWED_CONTENT_TYPES[contentType];
  if (!ext) {
    throw new BadRequestError(
      "Invalid content type. Only JPEG, PNG, and WebP images are permitted (SVGs are not allowed)."
    );
  }

  if (!Number.isInteger(size) || size < 1 || size > 2097152) {
    throw new BadRequestError("File size must be an integer between 1 byte and 2MB (2,097,152 bytes)");
  }

  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new AppError("S3 storage bucket is not configured on the server", 500, "S3_NOT_CONFIGURED");
  }

  // uploads/<userId>/<kind>/<crypto.randomUUID()>.<ext>
  const key = `uploads/${userId}/${kind}/${crypto.randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

  const publicBaseUrl = (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const publicUrl = publicBaseUrl
    ? `${publicBaseUrl}/${key}`
    : `https://${bucket}.s3.${process.env.AWS_REGION || "ap-southeast-2"}.amazonaws.com/${key}`;

  return {
    uploadUrl,
    key,
    publicUrl,
  };
}

module.exports = {
  createUploadUrl,
  ALLOWED_CONTENT_TYPES,
  s3Client,
};

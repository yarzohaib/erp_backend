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

const MAX_MIRROR_BYTES = 2097152;
const mirrorCache = new Map();
const MIRROR_CACHE_LIMIT = 500;

/**
 * Copy a sign in provider profile photo (Google or GitHub) into our own bucket and return
 * the public URL. Returns null on any failure so callers can keep the original URL.
 */
async function mirrorProviderAvatar({ userId, url }) {
  try {
    const { isTrustedProviderAvatarUrl } = require("../validators/signature.validator");
    if (!userId || !isTrustedProviderAvatarUrl(url)) return null;

    const bucket = process.env.S3_BUCKET;
    if (!bucket) return null;

    // Ask Google for a sharper copy than the default 96px thumbnail
    const sourceUrl = url.trim().replace(/=s\d+(-c)?$/, "=s400-c");
    const cacheKey = `${userId}:${sourceUrl}`;
    if (mirrorCache.has(cacheKey)) return mirrorCache.get(cacheKey);

    const response = await fetch(sourceUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    // After redirects the final host must still be a trusted provider host
    if (!isTrustedProviderAvatarUrl(response.url || sourceUrl)) return null;

    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim();
    const ext = ALLOWED_CONTENT_TYPES[contentType];
    if (!ext) return null;

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 1 || bytes.length > MAX_MIRROR_BYTES) return null;

    const hash = crypto.createHash("sha256").update(sourceUrl).digest("hex").slice(0, 24);
    const key = `uploads/${userId}/avatar/provider-${hash}.${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const publicBaseUrl = (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, "");
    const publicUrl = publicBaseUrl
      ? `${publicBaseUrl}/${key}`
      : `https://${bucket}.s3.${process.env.AWS_REGION || "ap-southeast-2"}.amazonaws.com/${key}`;

    if (mirrorCache.size >= MIRROR_CACHE_LIMIT) mirrorCache.clear();
    mirrorCache.set(cacheKey, publicUrl);
    return publicUrl;
  } catch (err) {
    console.warn("Could not copy provider avatar to storage:", err && err.message ? err.message : err);
    return null;
  }
}

module.exports = {
  mirrorProviderAvatar,
  createUploadUrl,
  ALLOWED_CONTENT_TYPES,
  s3Client,
};



// const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
// const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
// const crypto = require("crypto");
// const { BadRequestError, AppError } = require("../utils/errors");

// // S3Client configured with default credential provider chain (supports EC2 instance IAM role)
// const s3Client = new S3Client({
//   region: process.env.AWS_REGION || "ap-southeast-2",
// });

// const ALLOWED_CONTENT_TYPES = {
//   "image/jpeg": "jpg",
//   "image/png": "png",
//   "image/webp": "webp",
// };

// const ALLOWED_KINDS = ["avatar", "logo"];

// /**
//  * Generate a presigned S3 PUT URL for client-side direct uploads.
//  *
//  * @param {Object} params
//  * @param {string} params.userId - Authenticated user identifier
//  * @param {'avatar'|'logo'} params.kind - Upload classification
//  * @param {string} params.contentType - MIME type (image/jpeg, image/png, image/webp)
//  * @param {number} params.size - Content length in bytes (max 2MB)
//  * @returns {Promise<{ uploadUrl: string, key: string, publicUrl: string }>}
//  */
// async function createUploadUrl({ userId, kind, contentType, size }) {
//   if (!userId) {
//     throw new BadRequestError("User ID is required for generating an upload URL");
//   }

//   if (!ALLOWED_KINDS.includes(kind)) {
//     throw new BadRequestError("Invalid upload kind. Must be 'avatar' or 'logo'");
//   }

//   const ext = ALLOWED_CONTENT_TYPES[contentType];
//   if (!ext) {
//     throw new BadRequestError(
//       "Invalid content type. Only JPEG, PNG, and WebP images are permitted (SVGs are not allowed)."
//     );
//   }

//   if (!Number.isInteger(size) || size < 1 || size > 2097152) {
//     throw new BadRequestError("File size must be an integer between 1 byte and 2MB (2,097,152 bytes)");
//   }

//   const bucket = process.env.S3_BUCKET;
//   if (!bucket) {
//     throw new AppError("S3 storage bucket is not configured on the server", 500, "S3_NOT_CONFIGURED");
//   }

//   // uploads/<userId>/<kind>/<crypto.randomUUID()>.<ext>
//   const key = `uploads/${userId}/${kind}/${crypto.randomUUID()}.${ext}`;

//   const command = new PutObjectCommand({
//     Bucket: bucket,
//     Key: key,
//     ContentType: contentType,
//     ContentLength: size,
//   });

//   const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

//   const publicBaseUrl = (process.env.S3_PUBLIC_BASE_URL || "").replace(/\/$/, "");
//   const publicUrl = publicBaseUrl
//     ? `${publicBaseUrl}/${key}`
//     : `https://${bucket}.s3.${process.env.AWS_REGION || "ap-southeast-2"}.amazonaws.com/${key}`;

//   return {
//     uploadUrl,
//     key,
//     publicUrl,
//   };
// }

// module.exports = {
//   createUploadUrl,
//   ALLOWED_CONTENT_TYPES,
//   s3Client,
// };

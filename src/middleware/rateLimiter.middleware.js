/**
 * Production-ready, in-memory sliding window rate limiter.
 * Zero-dependency, sets standard RFC headers (Retry-After, X-RateLimit-*),
 * and automatically purges stale records to avoid memory growth.
 */

function createRateLimiter({
  windowMs = 15 * 60 * 1000, // 15 minutes default
  max = 10,
  message = "Too many requests. Please try again later.",
  keyGenerator = (req) => req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown",
} = {}) {
  // Map stores: key -> { count: number, resetAt: number }
  const store = new Map();

  // Periodic cleanup every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Unref so cleanup interval doesn't hold open process during tests/shutdown
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimiterMiddleware(req, res, next) {
    const key = keyGenerator(req);
    const now = Date.now();

    let record = store.get(key);

    if (!record || record.resetAt <= now) {
      record = {
        count: 1,
        resetAt: now + windowMs,
      };
      store.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetAt / 1000));

    if (record.count > max) {
      res.setHeader("Retry-After", retryAfterSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds,
      });
    }

    next();
  };
}

// 1. Login limiter: 10 attempts per 15 minutes per IP
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again after 15 minutes.",
});

// 2. Signup limiter: 10 signups per 1 hour per IP
const signupLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many accounts created from this IP. Please try again later.",
});

// 3. Forgot password limiter: 5 requests per 15 minutes per IP (saves AWS SES costs)
const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset requests. Please wait 15 minutes before trying again.",
});

// 4. Verification email limiter: 5 requests per 15 minutes per IP (saves AWS SES costs)
const resendVerificationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many verification requests. Please wait 15 minutes before requesting again.",
});

// 5. General auth endpoints limiter: 60 requests per minute
const generalAuthLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many requests to authentication service. Please slow down.",
});

// 6. Upload presign limiter: 30 requests per user per hour
const uploadPresignLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: "Too many upload requests. You may only request up to 30 upload URLs per hour.",
  keyGenerator: (req) => {
    const userId = req.user?.id || req.user?.sub;
    return userId ? `user:${userId}` : req.ip || "unknown";
  },
});

module.exports = {
  createRateLimiter,
  loginLimiter,
  signupLimiter,
  forgotPasswordLimiter,
  resendVerificationLimiter,
  generalAuthLimiter,
  uploadPresignLimiter,
};

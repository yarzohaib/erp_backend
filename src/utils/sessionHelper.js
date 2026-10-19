const crypto = require("crypto");

/**
 * Hash refresh token with SHA-256
 */
function hashRefreshToken(token) {
  if (!token || typeof token !== "string") return null;
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Parses userAgent into a human-readable device label (e.g. "Chrome · macOS").
 * Uses a built-in regex parser with zero external dependencies.
 */
function parseDeviceLabel(userAgent) {
  if (!userAgent || typeof userAgent !== "string") {
    return "Unknown device";
  }

  let os = null;
  let browser = null;

  // Operating system detection
  if (/windows phone/i.test(userAgent)) {
    os = "Windows Phone";
  } else if (/win(dows|98|nt|95)/i.test(userAgent)) {
    os = "Windows";
  } else if (/iphone/i.test(userAgent)) {
    os = "iOS";
  } else if (/ipad/i.test(userAgent)) {
    os = "iPadOS";
  } else if (/macintosh|mac os x/i.test(userAgent)) {
    os = "macOS";
  } else if (/android/i.test(userAgent)) {
    os = "Android";
  } else if (/cros/i.test(userAgent)) {
    os = "ChromeOS";
  } else if (/linux/i.test(userAgent)) {
    os = "Linux";
  }

  // Browser detection (order is important!)
  if (/edg([ea]|ios)?\//i.test(userAgent)) {
    browser = "Edge";
  } else if (/opr\/|opera/i.test(userAgent)) {
    browser = "Opera";
  } else if (/chrome|crios/i.test(userAgent)) {
    browser = "Chrome";
  } else if (/firefox|fxios/i.test(userAgent)) {
    browser = "Firefox";
  } else if (/safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent)) {
    browser = "Safari";
  } else if (/postmanruntime/i.test(userAgent)) {
    browser = "Postman";
  } else if (/curl/i.test(userAgent)) {
    browser = "cURL";
  }

  if (browser && os) {
    return `${browser} · ${os}`;
  }
  if (browser) {
    return browser;
  }
  if (os) {
    return `${os} Device`;
  }
  return "Unknown device";
}

/**
 * Masks IP address by hiding the last segment.
 * IPv4: 192.168.1.123 -> 192.168.1.***
 * IPv6: hides host/suffix bits
 */
function maskIpAddress(ip) {
  if (!ip || typeof ip !== "string") {
    return null;
  }

  const cleanIp = ip.trim();

  // IPv4 or IPv4-mapped IPv6 (::ffff:192.168.1.1)
  const ipv4Match = cleanIp.match(/(?:::ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
  if (ipv4Match) {
    return `${ipv4Match[1]}.***`;
  }

  // Pure IPv6 (e.g. 2001:db8:85a3::8a2e:370:7334)
  if (cleanIp.includes(":")) {
    const segments = cleanIp.split(":");
    if (segments.length > 2) {
      return `${segments.slice(0, 3).join(":")}:****:****`;
    }
    return `${cleanIp.substring(0, cleanIp.lastIndexOf(":") + 1)}***`;
  }

  // Fallback for any other format
  return cleanIp.replace(/\.[^.]+$/, ".***");
}

/**
 * Identifies the current session ID of an incoming request against a list of sessions.
 * Resolution precedence:
 * 1. req.user.sessionId (embedded in JWT access token)
 * 2. SHA-256 of refresh_token cookie or x-refresh-token header matching session.refreshTokenHash
 * 3. x-session-id header matching session.id
 * 4. Fallback to newest active (unrevoked) session
 */
function resolveCurrentSessionId(req, sessions = []) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return req?.user?.sessionId || null;
  }

  // 1. Direct session ID in decoded access token
  if (req?.user?.sessionId) {
    const match = sessions.find((s) => s.id === req.user.sessionId);
    if (match) return match.id;
  }

  // 2. Refresh token match (cookie or header)
  const refreshToken =
    req?.cookies?.refresh_token || req?.headers?.["x-refresh-token"];
  if (refreshToken) {
    const hash = hashRefreshToken(refreshToken);
    const match = sessions.find((s) => s.refreshTokenHash === hash);
    if (match) return match.id;
  }

  // 3. Request header x-session-id
  const headerSessionId = req?.headers?.["x-session-id"];
  if (headerSessionId) {
    const match = sessions.find((s) => s.id === headerSessionId);
    if (match) return match.id;
  }

  // 4. Fallback: most recently updated/created active session
  const activeSessions = sessions.filter((s) => !s.revokedAt);
  if (activeSessions.length > 0) {
    activeSessions.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
    return activeSessions[0].id;
  }

  return null;
}

module.exports = {
  hashRefreshToken,
  parseDeviceLabel,
  maskIpAddress,
  resolveCurrentSessionId,
};

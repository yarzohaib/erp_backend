const isProduction = process.env.NODE_ENV === "production";
const SESSION_TTL_DAYS = parseInt(process.env.SESSION_TTL_DAYS || "7", 10);
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15m default

const COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

function setAuthCookies(res, tokens) {
  if (tokens?.refreshToken) {
    res.cookie("refresh_token", tokens.refreshToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: SESSION_TTL_MS,
    });
  }

  if (tokens?.accessToken) {
    res.cookie("access_token", tokens.accessToken, {
      ...COOKIE_BASE_OPTIONS,
      maxAge: ACCESS_TOKEN_TTL_MS,
    });
  }
}

function clearAuthCookies(res) {
  res.clearCookie("refresh_token", COOKIE_BASE_OPTIONS);
  res.clearCookie("access_token", COOKIE_BASE_OPTIONS);
}

module.exports = {
  setAuthCookies,
  clearAuthCookies,
  COOKIE_BASE_OPTIONS,
  SESSION_TTL_MS,
  ACCESS_TOKEN_TTL_MS,
};

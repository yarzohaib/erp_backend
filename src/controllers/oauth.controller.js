const crypto = require("crypto");
const oauthService = require("../services/oauth.service");
const { setAuthCookies } = require("../utils/cookies");
const { UnauthorizedError } = require("../utils/errors");

const OAUTH_COOKIE_NAME = "oauth_state";

const cookieBaseOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/api/v1/auth",
};

const oauthController = {
  googleAuth(req, res) {
    const state = crypto.randomBytes(32).toString("hex");

    res.cookie(OAUTH_COOKIE_NAME, state, {
      ...cookieBaseOptions,
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    const targetUrl = oauthService.getGoogleAuthUrl(state);
    return res.redirect(302, targetUrl);
  },

  githubAuth(req, res) {
    const state = crypto.randomBytes(32).toString("hex");

    res.cookie(OAUTH_COOKIE_NAME, state, {
      ...cookieBaseOptions,
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    const targetUrl = oauthService.getGithubAuthUrl(state);
    return res.redirect(302, targetUrl);
  },

  async googleCallback(req, res) {
    const frontendBase = oauthService.getFrontendUrl();
    const { code, state, error } = req.query;
    const savedState = req.cookies ? req.cookies[OAUTH_COOKIE_NAME] : undefined;

    // Always clear the state cookie
    res.clearCookie(OAUTH_COOKIE_NAME, cookieBaseOptions);

    if (error) {
      console.error("Google returned OAuth error query:", error);
      const codeType = error === "access_denied" ? "oauth_cancelled" : "oauth_failed";
      return res.redirect(302, `${frontendBase}/login?error=${codeType}`);
    }

    if (!state || !savedState || !oauthService.safeCompareState(state, savedState)) {
      console.error("State mismatch or missing in Google callback:", { stateReceived: !!state, stateSaved: !!savedState });
      return res.redirect(302, `${frontendBase}/login?error=oauth_failed`);
    }

    if (!code) {
      console.error("Authorization code missing in Google callback");
      return res.redirect(302, `${frontendBase}/login?error=oauth_failed`);
    }

    try {
      const user = await oauthService.handleGoogleCallback(code);
      const loginCode = await oauthService.createLoginCodeForUser(user.id);

      return res.redirect(302, `${frontendBase}/auth/callback?code=${loginCode}`);
    } catch (err) {
      console.error("Google callback processing error:", err);
      let errorParam = "oauth_failed";
      if (err.message === "email_not_verified") {
        errorParam = "email_not_verified";
      } else if (err.message === "account_inactive") {
        errorParam = "account_inactive";
      } else if (err.message === "oauth_cancelled") {
        errorParam = "oauth_cancelled";
      }

      return res.redirect(302, `${frontendBase}/login?error=${errorParam}`);
    }
  },

  async githubCallback(req, res) {
    const frontendBase = oauthService.getFrontendUrl();
    const { code, state, error } = req.query;
    const savedState = req.cookies ? req.cookies[OAUTH_COOKIE_NAME] : undefined;

    // Always clear the state cookie
    res.clearCookie(OAUTH_COOKIE_NAME, cookieBaseOptions);

    if (error) {
      console.error("GitHub returned OAuth error query:", error);
      const codeType = error === "access_denied" ? "oauth_cancelled" : "oauth_failed";
      return res.redirect(302, `${frontendBase}/login?error=${codeType}`);
    }

    if (!state || !savedState || !oauthService.safeCompareState(state, savedState)) {
      console.error("State mismatch or missing in GitHub callback:", { stateReceived: !!state, stateSaved: !!savedState });
      return res.redirect(302, `${frontendBase}/login?error=oauth_failed`);
    }

    if (!code) {
      console.error("Authorization code missing in GitHub callback");
      return res.redirect(302, `${frontendBase}/login?error=oauth_failed`);
    }

    try {
      const user = await oauthService.handleGithubCallback(code);
      const loginCode = await oauthService.createLoginCodeForUser(user.id);

      return res.redirect(302, `${frontendBase}/auth/callback?code=${loginCode}`);
    } catch (err) {
      console.error("GitHub callback processing error:", err);
      let errorParam = "oauth_failed";
      if (err.message === "email_not_verified") {
        errorParam = "email_not_verified";
      } else if (err.message === "account_inactive") {
        errorParam = "account_inactive";
      } else if (err.message === "oauth_cancelled") {
        errorParam = "oauth_cancelled";
      }

      return res.redirect(302, `${frontendBase}/login?error=${errorParam}`);
    }
  },

  async oauthExchange(req, res, next) {
    try {
      const { code } = req.body;
      const result = await oauthService.exchangeLoginCode(code, {
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
      });

      if (result.tokens) {
        setAuthCookies(res, result.tokens);
      }

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      if (error.statusCode === 401 || error.message === "Invalid or expired code") {
        return next(new UnauthorizedError("Invalid or expired code"));
      }
      next(error);
    }
  },
};

module.exports = oauthController;

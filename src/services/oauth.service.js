const crypto = require("crypto");
const userRepository = require("../repositories/user.repository");
const sessionRepository = require("../repositories/session.repository");
const oauthAccountRepository = require("../repositories/oauth-account.repository");
const oauthLoginCodeRepository = require("../repositories/oauth-login-code.repository");
const authService = require("./auth.service");

function getBackendUrl() {
  return (process.env.BACKEND_URL || process.env.APP_URL || "http://localhost:8000").replace(/\/$/, "");
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
}

function safeCompareState(a, b) {
  if (!a || !b || typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

const oauthService = {
  getGoogleAuthUrl(state) {
    const redirectUri = `${getBackendUrl()}/api/v1/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  getGithubAuthUrl(state) {
    const redirectUri = `${getBackendUrl()}/api/v1/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID || "",
      redirect_uri: redirectUri,
      scope: "read:user user:email",
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  },

  async handleGoogleCallback(code) {
    const redirectUri = `${getBackendUrl()}/api/v1/auth/google/callback`;
    const tokenBody = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenBody.toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Google token error:", tokenRes.status, errText);
      throw new Error("oauth_failed");
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error("Google access_token missing in response:", tokenData);
      throw new Error("oauth_failed");
    }

    const userinfoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!userinfoRes.ok) {
      const errText = await userinfoRes.text();
      console.error("Google userinfo error:", userinfoRes.status, errText);
      throw new Error("oauth_failed");
    }

    const userinfo = await userinfoRes.json();

    if (!userinfo.email || userinfo.email_verified !== true) {
      console.error("Google email missing or not verified:", userinfo.email, userinfo.email_verified);
      throw new Error("email_not_verified");
    }

    const providerAccountId = String(userinfo.sub);
    const email = userinfo.email;
    const firstName = userinfo.given_name || email.split("@")[0] || "User";
    const lastName = userinfo.family_name || null;

    return this.findOrCreateOAuthUser({
      provider: "google",
      providerAccountId,
      email,
      firstName,
      lastName,
    });
  },

  async handleGithubCallback(code) {
    const redirectUri = `${getBackendUrl()}/api/v1/auth/github/callback`;
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID || "",
        client_secret: process.env.GITHUB_CLIENT_SECRET || "",
        code,
        redirect_uri: redirectUri,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("GitHub token exchange error:", tokenRes.status, errText);
      throw new Error("oauth_failed");
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error("GitHub access_token missing in response:", tokenData);
      throw new Error("oauth_failed");
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "SigSignature",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      console.error("GitHub user profile error:", userRes.status, errText);
      throw new Error("oauth_failed");
    }

    const profile = await userRes.json();
    const providerAccountId = String(profile.id);

    const emailsRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "SigSignature",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!emailsRes.ok) {
      const errText = await emailsRes.text();
      console.error("GitHub user emails error:", emailsRes.status, errText);
      throw new Error("oauth_failed");
    }

    const emails = await emailsRes.json();
    if (!Array.isArray(emails) || emails.length === 0) {
      console.error("GitHub emails empty or not an array");
      throw new Error("email_not_verified");
    }

    const primaryVerified = emails.find((e) => e.primary && e.verified);
    const anyVerified = emails.find((e) => e.verified);
    const chosen = primaryVerified || anyVerified;

    if (!chosen || !chosen.email) {
      console.error("No verified email on GitHub account");
      throw new Error("email_not_verified");
    }

    const email = chosen.email;

    let firstName = "";
    let lastName = null;
    if (profile.name && profile.name.trim()) {
      const parts = profile.name.trim().split(/\s+/);
      firstName = parts[0];
      lastName = parts.slice(1).join(" ") || null;
    } else {
      firstName = profile.login || email.split("@")[0] || "User";
      lastName = null;
    }

    return this.findOrCreateOAuthUser({
      provider: "github",
      providerAccountId,
      email,
      firstName,
      lastName,
    });
  },

  async findOrCreateOAuthUser({ provider, providerAccountId, email, firstName, lastName }) {
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if OAuthAccount exists for provider + providerAccountId
    const existingOAuth = await oauthAccountRepository.findByProviderAndAccountId(
      provider,
      providerAccountId
    );

    let user = null;

    if (existingOAuth) {
      user = await userRepository.findFirst({ id: existingOAuth.userId });
      if (!user) {
        console.error("OAuth account exists but linked user not found:", existingOAuth.userId);
        throw new Error("oauth_failed");
      }
      if (!user.isVerified) {
        await userRepository.markAsVerified(user.email);
        user.isVerified = true;
      }
    } else {
      // 2. Check if a user with the same lowercase email exists
      const existingUser = await userRepository.findFirst({ email: normalizedEmail });

      if (existingUser) {
        user = existingUser;
        // Security rule: if user is not verified yet, set password to NULL and revoke sessions
        if (!user.isVerified) {
          await userRepository.clearPasswordAndVerify(user.id);
          await sessionRepository.revokeAllByUserId(user.id);
          user.password = null;
          user.isVerified = true;
        }

        await oauthAccountRepository.create({
          userId: user.id,
          provider,
          providerAccountId,
          email: normalizedEmail,
        });
      } else {
        // 3. Create a new user with password NULL, isVerified true and names
        user = await userRepository.create({
          email: normalizedEmail,
          password: null,
          firstName: firstName.trim(),
          lastName: lastName ? lastName.trim() : null,
          isVerified: true,
          isActive: true,
        });

        await oauthAccountRepository.create({
          userId: user.id,
          provider,
          providerAccountId,
          email: normalizedEmail,
        });
      }
    }

    if (!user.isActive) {
      throw new Error("account_inactive");
    }

    return user;
  },

  async createLoginCodeForUser(userId) {
    const rawCode = crypto.randomBytes(32).toString("hex");
    const codeHash = crypto.createHash("sha256").update(rawCode).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds

    await oauthLoginCodeRepository.create({
      userId,
      codeHash,
      expiresAt,
    });

    return rawCode;
  },

  async exchangeLoginCode(code, context = {}) {
    if (!code || typeof code !== "string") {
      const error = new Error("Invalid or expired code");
      error.statusCode = 401;
      throw error;
    }

    const codeHash = crypto.createHash("sha256").update(code.trim()).digest("hex");
    const userId = await oauthLoginCodeRepository.consume(codeHash);

    if (!userId) {
      const error = new Error("Invalid or expired code");
      error.statusCode = 401;
      throw error;
    }

    const user = await userRepository.findFirst({ id: userId });
    if (!user || !user.isActive) {
      const error = new Error("Invalid or expired code");
      error.statusCode = 401;
      throw error;
    }

    return authService.issueUserSession(user, context);
  },

  safeCompareState,
  getFrontendUrl,
};

module.exports = oauthService;

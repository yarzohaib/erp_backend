const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const uploadRoutes = require("./routes/upload.routes");
const signatureRoutes = require("./routes/signature.routes");
const teamRoutes = require("./routes/team.routes");
const publicTeamRoutes = require("./routes/publicTeam.routes");
const accountRoutes = require("./routes/account.routes");
const errorHandler = require("./middleware/errorHandler.middleware");

const app = express();

const trustProxyHops = parseInt(process.env.TRUST_PROXY_HOPS || "1", 10);
app.set("trust proxy", trustProxyHops);

// In non-production: Log trust proxy setting and log client IP diagnostics once on the first incoming request
if (process.env.NODE_ENV !== "production") {
  console.log(`[Proxy Config] trust proxy hops: ${trustProxyHops}`);
  let ipDiagnosticsLogged = false;
  app.use((req, res, next) => {
    if (!ipDiagnosticsLogged) {
      ipDiagnosticsLogged = true;
      const xForwardedFor = req.headers["x-forwarded-for"] || "none";
      console.log(
        `[Client IP Diagnostics] req.ip: "${req.ip}", X-Forwarded-For: "${xForwardedFor}", trust proxy: ${app.get("trust proxy")}`
      );
    }
    next();
  });
}

app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(cookieParser());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/signatures", signatureRoutes);
app.use("/api/v1/team", teamRoutes);
app.use("/api/v1/public/team", publicTeamRoutes);
app.use("/api/v1/account", accountRoutes);

const healthHandler = (req, res) => {
  res.status(200).json({
    success: true,
    message: "SigSignature API is running",
    status: "UP",
  });
};

app.get("/health", healthHandler);
app.get("/", healthHandler);

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;

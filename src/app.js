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

app.set("trust proxy", 1);

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

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ERP Backend is running",
  });
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;

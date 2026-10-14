const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const uploadRoutes = require("./routes/upload.routes");
const signatureRoutes = require("./routes/signature.routes");
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

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ERP Backend is running",
  });
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;

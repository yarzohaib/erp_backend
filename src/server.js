require("dotenv").config();
const env = require("./config/env");

const { Temporal } = require("@js-temporal/polyfill");

globalThis.Temporal = Temporal;

const app = require("./app");
const db = require("./config/prisma");

const PORT = env.PORT || 8000;

async function startServer() {
  try {
    await db.connect();

    console.log("Database connected");

    const server = app.listen(PORT, () => {
      console.log(`SigSignature API running on port ${PORT}`);
    });

    const shutdown = async (signal) => {
      console.log(`\n ${signal} received. Shutting down...`);

      server.close(async () => {
        try {
          await db.close();
          console.log(" Database connection closed");
          process.exit(0);
        } catch (error) {
          console.error("Error closing database connection:", error);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("❌ Failed to start server");
    console.error(error);

    try {
      await db.close();
    } catch (_) {
      // Ignore cleanup errors during startup failure.
    }

    process.exit(1);
  }
}

startServer();
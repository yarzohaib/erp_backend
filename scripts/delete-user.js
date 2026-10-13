const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const db = require("../src/config/prisma");

async function main() {
  const target = process.argv[2]?.trim().toLowerCase();
  if (!target) {
    console.error(
      "❌ Please provide an email address to delete.\nUsage: npm run db:delete-user <email>"
    );
    process.exit(1);
  }

  console.log(`🔍 Checking database for user: ${target}...`);

  try {
    const query = db.raw.sql`
      DELETE FROM "User"
      WHERE LOWER("email") = ${target}
    `
      .affectedCount()
      .build();

    const result = await db.runtime().execute(query);
    const affected = result?.affectedRows ?? result?.rowCount ?? result ?? 0;

    if (affected > 0) {
      console.log(
        `✅ User "${target}" was successfully deleted along with all linked sessions, verification tokens, and reset tokens.`
      );
    } else {
      console.log(`ℹ️ No user found with email "${target}".`);
    }
    process.exit(0);
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    process.exit(1);
  }
}

main();

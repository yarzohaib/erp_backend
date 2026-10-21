const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const db = require("../src/config/prisma");
const { sanitizeSignatureData, stripAngleBrackets } = require("../src/utils/plainText");

function hasMarkup(val) {
  return typeof val === "string" && (val.includes("<") || val.includes(">"));
}

function findMarkupInSignature(sig) {
  const issues = [];

  if (hasMarkup(sig.name)) {
    issues.push({
      field: "name",
      original: sig.name,
      cleaned: stripAngleBrackets(sig.name),
    });
  }

  const data = sig.data;
  if (data && typeof data === "object") {
    const textFields = [
      "fullName",
      "jobTitle",
      "companyName",
      "email",
      "phone",
      "website",
      "address",
      "tagline",
      "disclaimer",
    ];

    for (const f of textFields) {
      if (hasMarkup(data[f])) {
        issues.push({
          field: `data.${f}`,
          original: data[f],
          cleaned: stripAngleBrackets(data[f]),
        });
      }
    }

    if (data.optional && typeof data.optional === "object") {
      for (const f of ["address", "tagline", "disclaimer"]) {
        if (hasMarkup(data.optional[f])) {
          issues.push({
            field: `data.optional.${f}`,
            original: data.optional[f],
            cleaned: stripAngleBrackets(data.optional[f]),
          });
        }
      }
    }

    if (Array.isArray(data.extras)) {
      data.extras.forEach((item, idx) => {
        if (item && typeof item === "object") {
          if (item.type === "text" && hasMarkup(item.text)) {
            issues.push({
              field: `data.extras[${idx}].text`,
              original: item.text,
              cleaned: stripAngleBrackets(item.text),
            });
          }
          if (item.type === "cta" && hasMarkup(item.label)) {
            issues.push({
              field: `data.extras[${idx}].label`,
              original: item.label,
              cleaned: stripAngleBrackets(item.label),
            });
          }
        }
      });
    }

    if (Array.isArray(data.elements)) {
      data.elements.forEach((el, idx) => {
        if (el && typeof el === "object") {
          if (el.type === "text" && hasMarkup(el.text)) {
            issues.push({
              field: `data.elements[${idx}].text`,
              original: el.text,
              cleaned: stripAngleBrackets(el.text),
            });
          }
          if (el.type === "cta" && hasMarkup(el.label)) {
            issues.push({
              field: `data.elements[${idx}].label`,
              original: el.label,
              cleaned: stripAngleBrackets(el.label),
            });
          }
        }
      });
    }
  }

  return issues;
}

async function main() {
  const isApply = process.argv.includes("--apply");

  console.log(`\n======================================================`);
  console.log(`🧹 SigSignature Data Cleaner: Scan Stored Signatures`);
  console.log(`Mode: ${isApply ? "🔥 APPLY (will update records)" : "🛡️ DRY RUN (reporting only, no database writes)"}`);
  console.log(`======================================================\n`);

  try {
    await db.connect();
    const Signature = db.orm.public.Signature;
    const allSignatures = await Signature.all();

    console.log(`Fetched ${allSignatures.length} signature(s) from database for inspection...\n`);

    let affectedCount = 0;
    const flagged = [];

    for (const sig of allSignatures) {
      const issues = findMarkupInSignature(sig);
      if (issues.length > 0) {
        affectedCount++;
        flagged.push({
          sig,
          issues,
        });
      }
    }

    if (affectedCount === 0) {
      console.log(`✅ Clean scan: No signatures containing HTML tags or markup characters ("<", ">") were found.`);
      await db.close();
      process.exit(0);
    }

    console.log(`⚠️ Found ${affectedCount} signature(s) containing markup:\n`);

    for (const item of flagged) {
      const { sig, issues } = item;
      console.log(`- Signature ID: ${sig.id} (User: ${sig.userId}, Name: "${sig.name}")`);
      for (const issue of issues) {
        console.log(`    • ${issue.field}:`);
        console.log(`        Original: ${JSON.stringify(issue.original)}`);
        console.log(`        Cleaned:  ${JSON.stringify(issue.cleaned)}`);
      }

      if (isApply) {
        const cleanedName = stripAngleBrackets(sig.name);
        const cleanedData = sanitizeSignatureData(sig.data);

        await Signature.where({ id: sig.id }).update({
          name: cleanedName,
          data: cleanedData,
        });
        console.log(`    ✅ Updated in database.`);
      }
      console.log("");
    }

    if (!isApply) {
      console.log(`------------------------------------------------------`);
      console.log(`🛡️ DRY RUN FINISHED: ${affectedCount} record(s) flagged.`);
      console.log(`To apply these changes and neutralize stored markup, run:`);
      console.log(`    node scripts/clean-signatures.js --apply`);
      console.log(`------------------------------------------------------\n`);
    } else {
      console.log(`------------------------------------------------------`);
      console.log(`🎉 APPLY COMPLETE: Successfully sanitized ${affectedCount} signature(s) in the database.`);
      console.log(`------------------------------------------------------\n`);
    }

    await db.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error running signature clean script:", error);
    try {
      await db.close();
    } catch (_) {}
    process.exit(1);
  }
}

main();

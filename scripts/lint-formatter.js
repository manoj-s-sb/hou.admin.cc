#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

// Run eslint and capture output
try {
  const output = execSync("eslint src --ext .js,.jsx,.ts,.tsx --format=json", {
    encoding: "utf8",
    stdio: "pipe",
  });

  const results = JSON.parse(output);

  // Group by folder
  const groupedByFolder = {};

  results.forEach((file) => {
    if (file.messages.length === 0) return;

    const filePath = file.filePath;
    const relativePath = path.relative(process.cwd(), filePath);
    const folder = path.dirname(relativePath);

    if (!groupedByFolder[folder]) {
      groupedByFolder[folder] = [];
    }

    groupedByFolder[folder].push({
      file: relativePath,
      messages: file.messages,
    });
  });

  // Sort folders
  const sortedFolders = Object.keys(groupedByFolder).sort();

  let totalErrors = 0;
  let totalWarnings = 0;

  // Print grouped output
  sortedFolders.forEach((folder) => {
    console.log(`\n📁 ${folder}/`);
    console.log("─".repeat(60));

    groupedByFolder[folder].forEach(({ file, messages }) => {
      console.log(`\n  📄 ${file}`);

      messages.forEach((msg) => {
        const icon = msg.severity === 2 ? "❌" : "⚠️";
        const severity = msg.severity === 2 ? "error" : "warning";
        console.log(
          `    ${icon} Line ${msg.line}:${msg.column} - ${msg.message} (${msg.ruleId || "unknown"})`,
        );

        if (msg.severity === 2) totalErrors++;
        else totalWarnings++;
      });
    });
  });

  console.log("\n" + "=".repeat(60));
  console.log(`Total: ${totalErrors} errors, ${totalWarnings} warnings`);
  console.log("=".repeat(60) + "\n");

  process.exit(totalErrors > 0 ? 1 : 0);
} catch (error) {
  if (error.status === 1) {
    // ESLint found issues, but we already handled them above
    process.exit(1);
  } else {
    console.error("Error running ESLint:", error.message);
    process.exit(1);
  }
}

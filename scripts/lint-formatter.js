#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const ESLINT_COMMAND = 'eslint src --ext .js,.jsx,.ts,.tsx --format=json';

const printResults = rawJson => {
  const results = JSON.parse(rawJson);

  // Group by folder
  const groupedByFolder = {};

  results.forEach(file => {
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
  sortedFolders.forEach(folder => {
    console.log(`\n📁 ${folder}/`);
    console.log('─'.repeat(60));

    groupedByFolder[folder].forEach(({ file, messages }) => {
      console.log(`\n  📄 ${file}`);

      messages.forEach(msg => {
        const icon = msg.severity === 2 ? '❌' : '⚠️';
        console.log(`    ${icon} Line ${msg.line}:${msg.column} - ${msg.message} (${msg.ruleId || 'unknown'})`);

        if (msg.severity === 2) totalErrors++;
        else totalWarnings++;
      });
    });
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${totalErrors} errors, ${totalWarnings} warnings`);
  console.log('='.repeat(60) + '\n');

  return totalErrors > 0 ? 1 : 0;
};

// Run eslint and capture output
try {
  const output = execSync(ESLINT_COMMAND, {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  const exitCode = printResults(output);
  process.exit(exitCode);
} catch (error) {
  if (error.stdout) {
    try {
      const exitCode = printResults(error.stdout);
      process.exit(exitCode || error.status || 1);
    } catch (parseError) {
      console.error('Could not parse ESLint JSON output.');
      console.error(parseError.message);
      process.exit(1);
    }
  }

  console.error('Error running ESLint:', error.message);
  if (error.stderr) {
    console.error(error.stderr.toString());
  }
  process.exit(1);
}

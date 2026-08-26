#!/usr/bin/env node

/**
 * Thin wrapper around the eslint CLI that forces legacy (.eslintrc /
 * package.json "eslintConfig") resolution via ESLINT_USE_FLAT_CONFIG=false.
 *
 * Needed because this repo lives nested inside an unrelated project's
 * node_modules tree, whose own flat eslint.config.js otherwise gets
 * auto-discovered by ESLint's upward directory search instead of this
 * project's own config — crashing on every run regardless of what changed.
 *
 * A plain inline env-var prefix (`ESLINT_USE_FLAT_CONFIG=false eslint ...`)
 * works in npm scripts and execSync (both go through a shell), but NOT in
 * lint-staged, which spawns each command directly without a shell — hence
 * this wrapper, which sets the env var on the actual child process itself.
 */

const { spawnSync } = require('child_process');
const path = require('path');

// Resolve the local eslint binary directly rather than relying on PATH —
// this script is invoked directly by lint-staged (no npm/shell PATH
// augmentation), so a bare 'eslint' would fail to spawn (ENOENT).
const eslintBin = path.join(__dirname, '..', 'node_modules', '.bin', 'eslint');

const args = process.argv.slice(2);
const result = spawnSync(eslintBin, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'false' },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);

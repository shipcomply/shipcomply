#!/usr/bin/env node
// One-command setup: installs deps, copies .env, boots local Postgres, pulls Ollama model

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

function exists(p) {
  return fs.existsSync(path.join(root, p));
}

console.log("=== ShipComply Setup ===\n");

// 1. Copy .env.example -> .env if not already present
if (!exists(".env")) {
  fs.copyFileSync(path.join(root, ".env.example"), path.join(root, ".env"));
  console.log("✓ Created .env from .env.example — fill in your API keys");
} else {
  console.log("✓ .env already exists");
}

// 2. Install Node dependencies
run("pnpm install");

// 3. Boot local Postgres (pgvector) via Docker
console.log("\n> Starting local Postgres with pgvector...");
try {
  run("docker compose up -d postgres");
  console.log("✓ Postgres running on port 5432");
} catch {
  console.warn("⚠ Docker not available — set DATABASE_URL in .env to a remote Postgres.");
}

// 4. Create Python venv via uv
if (!exists("services/api/.venv")) {
  console.log("\n> Creating Python 3.12 venv...");
  try {
    run("uv venv services/api/.venv --python 3.12");
    run("uv pip install -e .[dev]", { cwd: path.join(root, "services/api") });
    console.log("✓ Python venv created");
  } catch {
    console.warn("⚠ uv not found — install from https://github.com/astral-sh/uv");
  }
}

// 5. Pull Ollama model (for offline mode)
console.log("\n> Pulling Ollama model (qwen2.5-coder:7b) for offline mode...");
try {
  const result = spawnSync("ollama", ["pull", "qwen2.5-coder:7b"], { stdio: "inherit", cwd: root });
  if (result.status === 0) {
    console.log("✓ Ollama model ready");
  } else {
    console.warn("⚠ Ollama not running — install from https://ollama.ai");
  }
} catch {
  console.warn("⚠ Ollama not found — offline mode will not work until installed");
}

console.log("\n=== Setup complete ===");
console.log("Next: fill in .env with your free-tier API keys, then run: pnpm dev");

#!/usr/bin/env node
// Fails build if absolute design bans are violated in apps/web source files.
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const EXTENSIONS = new Set([".tsx", ".ts", ".css"]);
const IGNORE_DIRS = new Set(["node_modules", ".next", "scripts", ".git", "dist", "out"]);

function collectFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectFiles(full, files);
    } else if (EXTENSIONS.has(path.extname(entry))) {
      files.push(full);
    }
  }
  return files;
}

const files = collectFiles(ROOT);

const RULES = [
  {
    id: "side-stripe-border",
    description: "border-l-* or border-r-* color accent > 1px on cards/items",
    pattern: /\bborder-[lr]-[2-9]\b|\bborder-[lr]-[1-9][0-9]+\b/,
  },
  {
    id: "gradient-text",
    description: "bg-clip-text with gradient (gradient text effect banned)",
    pattern: /bg-clip-text[\s\S]{0,200}bg-gradient-to-/,
    multiline: true,
  },
  {
    id: "em-dash-char",
    description: "Em dash character (—) in JSX/TSX: use comma, colon, or parentheses",
    pattern: /—/,
    ext: [".tsx"],
    // Required legal disclaimers are exempt from this rule.
    skipLinesWith: ["REVIEW BY QUALIFIED ATTORNEY", "AI-GENERATED"],
  },
  {
    id: "double-hyphen-copy",
    description: "Double-hyphen (--) between letters in copy",
    pattern: /[a-zA-Z]--[a-zA-Z]/,
    ext: [".tsx"],
  },
];

let failures = 0;

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const ext = path.extname(file);
  const content = readFileSync(file, "utf8");

  for (const rule of RULES) {
    if (rule.ext && !rule.ext.includes(ext)) continue;

    if (rule.multiline) {
      const re = new RegExp(rule.pattern.source, "s");
      if (re.test(content)) {
        console.error(`\n[DESIGN BAN] ${rule.id}`);
        console.error(`  File: ${rel}`);
        console.error(`  Rule: ${rule.description}`);
        failures++;
      }
    } else {
      const re = new RegExp(rule.pattern.source);
      const lines = content.split("\n");
      const offending = lines.filter((line) => {
        if (rule.skipLinesWith?.some((skip) => line.includes(skip))) return false;
        return re.test(line);
      });
      if (offending.length > 0) {
        console.error(`\n[DESIGN BAN] ${rule.id}`);
        console.error(`  File: ${rel}`);
        console.error(`  Rule: ${rule.description}`);
        failures++;
      }
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} design ban violation(s). Fix before committing.`);
  process.exit(1);
} else {
  console.log("Design bans: all clear.");
}

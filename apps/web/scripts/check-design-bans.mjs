#!/usr/bin/env node
// Fails build if absolute design bans are violated in apps/web source files.
import { readFileSync } from "fs";
import { globSync } from "glob";
import path from "path";

const ROOT = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const SRC_GLOB = "**/*.{tsx,ts,css}";
const IGNORE = ["**/node_modules/**", "**/.next/**", "**/scripts/**"];

const files = globSync(SRC_GLOB, { cwd: ROOT, ignore: IGNORE, absolute: true });

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
    description: "Em dash character (—) in JSX/TSX — use comma, colon, or parentheses",
    pattern: /—/,
    ext: [".tsx"],
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

    const flags = rule.multiline ? "s" : "";
    const re = new RegExp(rule.pattern.source, flags);
    if (re.test(content)) {
      console.error(`\n[DESIGN BAN] ${rule.id}`);
      console.error(`  File: ${rel}`);
      console.error(`  Rule: ${rule.description}`);
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} design ban violation(s). Fix before committing.`);
  process.exit(1);
} else {
  console.log("Design bans: all clear.");
}

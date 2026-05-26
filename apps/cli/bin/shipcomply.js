#!/usr/bin/env node
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Resolve to dist/index.js after build, or src/index.ts in dev
const isBuilt = process.env.NODE_ENV !== "development";
if (isBuilt) {
  const { run } = await import("../dist/index.js");
  run();
} else {
  const { run } = await import("../src/index.ts");
  run();
}

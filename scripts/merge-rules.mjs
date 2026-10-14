#!/usr/bin/env node
// Builds firestore.rules from the part files in firebase/rules/. Each part holds match blocks
// and functions at column 0; this script indents them into the documents block.
// The family part is wrapped in the BEGIN/END markers that personal-manager's
// scripts/firebase/merge-rules.mjs looks for, so that script keeps working on the output.
//
// Usage: node scripts/merge-rules.mjs [--check]
//   --check  exit 1 if firestore.rules differs from the merged parts (writes nothing)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PARTS_DIR = path.join(ROOT, "firebase", "rules");
const OUT = path.join(ROOT, "firestore.rules");
const INDENT = "    ";

// Order of the parts in the output. Each entry is [file, markers or null].
const PARTS = [
  ["core.rules", null],
  ["apps.rules", null],
  ["ladder.rules", null],
  ["planner.rules", null],
  ["visitors.rules", null],
  ["family.rules", ["// BEGIN family (managed by personal-manager)", "// END family"]],
];

function indent(text) {
  return text
    .trimEnd()
    .split("\n")
    .map((line) => (line.length ? INDENT + line : line))
    .join("\n");
}

function build() {
  const blocks = PARTS.map(([file, markers]) => {
    const body = indent(fs.readFileSync(path.join(PARTS_DIR, file), "utf-8"));
    return markers ? [INDENT + markers[0], body, INDENT + markers[1]].join("\n") : body;
  });
  return [
    "// GENERATED FILE: do not edit. Edit firebase/rules/*.rules and run `npm run rules`.",
    "// Built by scripts/merge-rules.mjs.",
    "rules_version = '2';",
    "service cloud.firestore {",
    "  match /databases/{database}/documents {",
    "",
    blocks.join("\n\n"),
    "  }",
    "}",
    "",
  ].join("\n");
}

const merged = build();
if (process.argv.includes("--check")) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf-8") : "";
  if (current !== merged) {
    console.error("firestore.rules is out of date; run `npm run rules`.");
    process.exit(1);
  }
  console.log("firestore.rules is up to date.");
} else {
  fs.writeFileSync(OUT, merged, "utf-8");
  console.log(`wrote ${path.relative(ROOT, OUT)} from ${PARTS.length} parts`);
}

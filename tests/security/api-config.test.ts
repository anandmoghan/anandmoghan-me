import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function urlsWith(base: string | undefined): Record<string, string> {
  const env = { ...process.env };
  delete env.NEXT_PUBLIC_API_BASE;
  if (base !== undefined) env.NEXT_PUBLIC_API_BASE = base;
  const out = execFileSync(
    process.execPath,
    ["--import", "tsx", "-e", 'import("./common/api/config.ts").then((m) => console.log(JSON.stringify({ ...m.default })))'],
    { cwd: root, env, encoding: "utf8" },
  );
  return JSON.parse(out);
}

test("defaults to api.anandmoghan.me with one prefix per app", () => {
  assert.deepEqual(urlsWith(undefined), {
    API_BASE: "https://api.anandmoghan.me",
    FAMILY_API: "https://api.anandmoghan.me/family",
    LADDER_API: "https://api.anandmoghan.me/ladder",
    PLANNER_API: "https://api.anandmoghan.me/planner",
    HOME_API: "https://api.anandmoghan.me/home",
  });
});

test("NEXT_PUBLIC_API_BASE moves every app, without a doubled slash", () => {
  const urls = urlsWith("http://127.0.0.1:3201/");
  assert.equal(urls.API_BASE, "http://127.0.0.1:3201");
  assert.equal(urls.FAMILY_API, "http://127.0.0.1:3201/family");
  assert.equal(urls.PLANNER_API, "http://127.0.0.1:3201/planner");
  assert.equal(urls.HOME_API, "http://127.0.0.1:3201/home");
});

test("no tracked source names the API host or the retired family host", () => {
  const files = execFileSync("git", ["ls-files", "app", "common", "scripts", "docs", "functions/src"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter((f) => /\.(ts|tsx|mjs|js|html|json)$/.test(f));
  for (const file of files) {
    const text = readFileSync(path.join(root, file), "utf8");
    assert.ok(!text.includes("familyapi"), `${file} names familyapi`);
    if (file === "common/api/config.ts" || file.startsWith("docs/")) continue;
    // Code comments may name the host; a URL literal must come from common/api/config.ts.
    assert.ok(!/["'`]https:\/\/api\.anandmoghan\.me/.test(text), `${file} hardcodes the API URL`);
  }
});

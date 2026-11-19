import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
type Block = { source: string; headers: { key: string; value: string }[] };
const blocks: Block[] = JSON.parse(readFileSync(path.join(root, "firebase.json"), "utf8")).hosting.headers;
const header = (source: string, key: string) =>
  blocks.find((b) => b.source === source)?.headers.find((h) => h.key === key)?.value;

const csp = header("**", "Content-Security-Policy") ?? "";
const directives = new Map(csp.split(";").map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));

test("scripts come from the site and the two Google loaders only, never inline", () => {
  assert.deepEqual(directives.get("script-src"), ["'self'", "https://apis.google.com", "https://www.googletagmanager.com"]);
  assert.equal(directives.get("default-src")?.join(" "), "'self'");
});

test("framing, plugins, base and form targets are locked down", () => {
  assert.deepEqual(directives.get("frame-ancestors"), ["'none'"]);
  assert.deepEqual(directives.get("object-src"), ["'none'"]);
  assert.deepEqual(directives.get("base-uri"), ["'self'"]);
  assert.deepEqual(directives.get("form-action"), ["'self'"]);
});

test("the API is reachable at its base and nowhere else on anandmoghan.me", () => {
  const connect = directives.get("connect-src") ?? [];
  assert.ok(connect.includes("https://api.anandmoghan.me"));
  assert.ok(connect.includes("wss://api.anandmoghan.me"));
  assert.ok(!connect.some((s) => s.includes("familyapi")));
});

test("the other security headers apply everywhere", () => {
  assert.equal(header("**", "X-Content-Type-Options"), "nosniff");
  assert.equal(header("**", "Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(header("**", "Permissions-Policy"), "camera=(), microphone=()");
});

test("camera and microphone are allowed for the site only under /apps/meetings, after the default", () => {
  const sources = blocks.map((b) => b.source);
  const meetings = "/apps/meetings{,/**}";
  assert.equal(header(meetings, "Permissions-Policy"), "camera=(self), microphone=(self)");
  assert.ok(sources.indexOf(meetings) > sources.indexOf("**"), "the later block wins in Hosting");
});

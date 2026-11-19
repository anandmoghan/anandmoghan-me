import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { INLINE_DIR, externalizeInlineScripts } from "../../scripts/inline-scripts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("adjacent inline scripts become one file in the same place", () => {
  const html = '<html><head><script src="/a.js"></script></head><body><div>x</div>' +
    "<script>self.__next_f=[]</script>\n<script>self.__next_f.push(1)</script><p>y</p><script>z()</script></body></html>";
  const { html: out, files } = externalizeInlineScripts(html);
  assert.equal(files.size, 2);
  const [first, second] = [...files.entries()];
  assert.equal(first[1], "self.__next_f=[]\n;\nself.__next_f.push(1)");
  assert.equal(second[1], "z()");
  assert.ok(first[0].startsWith(`${INLINE_DIR}/`));
  assert.equal(
    out,
    `<html><head><script src="/a.js"></script></head><body><div>x</div><script src="${first[0]}"></script>\n<p>y</p>` +
      `<script src="${second[0]}"></script></body></html>`,
  );
});

test("JSON-LD blocks and external scripts stay as they are", () => {
  const html = '<script type="application/ld+json">{"a":1}</script><script src="/x.js" async=""></script>';
  assert.deepEqual(externalizeInlineScripts(html), { html, files: new Map() });
});

test("an inline script with attributes fails the build", () => {
  assert.throws(() => externalizeInlineScripts('<script id="x">run()</script>'), /move it to a file/);
});

test("the same source gets the same file name on every page", () => {
  const a = externalizeInlineScripts("<script>same()</script>");
  const b = externalizeInlineScripts("<p></p><script>same()</script>");
  assert.deepEqual([...a.files.keys()], [...b.files.keys()]);
});

test("the built pages carry no inline scripts", { skip: !existsSync(path.join(root, "out", "index.html")) && "no build in out/" }, () => {
  const html = readFileSync(path.join(root, "out", "index.html"), "utf8");
  assert.equal(externalizeInlineScripts(html).files.size, 0);
});

import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { sanitizeUntrustedHtml } from "../../common/security/sanitizeHtml";

const { window } = new JSDOM("");
const clean = (html: string) => sanitizeUntrustedHtml(html, window as never);

test("keeps the allowed structure", () => {
  const html = "<h2>Role</h2><p>We <strong>build</strong> <em>speech</em> models.</p><ul><li>One</li></ul>" +
    "<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table><pre><code>x &lt; y</code></pre>";
  assert.equal(clean(html), html);
});

test("drops scripts, event handlers and iframes", () => {
  assert.equal(clean('<p onclick="alert(1)">Hi</p><script>alert(1)</script><iframe src="https://x.test"></iframe>'), "<p>Hi</p>");
  assert.equal(clean('<img src=x onerror="alert(1)">'), "");
  assert.equal(clean("<svg><script>alert(1)</script></svg>"), "");
});

test("keeps http(s) and mailto links and strips other schemes", () => {
  assert.equal(clean('<a href="https://example.com" target="_blank" rel="noopener">Apply</a>'), '<a href="https://example.com" target="_blank" rel="noopener">Apply</a>');
  assert.equal(clean('<a href="mailto:jobs@example.com">Mail</a>'), '<a href="mailto:jobs@example.com">Mail</a>');
  assert.equal(clean('<a href="javascript:alert(1)">x</a>'), "<a>x</a>");
  assert.equal(clean('<a href="data:text/html,hi">x</a>'), "<a>x</a>");
});

test("drops styles, classes, ids and data attributes", () => {
  assert.equal(clean('<p style="color:red" class="x" id="y" data-k="v">Text</p>'), "<p>Text</p>");
  assert.equal(clean("<style>p{}</style><form action=/x><input name=a></form><p>ok</p>"), "<p>ok</p>");
});

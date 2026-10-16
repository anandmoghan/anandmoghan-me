import assert from "node:assert/strict";
import test from "node:test";
import { chooseSources, type Saved } from "../../common/apps/family/lib/offline";

const saved: Saved<string> = { savedAt: 1000, docs: { meta: { person: "saved" } }, full: "saved-full" };
const liveDocs = { meta: { person: "live" } };
const base = { docs: null, full: null, macDown: false, online: true };

test("nothing saved and nothing live shows nothing", () => {
  assert.deepEqual(chooseSources(base, null), { docs: null, full: null, stale: null });
});

test("live sources win and are not stale", () => {
  const r = chooseSources({ ...base, docs: liveDocs, full: "live-full" }, saved);
  assert.equal(r.docs, liveDocs);
  assert.equal(r.full, "live-full");
  assert.equal(r.stale, null);
});

test("while loading online the saved copy shows at once, without the offline note", () => {
  const r = chooseSources(base, saved);
  assert.equal(r.full, "saved-full");
  assert.equal(r.stale, null);
});

test("without a network the saved copy shows and is stale, with the Mac data", () => {
  const r = chooseSources({ ...base, online: false }, saved);
  assert.deepEqual(r, { docs: saved.docs, full: "saved-full", stale: { savedAt: 1000, withMac: true } });
});

test("the Mac down but Firestore live: fresh display docs, saved Mac data, stale", () => {
  const r = chooseSources({ ...base, docs: liveDocs, macDown: true }, saved);
  assert.equal(r.docs, liveDocs);
  assert.equal(r.full, "saved-full");
  assert.deepEqual(r.stale, { savedAt: 1000, withMac: true });
});

test("a copy saved without the Mac's answer is stale without Mac data", () => {
  const r = chooseSources({ ...base, online: false }, { savedAt: 5, docs: saved.docs, full: null });
  assert.deepEqual(r.stale, { savedAt: 5, withMac: false });
});

test("everything live while the Mac is down is not stale when nothing saved is shown", () => {
  const r = chooseSources({ ...base, docs: liveDocs, macDown: true }, { savedAt: 5, docs: saved.docs, full: null });
  assert.equal(r.stale, null);
});

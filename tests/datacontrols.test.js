/* U5 — export / import / reset / reconcile. Run: node tests/datacontrols.test.js */
"use strict";
var assert = require("assert");
var DC = require("../web/datacontrols.js");
var Schema = require("../web/schema.js");

var failures = 0;
function test(name, fn) {
  try { fn(); console.log("ok   - " + name); }
  catch (e) { failures++; console.error("FAIL - " + name + "\n       " + e.message); }
}

function fakeApp() {
  return {
    state: { marker: 7, lastSeenMarker: 5 },
    staging: [{ id: "s1", position: 7, timestamp: 3, text: "raw note" }],
    data: { journal: { entries: [{ id: "e1", position: 1, text: "refined", refined: true }], questions: [] } }
  };
}

test("buildExport carries schemaVersion, marker header, staging, and journal", function () {
  var b = DC.buildExport(fakeApp(), 12345);
  assert.strictEqual(b.schemaVersion, Schema.SCHEMA_VERSION);
  assert.strictEqual(b.kind, "gardens-grimoire-export");
  assert.strictEqual(b.marker, 7, "current marker travels in the bundle header");
  assert.strictEqual(b.exportedAt, 12345);
  assert.strictEqual(b.staging.length, 1);
  assert.strictEqual(b.journal.entries.length, 1);
});

test("buildMarkdown: readable doc with header, sections, chapter names, and spoiler line", function () {
  var app = fakeApp();
  app.data.positions = [
    { ord: 1, name: "Chapter 1" },
    { ord: 7, name: "Chapter 7" }
  ];
  var md = DC.buildMarkdown(app, 0);
  assert.ok(/^# Gardens Grimoire — Journal Export/.test(md), "has a title");
  assert.ok(/\*\*Currently reading:\*\* Chapter 7/.test(md), "marker resolves to a chapter name");
  assert.ok(/Spoiler firewall/.test(md), "carries the spoiler-firewall notice");
  assert.ok(/## Refined entries \(1\)/.test(md), "counts refined entries");
  assert.ok(/### Chapter 1/.test(md) && /refined/.test(md), "refined entry uses its chapter name");
  assert.ok(/## Raw notes — awaiting refinement \(1\)/.test(md), "counts raw notes");
  assert.ok(/raw note/.test(md), "raw note text present");
  assert.ok(/## Held questions \(0\)/.test(md), "questions section present even when empty");
});

test("buildMarkdown: unmapped positions fall back to an ordinal label", function () {
  var md = DC.buildMarkdown(fakeApp(), 0); // no positions provided
  assert.ok(/Position 7/.test(md), "marker falls back to Position N when name unknown");
});

test("importBundle: a well-formed current bundle imports as success with a count", function () {
  var raw = JSON.stringify(DC.buildExport(fakeApp(), 1));
  var r = DC.importBundle(raw);
  assert.strictEqual(r.status, "success");
  assert.ok(/2 items/.test(r.message), "counts staged + journal entries");
});

test("importBundle: malformed input is rejected, not thrown", function () {
  assert.doesNotThrow(function () { DC.importBundle("{not json"); });
  assert.strictEqual(DC.importBundle("{not json").status, "rejected");
  assert.strictEqual(DC.importBundle("[1,2,3]").status, "rejected");
  assert.strictEqual(DC.importBundle('{"foo":1}').status, "rejected", "no journal/staging shape");
});

test("importBundle: an older-version bundle is recoverable (migrated)", function () {
  var old = JSON.stringify({ schemaVersion: 0, kind: "gardens-grimoire-export", staging: [], journal: { entries: [], questions: [] } });
  var r = DC.importBundle(old);
  assert.strictEqual(r.status, "recoverable");
  assert.strictEqual(r.data.schemaVersion, Schema.SCHEMA_VERSION);
});

test("importBundle: a newer-version bundle is tolerated (forward-compat)", function () {
  var future = JSON.stringify({ schemaVersion: 99, staging: [{ id: "x", extraField: 1 }], journal: { entries: [], questions: [] } });
  var r = DC.importBundle(future);
  assert.notStrictEqual(r.status, "rejected");
  assert.strictEqual(r.data.staging[0].extraField, 1, "unknown field preserved");
});

test("mergeById unions by id, incoming wins, no duplicates (idempotent re-import)", function () {
  var a = [{ id: "1", v: "old" }, { id: "2", v: "keep" }];
  var b = [{ id: "1", v: "new" }, { id: "3", v: "add" }];
  var once = DC.mergeById(a, b);
  assert.deepStrictEqual(once.map(function (x) { return x.id; }), ["1", "2", "3"]);
  assert.strictEqual(once.find(function (x) { return x.id === "1"; }).v, "new");
  var twice = DC.mergeById(once, b);
  assert.strictEqual(twice.length, 3, "re-importing the same bundle does not duplicate");
});

test("reconcile clears a staged note once its id appears refined in the journal", function () {
  var staging = [{ id: "s1" }, { id: "s2" }];
  var refined = [{ id: "s1" }];
  var out = DC.reconcile(staging, refined).map(function (x) { return x.id; });
  assert.deepStrictEqual(out, ["s2"], "s1 cleared, s2 remains");
});

test("needsExportWarning is true only when un-exported staging notes exist", function () {
  assert.strictEqual(DC.needsExportWarning([{ id: "s1" }]), true);
  assert.strictEqual(DC.needsExportWarning([]), false);
});

if (failures) { process.exitCode = 1; console.error("\n" + failures + " test(s) FAILED"); }
else { console.log("\nall datacontrols tests passed"); }

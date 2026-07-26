/* U4 — journal capture + raw->refined merge. Run: node tests/journal.test.js */
"use strict";
var assert = require("assert");
var Journal = require("../web/journal.js");

var failures = 0;
function test(name, fn) {
  try { fn(); console.log("ok   - " + name); }
  catch (e) { failures++; console.error("FAIL - " + name + "\n       " + e.message); }
}

test("makeNote stamps id, position, timestamp, text, and refined=false", function () {
  var n = Journal.makeNote("who is the tall guy?", 3, 1000, "n1");
  assert.strictEqual(n.id, "n1");
  assert.strictEqual(n.position, 3);
  assert.strictEqual(n.timestamp, 1000);
  assert.strictEqual(n.text, "who is the tall guy?");
  assert.strictEqual(n.refined, false);
});

test("makeNote trims text and ignores empty", function () {
  assert.strictEqual(Journal.makeNote("  hi  ", 0, 1, "a").text, "hi");
  assert.strictEqual(Journal.makeNote("   ", 0, 1, "a"), null, "whitespace-only note is not created");
});

test("mergeForDisplay shows a staged raw note as raw", function () {
  var list = Journal.mergeForDisplay([], [{ id: "n1", position: 3, timestamp: 5, text: "raw" }]);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].kind, "raw");
  assert.strictEqual(list[0].text, "raw");
});

test("a refined entry replaces its staged raw note (same id) and keeps provenance", function () {
  var refined = [{ id: "n1", position: 3, timestamp: 5, text: "Anomander Rake, Lord of Moon's Spawn", refined: true, source: "Chapter_3", provenance: "who is the tall guy?" }];
  var staged = [{ id: "n1", position: 3, timestamp: 5, text: "who is the tall guy?" }];
  var list = Journal.mergeForDisplay(refined, staged);
  assert.strictEqual(list.length, 1, "raw is not double-shown once refined exists");
  assert.strictEqual(list[0].kind, "refined");
  assert.strictEqual(list[0].provenance, "who is the tall guy?", "original words preserved as provenance");
});

test("mergeForDisplay orders entries newest-first by timestamp", function () {
  var staged = [
    { id: "a", position: 0, timestamp: 10, text: "older" },
    { id: "b", position: 1, timestamp: 30, text: "newest" },
    { id: "c", position: 1, timestamp: 20, text: "middle" }
  ];
  var order = Journal.mergeForDisplay([], staged).map(function (x) { return x.text; });
  assert.deepStrictEqual(order, ["newest", "middle", "older"]);
});

test("mergeForDisplay on empty inputs yields the empty list (first-run state)", function () {
  assert.deepStrictEqual(Journal.mergeForDisplay([], []), []);
  assert.deepStrictEqual(Journal.mergeForDisplay(null, null), []);
});

if (failures) { process.exitCode = 1; console.error("\n" + failures + " test(s) FAILED"); }
else { console.log("\nall journal tests passed"); }

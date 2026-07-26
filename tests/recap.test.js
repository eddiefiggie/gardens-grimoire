/* U7 — landing "Previously On" recap. Run: node tests/recap.test.js */
"use strict";
var assert = require("assert");
var Recap = require("../web/recap.js");

var failures = 0;
function test(name, fn) {
  try { fn(); console.log("ok   - " + name); }
  catch (e) { failures++; console.error("FAIL - " + name + "\n       " + e.message); }
}

var doc = {
  recaps: [
    { safeAsOf: 0, text: "The empire simmers." },
    { safeAsOf: 3, text: "Pale falls; the Bridgeburners turn to Darujhistan." },
    { safeAsOf: 9, text: "SPOILER later beat." }
  ],
  noticed: [
    { safeAsOf: 1, text: "The old woman's prophecy was not idle." },
    { safeAsOf: 12, text: "SPOILER noticed." }
  ]
};

test("recapFor shows recap blocks <= marker, bounded (nothing above)", function () {
  var r = Recap.recapFor(doc, 3);
  var texts = r.blocks.map(function (b) { return b.text; });
  assert.deepStrictEqual(texts, ["The empire simmers.", "Pale falls; the Bridgeburners turn to Darujhistan."]);
  assert.ok(texts.join(" ").indexOf("SPOILER") === -1, "no content above the marker");
});

test("recap blocks are ordered by position ascending", function () {
  var r = Recap.recapFor(doc, 9);
  assert.deepStrictEqual(r.blocks.map(function (b) { return b.safeAsOf; }), [0, 3, 9]);
});

test("noticed callouts <= marker render; above are hidden", function () {
  var r = Recap.recapFor(doc, 3);
  assert.deepStrictEqual(r.noticed.map(function (n) { return n.text; }), ["The old woman's prophecy was not idle."]);
});

test("empty recaps yield empty result (first-run state)", function () {
  var r = Recap.recapFor({ recaps: [], noticed: [] }, 5);
  assert.deepStrictEqual(r.blocks, []);
  assert.deepStrictEqual(r.noticed, []);
  var r2 = Recap.recapFor(null, 5);
  assert.deepStrictEqual(r2.blocks, []);
});

if (failures) { process.exitCode = 1; console.error("\n" + failures + " test(s) FAILED"); }
else { console.log("\nall recap tests passed"); }

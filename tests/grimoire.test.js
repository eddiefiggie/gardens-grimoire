/* U6 — grimoire dossiers, feed, held questions. Run: node tests/grimoire.test.js */
"use strict";
var assert = require("assert");
var Grimoire = require("../web/grimoire.js");

var failures = 0;
function test(name, fn) {
  try { fn(); console.log("ok   - " + name); }
  catch (e) { failures++; console.error("FAIL - " + name + "\n       " + e.message); }
}

var entities = [
  { id: "rake", name: "Anomander Rake", type: "person", layers: [
    { safeAsOf: 3, text: "Lord of Moon's Spawn", source: "Chapter_3" },
    { safeAsOf: 7, text: "wields Dragnipur", source: "Chapter_7" }
  ] },
  { id: "warren", name: "The Warrens", type: "lore", layers: [
    { safeAsOf: 2, text: "sources of magic", source: "Chapter_2" }
  ] },
  { id: "future", name: "Spoiler Entity", type: "person", layers: [
    { safeAsOf: 20, text: "not yet", source: "Chapter_20" }
  ] }
];

test("a dossier shows only <= marker layers, stacked oldest-first", function () {
  var d = Grimoire.dossiers(entities, 3);
  var rake = d.find(function (x) { return x.id === "rake"; });
  assert.strictEqual(rake.layers.length, 1, "Ch.7 layer hidden at marker 3");
  assert.strictEqual(rake.layers[0].text, "Lord of Moon's Spawn");
  var rake7 = Grimoire.dossiers(entities, 7).find(function (x) { return x.id === "rake"; });
  assert.deepStrictEqual(rake7.layers.map(function (l) { return l.safeAsOf; }), [3, 7], "stacked in position order");
});

test("an entity with zero <= marker layers is hidden entirely", function () {
  var d = Grimoire.dossiers(entities, 3).map(function (x) { return x.id; });
  assert.ok(d.indexOf("future") === -1, "future entity hidden at marker 3");
  assert.deepStrictEqual(d.sort(), ["rake", "warren"]);
});

test("newlyKnowable surfaces exactly the layers unlocked in (lastSeen, marker]", function () {
  var nk = Grimoire.newlyKnowable(entities, [], 3, 7);
  var texts = nk.layers.map(function (l) { return l.text; });
  assert.deepStrictEqual(texts, ["wields Dragnipur"], "only the Ch.7 layer is newly knowable moving 3->7");
});

test("newlyKnowable is empty when the marker has not advanced", function () {
  assert.deepStrictEqual(Grimoire.newlyKnowable(entities, [], 7, 7).layers, []);
  assert.deepStrictEqual(Grimoire.newlyKnowable(entities, [], 7, 5).layers, [], "retreating surfaces nothing");
});

var questions = [
  { id: "q1", position: 3, text: "What is a Warren?", unlocksAt: 3, answer: "sources of magic", source: "Chapter_3" },
  { id: "q2", position: 3, text: "Who is the woman in Rake's shadow?", unlocksAt: 9, answer: "…", source: "Chapter_9" },
  { id: "q3", position: 3, text: "Open musing", unlocksAt: null }
];

test("HIDDEN-NUMBER INVARIANT: a pending question never exposes its unlocksAt", function () {
  var pending = Grimoire.pendingQuestions(questions, 3); // q2 (unlocks 9) and q3 (null) are pending
  var ids = pending.map(function (q) { return q.id; }).sort();
  assert.deepStrictEqual(ids, ["q2", "q3"]);
  var serialized = JSON.stringify(pending);
  assert.ok(serialized.indexOf("unlocksAt") === -1, "no unlocksAt key in pending output");
  assert.ok(serialized.indexOf("9") === -1, "the unlock chapter number 9 never appears in pending output");
});

test("a question becomes answered once the marker reaches its unlock position", function () {
  var atNine = Grimoire.answerableQuestions(questions, 9).map(function (q) { return q.id; }).sort();
  assert.deepStrictEqual(atNine, ["q1", "q2"], "q2 answerable at marker 9");
  var pendingAtNine = Grimoire.pendingQuestions(questions, 9).map(function (q) { return q.id; });
  assert.deepStrictEqual(pendingAtNine, ["q3"], "only the open musing remains pending");
});

test("a held question surfaces in newlyKnowable when its unlock is crossed", function () {
  var nk = Grimoire.newlyKnowable(entities, questions, 3, 9);
  var qTexts = nk.questions.map(function (q) { return q.text; });
  assert.ok(qTexts.indexOf("Who is the woman in Rake's shadow?") !== -1);
});

if (failures) { process.exitCode = 1; console.error("\n" + failures + " test(s) FAILED"); }
else { console.log("\nall grimoire tests passed"); }

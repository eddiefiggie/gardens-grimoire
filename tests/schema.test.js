/* U2 — schema + compatibility layer. Plain node, no deps.
   Run: node tests/schema.test.js */
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Schema = require("../web/schema.js");

var failures = 0;
function test(name, fn) {
  try { fn(); console.log("ok   - " + name); }
  catch (e) { failures++; console.error("FAIL - " + name + "\n       " + e.message); }
}
function readData(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "web", "data", name + ".json"), "utf8"));
}

/* ---- position spine seed ---- */
test("positions.json has exactly 26 ordered positions 0..25", function () {
  var p = readData("positions");
  assert.strictEqual(p.schemaVersion, Schema.SCHEMA_VERSION);
  assert.strictEqual(p.positions.length, 26);
  p.positions.forEach(function (pos, i) { assert.strictEqual(pos.ord, i, "ord " + i); });
  assert.strictEqual(p.positions[0].name, "Prologue");
  assert.strictEqual(p.positions[25].name, "Epilogue");
});

test("positions have correct Book groupings and wiki slugs", function () {
  var p = readData("positions").positions;
  var byName = {};
  p.forEach(function (pos) { byName[pos.name] = pos; });
  assert.strictEqual(byName["Chapter 1"].book, "Book One: Pale");
  assert.strictEqual(byName["Chapter 4"].book, "Book One: Pale");
  assert.strictEqual(byName["Chapter 6"].book, "Book Two: Darujhistan");
  assert.strictEqual(byName["Chapter 10"].book, "Book Three: The Mission");
  assert.strictEqual(byName["Chapter 13"].book, "Book Four: Assassins");
  assert.strictEqual(byName["Chapter 16"].book, "Book Five: The Gadrobi Hills");
  assert.strictEqual(byName["Chapter 19"].book, "Book Six: The City of Blue Fire");
  assert.strictEqual(byName["Chapter 24"].book, "Book Seven: The Fête");
  assert.strictEqual(byName["Prologue"].book, null);
  assert.strictEqual(byName["Epilogue"].book, null);
  // wiki subpage slugs
  assert.strictEqual(byName["Chapter 1"].slug, "Chapter_1");
  assert.strictEqual(byName["Prologue"].slug, "Prologue");
  assert.strictEqual(byName["Epilogue"].slug, "Epilogue");
});

/* ---- normalize: defaults for missing optionals, no throw ---- */
test("normalize fills missing optional collections with defaults", function () {
  var e = Schema.normalize({ schemaVersion: 1 }, "entities");
  assert.ok(Array.isArray(e.entities), "entities defaulted to []");
  var j = Schema.normalize({ schemaVersion: 1 }, "journal");
  assert.ok(Array.isArray(j.entries) && Array.isArray(j.questions), "journal collections defaulted");
});

test("normalize does not throw on null / non-object / missing version", function () {
  assert.doesNotThrow(function () { Schema.normalize(null, "journal"); });
  assert.doesNotThrow(function () { Schema.normalize("nope", "journal"); });
  assert.doesNotThrow(function () { Schema.normalize({}, "entities"); });
  var n = Schema.normalize({}, "journal");
  assert.strictEqual(n.schemaVersion, Schema.SCHEMA_VERSION, "missing version defaults to current");
});

/* ---- forward-compat keystone: unknown fields survive round-trip ---- */
test("unknown future fields survive normalize + JSON round-trip", function () {
  var input = {
    schemaVersion: 1,
    entities: [{ id: "e1", name: "Rake", type: "person", layers: [], futureField: { note: "keep me" } }],
    topLevelUnknown: [1, 2, 3]
  };
  var out = JSON.parse(JSON.stringify(Schema.normalize(input, "entities")));
  assert.deepStrictEqual(out.entities[0].futureField, { note: "keep me" }, "nested unknown preserved");
  assert.deepStrictEqual(out.topLevelUnknown, [1, 2, 3], "top-level unknown preserved");
});

/* ---- migrate: identity at current version ---- */
test("migrate is lossless at the current version", function () {
  var input = { schemaVersion: 1, entities: [{ id: "e1", name: "Rake", type: "person", layers: [{ safeAsOf: 3, text: "Lord of Moon's Spawn", source: "Chapter_3" }] }] };
  var out = Schema.migrate(input, "entities");
  assert.strictEqual(out.schemaVersion, 1);
  assert.strictEqual(out.entities[0].layers[0].text, "Lord of Moon's Spawn");
});

/* ---- forward-compat: newer data tolerated by older code ---- */
test("migrate tolerates a newer schemaVersion without corrupting data", function () {
  var input = { schemaVersion: 99, entities: [{ id: "e1", name: "X", type: "place" }] };
  var out;
  assert.doesNotThrow(function () { out = Schema.migrate(input, "entities"); });
  assert.strictEqual(out.entities[0].id, "e1", "data preserved when version is ahead of code");
});

/* ---- upgrade-ladder runner (the mechanism future migrations ride) ---- */
test("_applyLadder runs registered steps in order up to target", function () {
  var ladder = {
    1: function (d) { return Object.assign({}, d, { step1: true }); },
    2: function (d) { return Object.assign({}, d, { step2: true }); }
  };
  var out = Schema._applyLadder({ schemaVersion: 1, keep: "yes" }, 3, ladder);
  assert.strictEqual(out.step1, true, "1->2 ran");
  assert.strictEqual(out.step2, true, "2->3 ran");
  assert.strictEqual(out.schemaVersion, 3, "version advanced to target");
  assert.strictEqual(out.keep, "yes", "original data carried through");
});

test("_applyLadder is a no-op when already at target", function () {
  var out = Schema._applyLadder({ schemaVersion: 3, keep: "yes" }, 3, {});
  assert.strictEqual(out.keep, "yes");
  assert.strictEqual(out.schemaVersion, 3);
});

/* ---- load: parse-safe + migrate + normalize ---- */
test("load parses, migrates, and normalizes a raw string; bad JSON is safe", function () {
  var good = Schema.load('{"schemaVersion":1,"entities":[]}', "entities");
  assert.ok(Array.isArray(good.entities));
  assert.doesNotThrow(function () { Schema.load("{not json", "entities"); });
  var bad = Schema.load("{not json", "entities");
  assert.strictEqual(bad.schemaVersion, Schema.SCHEMA_VERSION, "bad JSON yields a valid empty doc");
});

if (failures) { process.exitCode = 1; console.error("\n" + failures + " test(s) FAILED"); }
else { console.log("\nall schema tests passed"); }

/* U3 — position engine. Run: node tests/position.test.js */
"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var Position = require("../web/position.js");

var positions = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "web", "data", "positions.json"), "utf8"));

var failures = 0;
function test(name, fn) {
  try { fn(); console.log("ok   - " + name); }
  catch (e) { failures++; console.error("FAIL - " + name + "\n       " + e.message); }
}

test("gate shows items with safeAsOf <= marker, hides those above", function () {
  var items = [{ safeAsOf: 2, t: "a" }, { safeAsOf: 3, t: "b" }, { safeAsOf: 7, t: "c" }];
  var got = Position.gate(items, 3).map(function (x) { return x.t; });
  assert.deepStrictEqual(got, ["a", "b"]);
});

test("gate is fail-closed: an item without safeAsOf is hidden", function () {
  var items = [{ t: "no-stamp" }, { safeAsOf: 0, t: "prologue-safe" }];
  var got = Position.gate(items, 25).map(function (x) { return x.t; });
  assert.deepStrictEqual(got, ["prologue-safe"], "unstamped item excluded even at max marker");
});

test("gate returns [] on non-array input", function () {
  assert.deepStrictEqual(Position.gate(null, 5), []);
  assert.deepStrictEqual(Position.gate(undefined, 5), []);
});

test("at returns the position object, or null when absent", function () {
  assert.strictEqual(Position.at(positions, 0).name, "Prologue");
  assert.strictEqual(Position.at(positions, 25).name, "Epilogue");
  assert.strictEqual(Position.at(positions, 99), null);
});

test("book label resolves for a chapter ordinal", function () {
  assert.strictEqual(Position.at(positions, 6).book, "Book Two: Darujhistan");
  assert.strictEqual(Position.at(positions, 20).book, "Book Seven: The Fête");
  assert.strictEqual(Position.at(positions, 0).book, null);
});

test("maxOrd and count reflect the 26-position spine", function () {
  assert.strictEqual(Position.maxOrd(positions), 25);
  assert.strictEqual(Position.count(positions), 26);
});

test("clamp holds the marker within [0, maxOrd] (next/back cannot overrun)", function () {
  assert.strictEqual(Position.clamp(positions, -1), 0, "back from Prologue stays at 0");
  assert.strictEqual(Position.clamp(positions, 26), 25, "next from Epilogue stays at 25");
  assert.strictEqual(Position.clamp(positions, 7), 7);
});

if (failures) { process.exitCode = 1; console.error("\n" + failures + " test(s) FAILED"); }
else { console.log("\nall position tests passed"); }

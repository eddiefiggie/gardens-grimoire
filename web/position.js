/* Gardens Grimoire — position engine (U3).
   Isomorphic: window.Position in the browser, module.exports under node.

   Owns the single firewall gate: an item is visible only when its safeAsOf is a
   number <= the current marker. Fail-closed — an item with no safeAsOf is hidden. */
(function (root) {
  "use strict";

  function positionsArray(doc) {
    return doc && Array.isArray(doc.positions) ? doc.positions : [];
  }

  function at(doc, ord) {
    var arr = positionsArray(doc);
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].ord === ord) return arr[i];
    }
    return null;
  }

  function maxOrd(doc) {
    var arr = positionsArray(doc);
    return arr.length ? arr[arr.length - 1].ord : 0;
  }

  function count(doc) { return positionsArray(doc).length; }

  function clamp(doc, ord) {
    var max = maxOrd(doc);
    if (ord < 0) return 0;
    if (ord > max) return max;
    return ord;
  }

  // The spoiler firewall. Fail-closed: no numeric safeAsOf -> hidden.
  function gate(items, marker) {
    if (!Array.isArray(items)) return [];
    return items.filter(function (it) {
      return it && typeof it.safeAsOf === "number" && it.safeAsOf <= marker;
    });
  }

  var api = {
    positionsArray: positionsArray,
    at: at,
    maxOrd: maxOrd,
    count: count,
    clamp: clamp,
    gate: gate
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Position = api;
})(typeof window !== "undefined" ? window : this);

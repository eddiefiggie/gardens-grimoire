/* Gardens Grimoire — data schema + compatibility layer (U2).
   Isomorphic: window.Schema in the browser, module.exports under node.

   Compatibility contract (see the plan's Data Compatibility Contract):
   - Every data file carries schemaVersion.
   - Evolution is additive-only: normalize fills MISSING keys, never strips unknowns.
   - Forward-compat: data newer than this code is left intact (unknown fields survive).
   - Backward-compat: older data is lifted via a one-directional migration ladder.
*/
(function (root) {
  "use strict";

  var SCHEMA_VERSION = 1;

  // Upgrade ladder. Key N transforms a vN document into v(N+1).
  // Empty at v1 (no prior versions). A future breaking change adds a step here;
  // it must be lossless and one-directional (up only).
  var MIGRATIONS = {};

  // Required collections per file kind. normalize() fills these only when MISSING.
  var DEFAULTS = {
    positions: function () { return { positions: [] }; },
    entities:  function () { return { entities: [] }; },
    journal:   function () { return { entries: [], questions: [] }; },
    recaps:    function () { return { recaps: [], noticed: [] }; }
  };

  function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }

  // Run a ladder from data.schemaVersion up to target. Pure with respect to the
  // caller's version stamping; the step functions own the shape transform.
  function applyLadder(data, target, ladder) {
    var out = isObj(data) ? data : {};
    var v = typeof out.schemaVersion === "number" ? out.schemaVersion : SCHEMA_VERSION;
    while (v < target) {
      var step = ladder[v];
      if (typeof step === "function") out = step(out) || out;
      v += 1;
      out.schemaVersion = v;
    }
    return out;
  }

  // Lift older data to the current version. Newer-than-code data is returned
  // intact (forward-compat: older code must not corrupt a future document).
  function migrate(data, kind) {
    if (!isObj(data)) return normalize(data, kind);
    var v = typeof data.schemaVersion === "number" ? data.schemaVersion : SCHEMA_VERSION;
    if (v >= SCHEMA_VERSION) return data;
    return applyLadder(data, SCHEMA_VERSION, MIGRATIONS);
  }

  // Fill missing required collections and stamp a version. Never removes unknown
  // keys — that is the forward-compat keystone.
  function normalize(data, kind) {
    var d = isObj(data) ? data : {};
    if (typeof d.schemaVersion !== "number") d.schemaVersion = SCHEMA_VERSION;
    var defs = DEFAULTS[kind] ? DEFAULTS[kind]() : {};
    Object.keys(defs).forEach(function (k) {
      if (!Array.isArray(d[k])) d[k] = defs[k];
    });
    return d;
  }

  // Parse-safe load: bad JSON yields a valid empty document rather than throwing.
  function load(raw, kind) {
    var parsed;
    try { parsed = typeof raw === "string" ? JSON.parse(raw) : raw; }
    catch (e) { parsed = null; }
    return normalize(migrate(parsed, kind), kind);
  }

  var api = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    MIGRATIONS: MIGRATIONS,
    migrate: migrate,
    normalize: normalize,
    load: load,
    _applyLadder: applyLadder
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Schema = api;
})(typeof window !== "undefined" ? window : this);

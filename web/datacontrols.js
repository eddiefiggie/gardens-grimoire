/* Gardens Grimoire — data controls: export / import / reset / reconcile (U5).
   Isomorphic: pure logic is node-testable; render() is browser-only.
   Reset and Import use in-page affordances (no native confirm/alert dialogs). */
(function (root) {
  "use strict";

  var Schema = (typeof module !== "undefined" && module.exports)
    ? require("./schema.js") : root.Schema;

  /* -------- pure logic -------- */

  function buildExport(app, now) {
    return {
      schemaVersion: Schema.SCHEMA_VERSION,
      kind: "gardens-grimoire-export",
      exportedAt: now,
      marker: app.state ? app.state.marker : 0,     // boundary header for the workflow
      staging: (app.staging || []).slice(),
      journal: (app.data && app.data.journal) || { entries: [], questions: [] }
    };
  }

  /* -------- markdown export (human-readable; not re-importable) -------- */

  function posLabel(positions, ord) {
    positions = Array.isArray(positions) ? positions : [];
    for (var i = 0; i < positions.length; i++) {
      if (positions[i] && positions[i].ord === ord) return positions[i].name;
    }
    return "Position " + ord;
  }

  // Deterministic given ts (UTC) so the pure function stays test-stable.
  function fmtStamp(ts) {
    try { return new Date(ts).toISOString().replace("T", " ").slice(0, 16) + " UTC"; }
    catch (e) { return String(ts); }
  }

  function byNewest(a, b) { return (b.timestamp || 0) - (a.timestamp || 0); }

  // Build a readable Markdown document from the export bundle. `positions` lets
  // us print chapter names instead of bare ordinals; falls back gracefully.
  // Human/Claude-facing only — the JSON export remains the machine round-trip.
  function buildMarkdown(app, now, positions) {
    var bundle = buildExport(app, now);
    positions = positions || (app && app.data && app.data.positions) || [];
    var markerName = posLabel(positions, bundle.marker);
    var refined = (bundle.journal.entries || []).slice().sort(byNewest);
    var raw = (bundle.staging || []).slice().sort(byNewest);
    var questions = (bundle.journal.questions || []).slice();

    var L = [];
    L.push("# Gardens Grimoire — Journal Export");
    L.push("");
    L.push("- **Exported:** " + fmtStamp(now));
    L.push("- **Currently reading:** " + markerName);
    L.push("- **Schema version:** " + bundle.schemaVersion);
    L.push("");
    L.push("> Spoiler firewall: nothing above _" + markerName + "_ appears in this file.");
    L.push("");

    L.push("## Refined entries (" + refined.length + ")");
    L.push("");
    if (!refined.length) {
      L.push("_None yet._");
      L.push("");
    } else {
      refined.forEach(function (e) {
        L.push("### " + posLabel(positions, e.position));
        L.push("");
        L.push(e.text || "");
        L.push("");
        if (e.source) L.push("- _Source:_ " + e.source);
        if (e.provenance) L.push("- _Your original note:_ " + e.provenance);
        L.push("- _Refined · " + fmtStamp(e.timestamp) + "_");
        L.push("");
      });
    }

    L.push("## Raw notes — awaiting refinement (" + raw.length + ")");
    L.push("");
    if (!raw.length) {
      L.push("_None._");
      L.push("");
    } else {
      raw.forEach(function (n) {
        L.push("### " + posLabel(positions, n.position));
        L.push("");
        L.push(n.text || "");
        L.push("");
        L.push("- _Raw note · " + fmtStamp(n.timestamp) + "_");
        L.push("");
      });
    }

    L.push("## Held questions (" + questions.length + ")");
    L.push("");
    if (!questions.length) {
      L.push("_None._");
      L.push("");
    } else {
      questions.forEach(function (q) {
        L.push("- " + (q.text || "") + "  \n  _held at " + posLabel(positions, q.position) + "_");
      });
      L.push("");
    }

    return L.join("\n");
  }

  function importBundle(raw) {
    var parsed;
    try { parsed = typeof raw === "string" ? JSON.parse(raw) : raw; }
    catch (e) { return { status: "rejected", data: null, message: "That file isn't valid JSON." }; }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { status: "rejected", data: null, message: "That doesn't look like a Gardens Grimoire export." };
    }
    if (!("staging" in parsed) && !("journal" in parsed)) {
      return { status: "rejected", data: null, message: "Unrecognized file — no journal or staging data." };
    }
    var orig = typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : Schema.SCHEMA_VERSION;
    var data = Schema._applyLadder(parsed, Schema.SCHEMA_VERSION, Schema.MIGRATIONS);
    data.staging = Array.isArray(data.staging) ? data.staging : [];
    if (!data.journal || typeof data.journal !== "object") data.journal = { entries: [], questions: [] };
    data.journal.entries = Array.isArray(data.journal.entries) ? data.journal.entries : [];
    data.journal.questions = Array.isArray(data.journal.questions) ? data.journal.questions : [];
    var count = data.staging.length + data.journal.entries.length + data.journal.questions.length;
    if (orig < Schema.SCHEMA_VERSION) {
      return { status: "recoverable", data: data, message: "Imported and upgraded from an older format (" + count + " items)." };
    }
    return { status: "success", data: data, message: "Imported " + count + " items." };
  }

  function mergeById(existing, incoming) {
    existing = Array.isArray(existing) ? existing : [];
    incoming = Array.isArray(incoming) ? incoming : [];
    var map = {}, order = [];
    existing.concat(incoming).forEach(function (it) {
      if (!it || it.id == null) return;
      if (!(it.id in map)) order.push(it.id);
      map[it.id] = it; // later (incoming) wins
    });
    return order.map(function (id) { return map[id]; });
  }

  // Repo/refined is the source of truth: drop a staged note once its id is refined.
  function reconcile(staging, refined) {
    staging = Array.isArray(staging) ? staging : [];
    var refinedIds = {};
    (Array.isArray(refined) ? refined : []).forEach(function (r) { if (r && r.id != null) refinedIds[r.id] = true; });
    return staging.filter(function (s) { return !(s && refinedIds[s.id]); });
  }

  function needsExportWarning(staging) {
    return Array.isArray(staging) && staging.length > 0;
  }

  /* -------- browser-only: apply, download, render -------- */

  function applyImport(app, data) {
    app.staging = mergeById(app.staging, data.staging);
    if (!app.data.journal) app.data.journal = { entries: [], questions: [] };
    app.data.journal.entries = mergeById(app.data.journal.entries, data.journal.entries);
    app.data.journal.questions = mergeById(app.data.journal.questions, data.journal.questions);
    // repo refined content wins: clear any staged note now refined
    app.staging = reconcile(app.staging, app.data.journal.entries);
    app.saveStaging();
    app.renderAll();
  }

  function triggerDownload(filename, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  function downloadExport(app) {
    var bundle = buildExport(app, Date.now());
    var blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    var stamp = new Date().toISOString().slice(0, 10);
    triggerDownload("gardens-grimoire-export-" + stamp + ".json", blob);
  }

  function downloadMarkdown(app) {
    var md = buildMarkdown(app, Date.now(), app.data && app.data.positions);
    var blob = new Blob([md], { type: "text/markdown" });
    var stamp = new Date().toISOString().slice(0, 10);
    triggerDownload("gardens-grimoire-journal-" + stamp + ".md", blob);
  }

  function doReset(app) {
    app.staging = [];
    app.state.marker = 0;
    app.state.lastSeenMarker = 0;
    app.saveState();
    app.saveStaging();
    app.renderAll();
  }

  function setStatus(el, msg, kind) {
    if (!el) return;
    el.textContent = msg || "";
    el.className = "marker-book" + (kind === "error" ? " state error" : "");
  }

  function render(app, panel) {
    if (!panel) return;
    var esc = app.esc;
    var wrap = document.createElement("div");
    wrap.className = "data-controls";
    wrap.innerHTML =
      '<button class="nav-btn secondary" id="dc-export">Export</button>' +
      '<button class="nav-btn secondary" id="dc-export-md">Export MD</button>' +
      '<button class="nav-btn secondary" id="dc-import">Import</button>' +
      '<button class="nav-btn secondary danger" id="dc-reset">Reset</button>' +
      '<input type="file" id="dc-file" accept="application/json,.json" style="display:none">' +
      '<span id="dc-status" class="marker-book"></span>';
    panel.appendChild(wrap);

    var status = wrap.querySelector("#dc-status");
    var fileInput = wrap.querySelector("#dc-file");

    wrap.querySelector("#dc-export").onclick = function () {
      downloadExport(app);
      setStatus(status, "Exported your journal to a JSON file (re-importable).");
    };

    wrap.querySelector("#dc-export-md").onclick = function () {
      downloadMarkdown(app);
      setStatus(status, "Exported a readable Markdown copy of your journal.");
    };

    wrap.querySelector("#dc-import").onclick = function () { fileInput.click(); };
    fileInput.onchange = function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var r = importBundle(String(reader.result));
        if (r.status === "rejected") { setStatus(status, r.message, "error"); }
        else { applyImport(app, r.data); setStatus(status, r.message); }
        fileInput.value = "";
      };
      reader.readAsText(f);
    };

    // Reset — two-step in-page affordance, no native dialog.
    wrap.querySelector("#dc-reset").onclick = function () {
      var warn = needsExportWarning(app.staging)
        ? "You have " + app.staging.length + " un-exported note(s) — they will be lost. "
        : "This clears your marker and local notes. ";
      status.innerHTML = "";
      var box = document.createElement("span");
      box.innerHTML = esc(warn) +
        '<button class="nav-btn secondary" id="dc-reset-export">Export first</button> ' +
        '<button class="nav-btn danger" id="dc-reset-go">Reset anyway</button> ' +
        '<button class="nav-btn secondary" id="dc-reset-cancel">Cancel</button>';
      status.className = "";
      status.appendChild(box);
      box.querySelector("#dc-reset-export").onclick = function () { downloadExport(app); };
      box.querySelector("#dc-reset-go").onclick = function () { doReset(app); };
      box.querySelector("#dc-reset-cancel").onclick = function () { setStatus(status, ""); };
    };
  }

  var api = {
    buildExport: buildExport,
    buildMarkdown: buildMarkdown,
    importBundle: importBundle,
    mergeById: mergeById,
    reconcile: reconcile,
    needsExportWarning: needsExportWarning,
    applyImport: applyImport,
    doReset: doReset,
    render: render
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DataControls = api;
})(typeof window !== "undefined" ? window : this);

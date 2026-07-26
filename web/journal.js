/* Gardens Grimoire — journal capture + raw->refined display (U4).
   Isomorphic: pure logic (makeNote, mergeForDisplay) is node-testable;
   render() is browser-only and uses App/Position globals. */
(function (root) {
  "use strict";

  function assign(a, b) {
    var o = {};
    if (a) Object.keys(a).forEach(function (k) { o[k] = a[k]; });
    if (b) Object.keys(b).forEach(function (k) { o[k] = b[k]; });
    return o;
  }

  // Pure: build a raw staged note. Returns null for empty/whitespace text.
  function makeNote(text, position, now, id) {
    text = (text == null ? "" : String(text)).trim();
    if (!text) return null;
    return { id: id, position: position, timestamp: now, text: text, refined: false };
  }

  // Pure: combine committed refined entries with staged raw notes.
  // A refined entry (same id) replaces its raw note; newest-first by timestamp.
  function mergeForDisplay(refined, staged) {
    refined = Array.isArray(refined) ? refined : [];
    staged = Array.isArray(staged) ? staged : [];
    var refinedIds = {};
    refined.forEach(function (r) { if (r && r.id != null) refinedIds[r.id] = true; });
    var list = [];
    refined.forEach(function (r) { list.push(assign(r, { kind: "refined" })); });
    staged.forEach(function (s) {
      if (s && !refinedIds[s.id]) list.push(assign(s, { kind: "raw" }));
    });
    list.sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
    return list;
  }

  /* -------- browser-only rendering + interaction -------- */

  function genId() {
    return "n" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }

  function posName(app, ord) {
    var p = root.Position && root.Position.at ? root.Position.at(app.data.positions, ord) : null;
    return p ? p.name : ("Position " + ord);
  }

  function fmtTime(ts) {
    try { return new Date(ts).toLocaleString(); } catch (e) { return ""; }
  }

  function addNote(app, text) {
    var note = makeNote(text, app.state.marker, Date.now(), genId());
    if (!note) return false;
    app.staging.push(note);
    app.saveStaging();
    app.renderAll();
    return true;
  }

  function entryHtml(app, item) {
    var esc = app.esc;
    var when = fmtTime(item.timestamp);
    var where = posName(app, item.position);
    if (item.kind === "refined") {
      var prov = item.provenance
        ? '<details class="provenance"><summary>your original note</summary>' +
          '<div class="original">' + esc(item.provenance) + "</div></details>"
        : "";
      return '<article class="entry entry--refined">' +
        '<div class="meta"><span class="cited">refined ✓ · cited</span>' +
        "<span>" + esc(where) + "</span>" +
        (item.source ? '<span class="cite-src">' + esc(item.source) + "</span>" : "") +
        "<span>" + esc(when) + "</span></div>" +
        '<div class="body">' + esc(item.text) + "</div>" + prov +
        "</article>";
    }
    return '<article class="entry entry--raw">' +
      '<div class="meta"><span class="tag-raw">✎ raw note</span>' +
      "<span>" + esc(where) + "</span><span>" + esc(when) + "</span></div>" +
      '<div class="body">' + esc(item.text) + "</div></article>";
  }

  function emptyStateHtml() {
    return '<div class="state"><strong>Your journal is empty</strong>' +
      "Set your section with the marker above, then jot the first thing you notice — " +
      "a name, a place, a question. Run the processing workflow later to refine these into cited, spoiler-safe knowledge.</div>";
  }

  function render(app, panel) {
    if (!panel) return;
    var esc = app.esc;
    var where = posName(app, app.state.marker);
    var refined = (app.data.journal && app.data.journal.entries) || [];
    var list = mergeForDisplay(refined, app.staging);

    var capture =
      '<form class="capture" id="capture-form">' +
      '<textarea id="capture-text" aria-label="Note for ' + esc(where) +
        '" placeholder="Jot a name, place, or question for ' + esc(where) + '…"></textarea>' +
      '<div class="row">' +
        '<button type="submit" class="nav-btn">Add note for ' + esc(where) + "</button>" +
        '<span class="marker-book">timestamped, saved locally until you export</span>' +
      "</div></form>";

    panel.innerHTML = capture + (list.length ? list.map(function (i) { return entryHtml(app, i); }).join("") : emptyStateHtml());

    var form = document.getElementById("capture-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var ta = document.getElementById("capture-text");
        if (ta && addNote(app, ta.value)) ta.value = "";
      });
    }
  }

  var api = {
    makeNote: makeNote,
    mergeForDisplay: mergeForDisplay,
    addNote: addNote,
    render: render
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Journal = api;
})(typeof window !== "undefined" ? window : this);

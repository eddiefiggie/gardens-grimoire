/* Gardens Grimoire — landing "Previously On…" recap (U7).
   Isomorphic: pure recapFor is node-testable; render() is browser-only.

   Cumulative up to the marker (default per plan Open Questions). Past-facing only
   is enforced by the data the workflow authors, not by the renderer; the firewall
   gate still bounds everything to safeAsOf <= marker. */
(function (root) {
  "use strict";

  var Position = (typeof module !== "undefined" && module.exports)
    ? require("./position.js") : root.Position;

  function byPos(a, b) { return (a.safeAsOf || 0) - (b.safeAsOf || 0); }

  function recapFor(doc, marker) {
    var recaps = doc && Array.isArray(doc.recaps) ? doc.recaps : [];
    var noticed = doc && Array.isArray(doc.noticed) ? doc.noticed : [];
    return {
      blocks: Position.gate(recaps, marker).slice().sort(byPos),
      noticed: Position.gate(noticed, marker).slice().sort(byPos)
    };
  }

  /* -------- browser-only rendering -------- */

  function emptyStateHtml() {
    return '<div class="state"><strong>Nothing to recap yet</strong>' +
      "Once you've logged notes and run the processing workflow, this page opens with " +
      "“Previously, in <em>Gardens of the Moon</em>…” — the story so far, up to exactly where you are.</div>";
  }

  function render(app, panel) {
    if (!panel) return;
    var esc = app.esc;
    var r = recapFor(app.data.recaps, app.state.marker);

    if (!r.blocks.length && !r.noticed.length) {
      panel.innerHTML = emptyStateHtml();
      return;
    }

    var html = '<p class="recap-pos">Previously, in <em>Gardens of the Moon</em>…</p>';
    r.blocks.forEach(function (b) {
      html += '<div class="recap-block"><div>' + esc(b.text) + "</div></div>";
    });
    if (r.noticed.length) {
      html += '<section class="noticed"><h3>Things you should have noticed</h3>';
      r.noticed.forEach(function (n) { html += "<p>" + esc(n.text) + "</p>"; });
      html += "</section>";
    }
    panel.innerHTML = html;
  }

  var api = { recapFor: recapFor, render: render };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Recap = api;
})(typeof window !== "undefined" ? window : this);

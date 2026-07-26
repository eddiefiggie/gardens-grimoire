/* Gardens Grimoire — grimoire surface (U6).
   Isomorphic: pure selection logic is node-testable; render() is browser-only.

   Firewall: dossier layers and questions are gated by safeAsOf/unlocksAt <= marker.
   A pending held question NEVER exposes its unlocksAt — the number is stripped by
   pendingQuestions() so it cannot reach the DOM before it fires. */
(function (root) {
  "use strict";

  var Position = (typeof module !== "undefined" && module.exports)
    ? require("./position.js") : root.Position;

  function gate(items, marker) { return Position.gate(items, marker); }

  // Per-entity accumulating dossier: visible layers, stacked oldest-first.
  // Entities with zero visible layers are omitted.
  function dossiers(entities, marker) {
    entities = Array.isArray(entities) ? entities : [];
    var out = [];
    entities.forEach(function (e) {
      var visible = gate(e.layers || [], marker).slice().sort(function (a, b) {
        return (a.safeAsOf || 0) - (b.safeAsOf || 0);
      });
      if (visible.length) out.push({ id: e.id, name: e.name, type: e.type, layers: visible });
    });
    return out;
  }

  // What just unlocked moving from lastSeen to marker: items in (lastSeen, marker].
  function newlyKnowable(entities, questions, lastSeen, marker) {
    var res = { layers: [], questions: [] };
    if (!(marker > lastSeen)) return res;
    (Array.isArray(entities) ? entities : []).forEach(function (e) {
      (e.layers || []).forEach(function (l) {
        if (typeof l.safeAsOf === "number" && l.safeAsOf > lastSeen && l.safeAsOf <= marker) {
          res.layers.push({ entity: e.name, text: l.text, safeAsOf: l.safeAsOf, source: l.source });
        }
      });
    });
    (Array.isArray(questions) ? questions : []).forEach(function (q) {
      if (typeof q.unlocksAt === "number" && q.unlocksAt > lastSeen && q.unlocksAt <= marker) {
        res.questions.push({ text: q.text, answer: q.answer, source: q.source });
      }
    });
    return res;
  }

  // Held questions logged at/below the marker that are NOT yet answerable.
  // Returned objects deliberately OMIT unlocksAt so the number cannot leak.
  function pendingQuestions(questions, marker) {
    return (Array.isArray(questions) ? questions : []).filter(function (q) {
      return q && typeof q.position === "number" && q.position <= marker &&
        !(typeof q.unlocksAt === "number" && q.unlocksAt <= marker);
    }).map(function (q) {
      return { id: q.id, position: q.position, text: q.text, status: "pending" };
    });
  }

  // Questions whose unlock the marker has reached — now answered.
  function answerableQuestions(questions, marker) {
    return (Array.isArray(questions) ? questions : []).filter(function (q) {
      return q && typeof q.position === "number" && q.position <= marker &&
        typeof q.unlocksAt === "number" && q.unlocksAt <= marker;
    }).map(function (q) {
      return { id: q.id, text: q.text, answer: q.answer, source: q.source, status: "answered" };
    });
  }

  /* -------- browser-only rendering -------- */

  function feedHtml(app, nk) {
    if (!nk.layers.length && !nk.questions.length) return "";
    var esc = app.esc, items = [];
    nk.layers.forEach(function (l) {
      items.push("<li><strong>" + esc(l.entity) + ":</strong> " + esc(l.text) + "</li>");
    });
    nk.questions.forEach(function (q) {
      items.push("<li>Your question — <em>" + esc(q.text) + "</em> — can now be answered." +
        (q.answer ? " " + esc(q.answer) : "") + "</li>");
    });
    return '<section class="feed"><h2>✦ Newly knowable</h2><ul>' + items.join("") + "</ul></section>";
  }

  function questionsHtml(app, pending, answered) {
    var esc = app.esc, html = "";
    if (pending.length) {
      html += "<h3>Open questions</h3>";
      pending.forEach(function (q) {
        html += '<article class="entry held-q"><div class="body">' + esc(q.text) + "</div>" +
          '<div class="status">resolves later — keep reading</div></article>';
      });
    }
    if (answered.length) {
      html += "<h3>Answered</h3>";
      answered.forEach(function (q) {
        html += '<article class="entry entry--refined"><div class="meta"><span class="cited">answered ✓</span>' +
          (q.source ? '<span class="cite-src">' + esc(q.source) + "</span>" : "") + "</div>" +
          '<div class="body"><em>' + esc(q.text) + "</em>" + (q.answer ? " — " + esc(q.answer) : "") + "</div></article>";
      });
    }
    return html;
  }

  function dossierHtml(app, d) {
    var esc = app.esc;
    var layers = d.layers.map(function (l) {
      return '<div class="layer"><span class="as-of">as of ' + esc(l.source || ("position " + l.safeAsOf)) + "</span>" +
        "<div>" + esc(l.text) + "</div></div>";
    }).join("");
    return '<div class="dossier"><span class="kind">' + esc(d.type) + '</span>' +
      "<h3>" + esc(d.name) + "</h3>" + layers + "</div>";
  }

  function emptyStateHtml() {
    return '<div class="state"><strong>The grimoire is empty for now</strong>' +
      "Dossiers accrue here as you log notes and run the processing workflow. " +
      "Everything shown is bounded to your current reading position — nothing beyond it.</div>";
  }

  function render(app, panel) {
    if (!panel) return;
    var marker = app.state.marker;
    var lastSeen = app.state.lastSeenMarker;
    var entities = (app.data.entities && app.data.entities.entities) || [];
    var questions = (app.data.journal && app.data.journal.questions) || [];

    var nk = newlyKnowable(entities, questions, lastSeen, marker);
    var ds = dossiers(entities, marker);
    var pending = pendingQuestions(questions, marker);
    var answered = answerableQuestions(questions, marker);

    var body = feedHtml(app, nk) + questionsHtml(app, pending, answered) +
      (ds.length ? ds.map(function (d) { return dossierHtml(app, d); }).join("") : "");

    panel.innerHTML = body || emptyStateHtml();
  }

  var api = {
    dossiers: dossiers,
    newlyKnowable: newlyKnowable,
    pendingQuestions: pendingQuestions,
    answerableQuestions: answerableQuestions,
    render: render
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Grimoire = api;
})(typeof window !== "undefined" ? window : this);

/* Gardens Grimoire — app orchestrator.
   Owns: the App event bus, page-relative data loading, localStorage state,
   tab switching, and the marker bar. Surface modules (recap.js, journal.js,
   grimoire.js) and the position engine (position.js) attach optional hooks;
   app.js guards each so the shell degrades gracefully before they load. */
(function () {
  "use strict";

  var STATE_KEY = "ggState";
  var STAGING_KEY = "ggJournalStaging";
  var DATA_FILES = ["positions", "entities", "journal", "recaps"];

  var App = {
    data: {},          // { positions, entities, journal, recaps }
    state: { marker: 0, lastSeenMarker: 0 },
    staging: [],       // raw, not-yet-exported notes
    loadError: null,
    _readyCbs: [],
    _isReady: false,

    ready: function (cb) {
      if (this._isReady) cb(this);
      else this._readyCbs.push(cb);
    },
    _resolve: function () {
      this._isReady = true;
      var self = this;
      this._readyCbs.forEach(function (cb) { try { cb(self); } catch (e) { console.error(e); } });
      this._readyCbs = [];
    },

    /* ---- state persistence (ggState) ---- */
    loadState: function () {
      try {
        var raw = localStorage.getItem(STATE_KEY);
        if (raw) {
          var s = JSON.parse(raw);
          if (typeof s.marker === "number") this.state.marker = s.marker;
          if (typeof s.lastSeenMarker === "number") this.state.lastSeenMarker = s.lastSeenMarker;
        }
      } catch (e) { /* corrupt state — fall back to defaults */ }
    },
    saveState: function () {
      try { localStorage.setItem(STATE_KEY, JSON.stringify(this.state)); } catch (e) {}
    },

    /* ---- staging persistence (ggJournalStaging) ---- */
    loadStaging: function () {
      try {
        var raw = localStorage.getItem(STAGING_KEY);
        this.staging = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(this.staging)) this.staging = [];
      } catch (e) { this.staging = []; }
    },
    saveStaging: function () {
      try { localStorage.setItem(STAGING_KEY, JSON.stringify(this.staging)); } catch (e) {}
    },

    /* ---- marker ---- */
    setMarker: function (ord) {
      var max = this.maxOrdinal();
      if (ord < 0) ord = 0;
      if (ord > max) ord = max;
      // advancing (not retreating) records lastSeenMarker so the feed can diff
      if (ord > this.state.marker) this.state.lastSeenMarker = this.state.marker;
      this.state.marker = ord;
      this.saveState();
      this.renderAll();
    },
    maxOrdinal: function () {
      var p = this.data.positions;
      if (p && Array.isArray(p.positions) && p.positions.length) {
        return p.positions[p.positions.length - 1].ord;
      }
      return 0;
    },

    /* ---- render orchestration ---- */
    renderAll: function () {
      this.renderMarkerBar();
      if (window.Recap && Recap.render) Recap.render(this, byId("panel-landing"));
      if (window.Journal && Journal.render) Journal.render(this, byId("panel-journal"));
      if (window.Grimoire && Grimoire.render) Grimoire.render(this, byId("panel-grimoire"));
    },

    renderMarkerBar: function () {
      var bar = byId("marker-bar");
      if (!bar) return;
      if (this.loadError || !this.data.positions) {
        bar.innerHTML = "";
        return;
      }
      var pos = window.Position && Position.at
        ? Position.at(this.data.positions, this.state.marker)
        : null;
      var name = pos ? pos.name : ("Position " + this.state.marker);
      var book = pos && pos.book ? pos.book : "";
      var atStart = this.state.marker <= 0;
      var atEnd = this.state.marker >= this.maxOrdinal();
      bar.innerHTML =
        '<div class="marker-bar">' +
          '<button class="nav-btn secondary" id="marker-prev" ' + (atStart ? "disabled" : "") + '>‹ Back</button>' +
          '<span class="marker-label">Currently reading:</span>' +
          '<span class="marker-pos">' + esc(name) + '</span>' +
          '<button class="nav-btn" id="marker-next" ' + (atEnd ? "disabled" : "") + '>Next ›</button>' +
        '</div>' +
        (book ? '<span class="marker-book">' + esc(book) + '</span>' : "");
      var self = this;
      var prev = byId("marker-prev"), next = byId("marker-next");
      if (prev) prev.onclick = function () { self.setMarker(self.state.marker - 1); };
      if (next) next.onclick = function () { self.setMarker(self.state.marker + 1); };
    }
  };

  /* ---- helpers (shared, attached to App for module reuse) ---- */
  function byId(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  App.esc = esc;
  App.byId = byId;

  /* ---- data loading (page-relative; works locally and on Pages) ---- */
  function loadData() {
    return Promise.all(DATA_FILES.map(function (name) {
      return fetch("data/" + name + ".json", { cache: "no-cache" })
        .then(function (res) {
          if (!res.ok) throw new Error(name + ".json (" + res.status + ")");
          return res.json();
        })
        .then(function (json) { App.data[name] = json; });
    }));
  }

  /* ---- tab switching ---- */
  function wireTabs() {
    var tabs = document.querySelectorAll(".tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () { selectTab(tab.getAttribute("data-panel")); });
    });
  }
  function selectTab(panelId) {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.setAttribute("aria-selected", t.getAttribute("data-panel") === panelId ? "true" : "false");
    });
    document.querySelectorAll(".panel").forEach(function (p) {
      p.classList.toggle("active", p.id === "panel-" + panelId);
    });
  }

  /* ---- boot ---- */
  function boot() {
    App.loadState();
    App.loadStaging();
    wireTabs();
    selectTab("landing");
    showLoading();
    loadData().then(function () {
      App.loadError = null;
      App._resolve();
      App.renderAll();
    }).catch(function (err) {
      App.loadError = err;
      showLoadError(err);
    });
  }

  function showLoading() {
    ["landing", "journal", "grimoire"].forEach(function (p) {
      var el = byId("panel-" + p);
      if (el) el.innerHTML = '<div class="state">Opening the chronicle…</div>';
    });
  }
  function showLoadError(err) {
    var msg = "The chronicle's data could not be loaded" +
      (err && err.message ? " (" + esc(err.message) + ")" : "") +
      ". If this is a fresh install, the data files may not be in place yet.";
    ["landing", "journal", "grimoire"].forEach(function (p) {
      var el = byId("panel-" + p);
      if (el) el.innerHTML = '<div class="state error"><strong>Unable to open the chronicle</strong>' + msg + "</div>";
    });
  }

  window.App = App;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

/* Tickbox notice for tinysystems.io — vanilla port of the old platform's
   @tickboxhq/nuxt setup. Jurisdiction UK_DUAA: self-hosted GoatCounter is
   notice-mode analytics (no consent wall), so this shows a one-time notice
   with an opt-out. Opt-out sets GoatCounter's native `skipgc` flag; every
   decision is posted to the Tickbox audit log with a salted visitor hash.
   The API key is a public ingest credential (pk-style, client-bundled). */
(function () {
  var API = 'https://api.tickbox.dev/v1/events';
  var KEY = 'tb_pk_U72LFLKXG6NBJ3X6ZEM2GHLBTDBUG4O4';
  var META = { jurisdiction: 'UK_DUAA', policyVersion: '2026-08-29' };

  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  async function visitorHash() {
    if (!window.crypto || !crypto.subtle) return null;
    var raw = read('__tb_visitor');
    if (!raw) {
      raw = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);
      store('__tb_visitor', raw);
    }
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  async function report(analytics) {
    var body = { jurisdiction: META.jurisdiction, policyVersion: META.policyVersion,
      decisions: { necessary: true, analytics: analytics } };
    try {
      var h = await visitorHash();
      if (h) body.visitorHash = h;
      fetch(API, { method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', 'X-API-Key': KEY },
        body: JSON.stringify(body) });
    } catch (e) {}
  }

  function setAnalytics(granted, ack) {
    store('skipgc', granted ? null : 't');
    if (ack) store('tb_notice_ack', '1');
    report(granted);
  }

  // Exposed for the privacy page's toggle.
  window.tinyConsent = {
    granted: function () { return read('skipgc') !== 't'; },
    set: function (granted) { setAnalytics(granted, true); }
  };

  if (read('tb_notice_ack')) return;

  function show() {
    var el = document.createElement('div');
    el.id = 'tb-notice';
    el.innerHTML =
      '<b>Just so you know</b><br>' +
      'We count visits with self-hosted GoatCounter. No personal data, no ads. ' +
      '<a href="/privacy/">Details</a>' +
      '<span class="tb-actions"><button id="tb-off">turn it off</button><button id="tb-ok">ok</button></span>';
    document.body.appendChild(el);
    document.getElementById('tb-ok').onclick = function () { setAnalytics(true, true); el.remove(); };
    document.getElementById('tb-off').onclick = function () { setAnalytics(false, true); el.remove(); };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
})();

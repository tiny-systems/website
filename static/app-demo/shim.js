// The web build of Tiny Systems: the real app's frontend, with this file
// standing in for the Go backend. It serves the demo garden that
// TINY_DEMO=1 shows (demo.json is written from demo.go), and plays along
// when someone answers, sends a message or plants a helper. Nothing here
// reaches a computer; it runs entirely in the page.
(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const ready = fetch('./demo.json').then((r) => r.json()).then((d) => { state = d; return d; });
  let state = null;
  const handlers = new Map(); // event name -> [{cb, left}]
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const now = () => new Date().toISOString();
  const later = (ms, fn) => setTimeout(fn, ms);
  const notInDemo = () => Promise.reject(new Error('Not available in the demo: get the app to do this on your own computers.'));

  function emit(name, ...args) {
    const list = handlers.get(name);
    if (!list) return;
    for (const h of [...list]) {
      h.cb(...args);
      if (h.left > 0 && --h.left === 0) list.splice(list.indexOf(h), 1);
    }
  }

  window.runtime = {
    EventsOnMultiple(name, cb, max) {
      const h = { cb, left: max };
      if (!handlers.has(name)) handlers.set(name, []);
      handlers.get(name).push(h);
      return () => { const l = handlers.get(name); if (l) l.splice(l.indexOf(h), 1); };
    },
    EventsOff(name, ...more) { for (const n of [name, ...more]) handlers.delete(n); },
    EventsEmit: emit,
    BrowserOpenURL(url) { window.open(url, '_blank', 'noopener'); },
  };

  const row = (name) => state.fleet.rows.find((r) => r.name === name);
  const convo = (name) => (state.conversations[name] = state.conversations[name] || []);
  function recount() {
    const rows = state.fleet.rows;
    state.fleet.needsYou = rows.filter((r) => r.question).length;
    state.fleet.running = rows.filter((r) => r.phase === 'Running' && !r.paused).length;
  }
  function reply(name, text, ms = 1400) {
    later(ms, () => { convo(name).push({ from: 'helper', text, at: now() }); });
  }

  const names = ['s-thyme', 's-juniper', 's-willow', 's-hazel', 's-olive', 's-poppy', 's-rowan', 's-aster'];

  // Terminals: a pretend session that answers in Claude Code's voice.
  const terms = new Map();
  const enc = new TextEncoder();
  const b64 = (s) => { let b = ''; for (const c of enc.encode(s)) b += String.fromCharCode(c); return btoa(b); };
  const dec = (s) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
  const green = (s) => `\x1b[38;2;70;216;122m${s}\x1b[0m`;
  const dim = (s) => `\x1b[2m${s}\x1b[0m`;
  function termWrite(id, s) { emit(`term:${id}`, b64(s)); }
  function prompt(id) { termWrite(id, `\r\n${green('>')} `); }

  window.go = { main: { App: {
    Version: async () => 'web demo',
    CheckUpdate: async () => ({ available: false }),
    DemoSelect: async () => params.get('select') || '',
    Targets: async () => { await ready; return clone(state.targets); },
    Contexts: async () => [],
    Fleet: async () => { await ready; recount(); return clone({ ...state.fleet, readAt: new Date().toLocaleTimeString() }); },
    Gardens: async () => { await ready; return clone(state.gardens); },
    Health: async () => { await ready; return clone(state.health); },
    Local: async () => ({ lima: false, vms: [], hint: 'Get the app to add gardens.' }),
    Conversation: async (t, name) => { await ready; return clone(convo(name)); },

    Answer: async (t, q, answer) => {
      await ready;
      const r = row(q.session);
      if (r) { r.question = null; r.activity = `Going with: ${answer}`; }
      for (const m of convo(q.session)) if (m.question === q.name) { m.open = false; m.answer = answer; }
      reply(q.session, `Got it: ${answer.toLowerCase()}. I'll make the change and run the tests again.`);
      recount();
    },
    SendMessage: async (t, name, text) => {
      await ready;
      convo(name).push({ from: 'you', text, at: now() });
      reply(name, 'Noted. I’ll take that into account as I go.');
    },
    NewSession: async (t, req) => {
      await ready;
      const name = names.find((n) => !row(n)) || `s-${Date.now().toString(36)}`;
      const title = (req.task || '').trim() || 'Waiting for instructions';
      state.fleet.rows.unshift({ name, depth: 0, phase: 'starting', glyph: '◌', title, activity: '', message: '', task: req.task || '', cpu: '', mem: '', age: 'now', paused: false, command: false, attachable: false });
      if (req.task) convo(name).push({ from: 'you', text: req.task, at: now() });
      later(2500, () => { const r = row(name); if (r) { r.phase = 'Running'; r.attachable = true; r.activity = req.task ? 'Reading the project' : ''; } });
      if (req.task) reply(name, 'Starting now. I’ll ask if anything needs your call.', 4000);
      return name;
    },
    Pause: async (t, name) => { const r = row(name); if (r) r.paused = true; },
    Resume: async (t, name) => { const r = row(name); if (r) r.paused = false; },
    Delete: async (t, name) => { state.fleet.rows = state.fleet.rows.filter((r) => r.name !== name); },

    OpenTerminal: async (t, name) => {
      await ready;
      const id = `t${Math.random().toString(36).slice(2, 8)}`;
      terms.set(id, { name, line: '' });
      const r = row(name);
      later(200, () => {
        termWrite(id, `${green('✻')} Welcome to Claude Code\r\n\r\n${dim('  cwd: /workspace')}\r\n`);
        if (r && r.title) termWrite(id, `${dim(`  task: ${r.title}`)}\r\n`);
        termWrite(id, dim('\r\n  This is the web demo: nothing runs here, but you can type.'));
        prompt(id);
      });
      return id;
    },
    TermInput: async (id, data) => {
      const s = terms.get(id);
      if (!s) return;
      for (const ch of dec(data)) {
        if (ch === '\r') {
          const said = s.line.trim();
          s.line = '';
          if (said) {
            termWrite(id, `\r\n\r\n${green('●')} ${dim('Thinking…')}`);
            later(900, () => {
              termWrite(id, `\r\n${green('●')} In the app, I’d start on “${said.slice(0, 60)}” right away, on your own computer.`);
              prompt(id);
            });
          } else prompt(id);
        } else if (ch === '\x7f') {
          if (s.line) { s.line = s.line.slice(0, -1); termWrite(id, '\b \b'); }
        } else if (ch >= ' ') {
          s.line += ch;
          termWrite(id, ch);
        }
      }
    },
    TermResize: async () => {},
    CloseTerminal: async (id) => { terms.delete(id); },

    Notify: async () => {},
    SetBadge: async () => {},
    GetSettings: async () => ({ openAtLogin: false, startVMs: true, checkUpdates: true }),
    SaveSettings: notInDemo,
    CopyDiagnostics: notInDemo,
    SetSandbox: async () => {},
    CopyCredentials: notInDemo,
    SignIn: notInDemo,
    HasClaudeCLI: async () => false,
    ClaudeSetupToken: notInDemo,
    UpgradeRuntime: notInDemo,
    StartVM: notInDemo,
    StopVM: notInDemo,
    Install: notInDemo,
    InstallLocal: notInDemo,
  } } };
})();

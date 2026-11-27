// Tiny Systems home: pollen in the hero, the embedded app scaled to fit,
// blur-in reveals, the grove that grows as you scroll, the keys falling
// away to "0 keys" and the stacked garden cards.
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  // Canvas resolution: wider than the GPU's 4096px texture limit (or past
  // ~8M pixels) Chrome drops to a software canvas and frames take 1.5s.
  const backing = (w, h, max = 2) => Math.max(0.5, Math.min(max, devicePixelRatio || 1, 4000 / w, 4000 / h, Math.sqrt(8e6 / (w * h))));

  // The embedded app is laid out at 1180x720; scale it to the frame.
  const frame = $('appframe');
  if (frame) {
    const fit = () => frame.style.setProperty('--s', String(Math.min(1, frame.clientWidth / 1180)));
    fit();
    new ResizeObserver(fit).observe(frame);
  }

  // Pollen: a few soft motes drifting up through the tree.
  const cv = $('pollen');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, motes = [];
    const size = () => {
      w = cv.clientWidth; h = cv.clientHeight;
      const r = backing(w, h, 1.25); // soft motes don't need retina
      cv.width = w * r; cv.height = h * r;
      ctx.setTransform(r, 0, 0, r, 0, 0);
      motes = Array.from({ length: Math.round(w / 22) }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.6 + 0.4,
        v: Math.random() * 0.25 + 0.08, d: Math.random() * Math.PI * 2, a: Math.random() * 0.5 + 0.15,
      }));
    };
    size();
    addEventListener('resize', size);
    let on = true;
    new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) requestAnimationFrame(tick); }).observe(cv);
    function tick(t) {
      if (!on) return;
      ctx.clearRect(0, 0, w, h);
      const beamX = w * 0.5;
      for (const m of motes) {
        m.y -= m.v; m.x += Math.sin(t / 2400 + m.d) * 0.18;
        if (m.y < -4) { m.y = h + 4; m.x = Math.random() * w; }
        const near = Math.max(0, 1 - Math.abs(m.x - beamX) / 420); // brighter near the tree
        ctx.globalAlpha = m.a * (0.35 + near * 0.9);
        ctx.fillStyle = near > 0.3 ? '#D9FFE6' : '#7FE8A6';
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r + near, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // The tree: grows from behind the app window on load, then light runs
  // from the trunk out to the buds, like work moving through a garden.
  // Canvas shadowBlur per stroke froze the page (1,300 blurred strokes a
  // frame), so glow is a small upscaled canvas and buds stamp a sprite.
  const tc = $('tree');
  if (tc) {
    const ctx = tc.getContext('2d');
    const win = $('demo');
    let W = 0, H = 0, R = 1, segs = [], tips = [], buds = [], born = 0, depth = 7;
    // The tree itself is painted into `layer` while it grows and then
    // frozen; each frame only copies it and stamps the moving lights.
    const layer = document.createElement('canvas'), bx = layer.getContext('2d');
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    function grow() {
      W = tc.clientWidth; H = tc.clientHeight;
      R = backing(W, H);
      tc.width = layer.width = Math.round(W * R); tc.height = layer.height = Math.round(H * R);
      seed = 11; segs = []; tips = [];
      const base = win ? win.offsetTop + 120 : H * 0.8;
      const trunk = Math.min(H * 0.2, 190);
      const scale = Math.min(1.25, W / 1100);
      depth = W < 700 ? 6 : 7;
      const branch = (x, y, a, len, wd, d, parent) => {
        const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
        const bend = (rnd() - 0.5) * len * 0.35;
        const cx = (x + x2) / 2 + Math.cos(a + Math.PI / 2) * bend, cy = (y + y2) / 2 + Math.sin(a + Math.PI / 2) * bend;
        const i = segs.push({ x, y, cx, cy, x2, y2, wd, d, parent, t0: d * 0.22 + rnd() * 0.08 }) - 1;
        if (d >= depth || len < 9) { tips.push(i); return; }
        const n = d < 2 ? 2 : (rnd() < 0.35 ? 3 : 2);
        for (let k = 0; k < n; k++) {
          const spread = (d < 2 ? 0.55 : 0.42) + rnd() * 0.25;
          const na = a + (n === 2 ? (k ? spread : -spread) : (k - 1) * spread) + (rnd() - 0.5) * 0.2;
          branch(x2, y2, na, len * (0.76 + rnd() * 0.1), wd * 0.68, d + 1, i);
        }
      };
      branch(W / 2, base, -Math.PI / 2, trunk * scale, 7 * scale, 0, -1);
      // A few roots spreading under the window.
      for (const a of [0.35, 0.9, 2.25, 2.8]) branch(W / 2, base, a, 70 * scale, 3 * scale, depth - 2, -1);
      buds = tips.filter((_, k) => k % 3 === 0); // twinkle a third of the tips
      layerDone = false;
      born = 0; // set on the first frame, so a busy load doesn't skip the growth
    }
    const curve = (s, k) => { // point k (0..1) along a segment's curve
      const u = 1 - k;
      return [u * u * s.x + 2 * u * k * s.cx + k * k * s.x2, u * u * s.y + 2 * u * k * s.cy + k * k * s.y2];
    };
    // Strokes grouped by depth: one path and one stroke per group.
    function strokes(c, age, wide, fat = 1) {
      c.lineCap = 'round';
      for (let d = 0; d <= depth; d++) {
        c.beginPath();
        let any = false, wd = 0;
        for (const s of segs) {
          if (s.d !== d) continue;
          const k = Math.min(1, Math.max(0, (age - s.t0) / 0.35));
          if (!k) continue;
          const [ex, ey] = curve(s, k);
          c.moveTo(s.x, s.y); c.quadraticCurveTo(s.x + (s.cx - s.x) * k, s.y + (s.cy - s.y) * k, ex, ey);
          any = true; wd = s.wd;
        }
        if (!any) continue;
        const glow = 0.18 + (d / depth) * 0.5;
        c.strokeStyle = wide ? `rgba(70, 216, 122, ${0.14 + glow * 0.3})` : `rgba(155, 245, 189, ${0.25 + glow * 0.6})`;
        c.lineWidth = wide ? (wd + 6) * fat : Math.max(0.6, wd * 0.55);
        c.stroke();
      }
    }
    // Glow: the wide strokes drawn into a canvas an eighth the size and
    // scaled up, which blurs them for free. Redrawn only while growing.
    const Q = 8, glow = document.createElement('canvas'), gx = glow.getContext('2d');
    let layerDone = false;
    function paintGlow(age) {
      if (glow.width !== Math.ceil(W / Q) || glow.height !== Math.ceil(H / Q)) { glow.width = Math.ceil(W / Q); glow.height = Math.ceil(H / Q); }
      gx.setTransform(1, 0, 0, 1, 0, 0); gx.clearRect(0, 0, glow.width, glow.height);
      gx.setTransform(1 / Q, 0, 0, 1 / Q, 0, 0);
      strokes(gx, age, true, 1.6);
    }
    function paintLayer(age) {
      paintGlow(age);
      bx.setTransform(1, 0, 0, 1, 0, 0);
      bx.clearRect(0, 0, layer.width, layer.height);
      bx.setTransform(R, 0, 0, R, 0, 0);
      bx.imageSmoothingQuality = 'high';
      bx.globalAlpha = 0.4;
      bx.drawImage(glow, 0, 0, W, H);
      bx.globalAlpha = 1;
      strokes(bx, age, false);
    }
    // A soft dot drawn once and stamped wherever light should be.
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 48;
    {
      const g = sprite.getContext('2d').createRadialGradient(24, 24, 0, 24, 24, 24);
      g.addColorStop(0, 'rgba(235, 255, 242, 1)'); g.addColorStop(0.18, 'rgba(155, 245, 189, 0.8)'); g.addColorStop(1, 'rgba(70, 216, 122, 0)');
      const s = sprite.getContext('2d'); s.fillStyle = g; s.fillRect(0, 0, 48, 48);
    }
    const dot = (x, y, r, a) => { ctx.globalAlpha = a; ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2); };
    const pulses = [];
    function spawn() {
      let i = tips[Math.floor(Math.random() * tips.length)];
      const path = [];
      while (i >= 0) { path.unshift(segs[i]); i = segs[i].parent; }
      if (path[0].d === 0) pulses.push({ path, t: 0, sp: 0.7 + Math.random() * 0.4, ph: Math.random() * 6.3 });
    }
    let on = true, running = false, last = 0, nextSpawn = 0;
    new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !running) { running = true; requestAnimationFrame(frame); } }).observe(tc);
    function frame(now) {
      if (!on) { running = false; return; }
      if (!born) born = now;
      const age = (now - born) / 1000;
      const done = age > depth * 0.22 + 0.5;
      if (!layerDone) { paintLayer(done ? 99 : age); layerDone = done; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, tc.width, tc.height);
      ctx.drawImage(layer, 0, 0);
      ctx.setTransform(R, 0, 0, R, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      // Buds: tips twinkle once grown.
      for (const i of buds) {
        const s = segs[i];
        if (age < s.t0 + 0.35) continue;
        const tw = 0.5 + 0.5 * Math.sin(now / 2400 + i * 1.7); // slow breathing, not blinking
        dot(s.x2, s.y2, 5 + tw * 3, 0.2 + tw * 0.4);
      }
      // Sap: a few soft glows rising slowly from the trunk to the tips, in
      // gentle surges, swelling in the middle of the climb and fading out.
      if (done && !reduce) {
        if (now > nextSpawn && pulses.length < 5) { spawn(); nextSpawn = now + 1200 + Math.random() * 1600; }
        const dt = Math.min(0.05, (now - last) / 1000);
        for (let j = pulses.length - 1; j >= 0; j--) {
          const p = pulses[j];
          p.t += dt * p.sp * (0.55 + 0.45 * Math.sin(now / 900 + p.ph));
          const si = Math.floor(p.t);
          if (si >= p.path.length) { pulses.splice(j, 1); continue; }
          const [px, py] = curve(p.path[si], p.t - si);
          const life = Math.sin(Math.PI * p.t / p.path.length);
          dot(px, py, 6 + life * 4, 0.15 + life * 0.45);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      last = now;
      if (!reduce || !done) requestAnimationFrame(frame); else running = false;
    }
    grow();
    if (reduce) born = -1e9;
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { grow(); born = -1e9; if (!running) { running = true; requestAnimationFrame(frame); } }, 150); });
    running = true;
    requestAnimationFrame(frame);
  }

  // Mascot: the sprout's eyes look toward the pointer.
  const mascots = [...document.querySelectorAll('.mascot')];
  if (mascots.length && !reduce) {
    let mt = 0;
    addEventListener('pointermove', (e) => {
      if (mt) return;
      mt = requestAnimationFrame(() => {
        mt = 0;
        for (const m of mascots) {
          const r = m.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          const d = Math.hypot(dx, dy) || 1;
          m.style.setProperty('--lx', (dx / d).toFixed(2));
          m.style.setProperty('--ly', (dy / d).toFixed(2));
        }
      });
    }, { passive: true });
  }

  // Reveal: blur to sharp as sections come in.
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((el) => (reduce ? el.classList.add('in') : io.observe(el)));

  // Grove: one helper, then its computer, then a whole garden.
  const grove = $('grove');
  const field = $('grove-field');
  const svg = $('grove-lines');
  const words = [...document.querySelectorAll('#grove-title span')];
  const sub = $('grove-sub');
  const fixed = { mac: [22, 62], fern: [50, 62], basil: [78, 40] };
  const place = (el, [x, y]) => { el.style.left = `${x}%`; el.style.top = `${y}%`; };
  place($('node-mac'), fixed.mac); place($('node-fern'), fixed.fern); place($('node-basil'), fixed.basil);
  // Connections are roots: a curve that sags a little below the straight
  // line, a rootlet or two, and sap that runs along once it has grown.
  const NS = 'http://www.w3.org/2000/svg';
  let rootSeed = 3;
  const rr = () => ((rootSeed = (rootSeed * 16807) % 2147483647) / 2147483647);
  const pathEl = (d, cls) => {
    const e = document.createElementNS(NS, 'path');
    e.setAttribute('d', d); e.setAttribute('class', cls); e.setAttribute('pathLength', '100');
    return e;
  };
  const line = (a, b, cls = '') => {
    const [x1, y1, x2, y2] = [a[0] * 10, a[1] * 5.6, b[0] * 10, b[1] * 5.6];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const sag = len * (0.12 + rr() * 0.08);
    const c1 = [x1 + (x2 - x1) * 0.3 + (rr() - 0.5) * 18, y1 + (y2 - y1) * 0.3 + sag];
    const c2 = [x1 + (x2 - x1) * 0.7 + (rr() - 0.5) * 18, y1 + (y2 - y1) * 0.7 + sag * 0.8];
    const g = document.createElementNS(NS, 'g');
    if (cls) g.setAttribute('class', cls);
    const d = `M${x1} ${y1}C${c1} ${c2} ${x2} ${y2}`;
    g.append(pathEl(d, 'root'));
    // Rootlets: short, thinner, drooping off the main curve.
    const at = (t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * [x1, y1][k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * [x2, y2][k]); };
    for (const t of len > 140 ? [0.32, 0.68] : [0.5]) {
      const [px, py] = at(t);
      const dir = rr() < 0.5 ? -1 : 1, l = 14 + rr() * 16;
      g.append(pathEl(`M${px} ${py}Q${px + dir * l * 0.5} ${py + l * 0.4} ${px + dir * l * 0.8} ${py + l}`, 'rootlet'));
    }
    g.append(pathEl(d, 'sap'));
    svg.append(g);
    return g;
  };
  const lMacFern = line(fixed.mac, fixed.fern, 'hot');
  const lFernBasil = line(fixed.fern, fixed.basil, 'hot');
  // The wider garden: seeded so it looks the same on every visit.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const kinds = ['leaf', 'sky', 'petal', 'lilac', 'sun', 'leaf', 'sky'];
  const glyphs = ['g-grow', 'g-grow', 'g-done', 'g-grow', 'g-ask', 'g-rest', 'g-grow'];
  const extra = [];
  const spots = [];
  while (spots.length < 26) {
    const p = [6 + rnd() * 88, 6 + rnd() * 88];
    const clear = [fixed.mac, fixed.fern, fixed.basil, ...spots].every((q) => Math.hypot((p[0] - q[0]) * 1.6, p[1] - q[1]) > 14);
    if (clear) spots.push(p);
  }
  spots.forEach((p, i) => {
    const n = document.createElement('div');
    n.className = 'node tiny';
    const k = i % kinds.length;
    n.innerHTML = `<span class="av ${kinds[k]}"><svg><use href="#${glyphs[(i * 3) % glyphs.length]}"/></svg></span>`;
    place(n, p);
    field.append(n);
    const near = [fixed.mac, fixed.fern, fixed.basil, ...spots.slice(0, i)].sort((a, b) => Math.hypot(a[0] - p[0], a[1] - p[1]) - Math.hypot(b[0] - p[0], b[1] - p[1]))[0];
    extra.push({ n, l: line(near, p) });
  });
  const bubble = $('fern-bubble');
  function groveAt(p) {
    words.forEach((w, i) => w.classList.toggle('lit', p > 0.02 + i * 0.05));
    sub.classList.toggle('lit', p > 0.22);
    $('node-fern').classList.toggle('on', p > 0.26);
    $('node-mac').classList.toggle('on', p > 0.34);
    lMacFern.classList.toggle('on', p > 0.36);
    bubble.classList.toggle('on', p > 0.44 && p < 0.72);
    $('node-basil').classList.toggle('on', p > 0.52);
    lFernBasil.classList.toggle('on', p > 0.54);
    extra.forEach(({ n, l }, i) => {
      const show = p > 0.62 + (i / extra.length) * 0.3;
      n.classList.toggle('on', show); l.classList.toggle('on', show);
    });
  }
  if (reduce) groveAt(1);

  // Zero keys: the keys an agent usually gets fall away one by one as the
  // section passes, and the count drops to 0. Without JS it just says 0.
  const zero = $('zero');
  const chips = [...document.querySelectorAll('#keychips li')];
  const zeroN = $('zero-n');
  if (zero && !reduce) {
    $('keychips').classList.add('live');
    chips.forEach((c, i) => c.style.setProperty('--r', `${(i % 2 ? -1 : 1) * (6 + (i * 5) % 9)}deg`));
  }

  // Stacked cards: the list beside them follows the card on top.
  const cards = [...document.querySelectorAll('.scard')];
  const nav = [...document.querySelectorAll('#stack-nav li')];

  const cue = $('scrollcue');
  let ticking = false;
  function onScroll() {
    ticking = false;
    const vh = innerHeight;
    if (cue) cue.classList.toggle('gone', scrollY > 60);
    if (grove && !reduce) {
      const r = grove.getBoundingClientRect();
      groveAt(clamp(-r.top / (r.height - vh)));
    }
    if (zero && !reduce) {
      const r = zero.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh + r.height));
      let left = 0;
      chips.forEach((c, i) => { const gone = p > 0.3 + i * 0.045; c.classList.toggle('gone', gone); if (!gone) left++; });
      zeroN.textContent = left;
      $('zero-u').textContent = left === 1 ? 'key' : 'keys';
    }
    if (cards.length && nav.length) {
      let top = 0;
      cards.forEach((c, i) => { if (c.getBoundingClientRect().top < vh * 0.45) top = i; });
      nav.forEach((li, i) => li.classList.toggle('on', i === top));
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
})();

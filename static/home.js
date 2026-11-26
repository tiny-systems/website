// Tiny Systems home: pollen in the hero, the embedded app scaled to fit,
// blur-in reveals, the grove that grows as you scroll, the lens over
// "0 keys" and the stacked garden cards.
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

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
      const r = devicePixelRatio || 1;
      w = cv.clientWidth; h = cv.clientHeight;
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
  const tc = $('tree');
  if (tc) {
    const ctx = tc.getContext('2d');
    const win = $('demo');
    let W = 0, H = 0, segs = [], tips = [], art = null, born = 0;
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    function grow() {
      const r = devicePixelRatio || 1;
      W = tc.clientWidth; H = tc.clientHeight;
      tc.width = W * r; tc.height = H * r;
      ctx.setTransform(r, 0, 0, r, 0, 0);
      seed = 11; segs = []; tips = [];
      const base = win ? win.offsetTop + 120 : H * 0.8;
      const trunk = Math.min(H * 0.2, 190);
      const scale = Math.min(1.25, W / 1100);
      const branch = (x, y, a, len, wd, d, parent) => {
        const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
        const bend = (rnd() - 0.5) * len * 0.35;
        const cx = (x + x2) / 2 + Math.cos(a + Math.PI / 2) * bend, cy = (y + y2) / 2 + Math.sin(a + Math.PI / 2) * bend;
        const i = segs.push({ x, y, cx, cy, x2, y2, wd, d, parent, t0: d * 0.2 + rnd() * 0.08 }) - 1;
        if (d >= 8 || len < 9) { tips.push(i); return; }
        const n = d < 2 ? 2 : (rnd() < 0.35 ? 3 : 2);
        for (let k = 0; k < n; k++) {
          const spread = (d < 2 ? 0.55 : 0.42) + rnd() * 0.25;
          const na = a + (n === 2 ? (k ? spread : -spread) : (k - 1) * spread) + (rnd() - 0.5) * 0.2;
          branch(x2, y2, na, len * (0.74 + rnd() * 0.1), wd * 0.68, d + 1, i);
        }
      };
      branch(W / 2, base, -Math.PI / 2, trunk * scale, 7 * scale, 0, -1);
      // A few roots spreading under the window.
      for (const a of [0.35, 0.9, 2.25, 2.8]) branch(W / 2, base, a, 70 * scale, 3 * scale, 6, -1);
      art = null;
      born = performance.now();
    }
    const curve = (s, k) => { // point k (0..1) along a segment's curve
      const u = 1 - k;
      return [u * u * s.x + 2 * u * k * s.cx + k * k * s.x2, u * u * s.y + 2 * u * k * s.cy + k * k * s.y2];
    };
    function drawTree(ctx2, age) {
      ctx2.lineCap = 'round';
      for (const s of segs) {
        const k = Math.min(1, Math.max(0, (age - s.t0) / 0.35));
        if (!k) continue;
        const [ex, ey] = curve(s, k);
        const mx = s.x + (s.cx - s.x) * k, my = s.y + (s.cy - s.y) * k;
        const glow = 0.18 + (s.d / 8) * 0.5;
        ctx2.strokeStyle = `rgba(70, 216, 122, ${0.12 + glow * 0.25})`;
        ctx2.lineWidth = s.wd + 6;
        ctx2.shadowColor = '#46D87A'; ctx2.shadowBlur = 18;
        ctx2.beginPath(); ctx2.moveTo(s.x, s.y); ctx2.quadraticCurveTo(mx, my, ex, ey); ctx2.stroke();
        ctx2.shadowBlur = 0;
        ctx2.strokeStyle = `rgba(155, 245, 189, ${0.25 + glow * 0.6})`;
        ctx2.lineWidth = Math.max(0.6, s.wd * 0.55);
        ctx2.beginPath(); ctx2.moveTo(s.x, s.y); ctx2.quadraticCurveTo(mx, my, ex, ey); ctx2.stroke();
      }
    }
    const pulses = [];
    function spawn() {
      let i = tips[Math.floor(Math.random() * tips.length)];
      const path = [];
      while (i >= 0) { path.unshift(segs[i]); i = segs[i].parent; }
      if (path[0].d === 0) pulses.push({ path, t: 0, sp: 0.9 + Math.random() * 0.6 });
    }
    let on = true, last = 0, nextSpawn = 0;
    new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) requestAnimationFrame(frame); }).observe(tc);
    function frame(now) {
      if (!on) return;
      const age = (now - born) / 1000;
      const done = age > 8 * 0.2 + 0.5;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      if (done && !art) { // grown: keep a picture of it, redraw only light
        art = document.createElement('canvas');
        art.width = tc.width; art.height = tc.height;
        const a = art.getContext('2d');
        a.setTransform(tc.width / W, 0, 0, tc.height / H, 0, 0);
        drawTree(a, 99);
      }
      if (art) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(art, 0, 0); ctx.restore(); } else drawTree(ctx, age);
      // Buds: tips twinkle once grown.
      for (const i of tips) {
        const s = segs[i];
        if (age < s.t0 + 0.35) continue;
        const tw = 0.5 + 0.5 * Math.sin(now / 700 + i);
        ctx.fillStyle = `rgba(205, 255, 222, ${0.25 + tw * 0.45})`;
        ctx.shadowColor = '#7CF0A5'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(s.x2, s.y2, 1.6 + tw * 1.2, 0, Math.PI * 2); ctx.fill();
      }
      // Light running out along the branches.
      if (done && !reduce) {
        if (now > nextSpawn && pulses.length < 14) { spawn(); nextSpawn = now + 220; }
        const dt = Math.min(0.05, (now - last) / 1000);
        for (let j = pulses.length - 1; j >= 0; j--) {
          const p = pulses[j];
          p.t += dt * p.sp * 3;
          const si = Math.floor(p.t);
          if (si >= p.path.length) { pulses.splice(j, 1); continue; }
          const [px, py] = curve(p.path[si], p.t - si);
          ctx.fillStyle = 'rgba(230, 255, 238, 0.95)';
          ctx.shadowColor = '#9BF5BD'; ctx.shadowBlur = 16;
          ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
      last = now;
      if (!reduce || !done) requestAnimationFrame(frame);
    }
    grow();
    if (reduce) born = -1e9;
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { grow(); born = -1e9; }, 150); });
    requestAnimationFrame(frame);
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
  const line = (a, b, cls = '') => {
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', a[0] * 10); l.setAttribute('y1', a[1] * 5.6); l.setAttribute('x2', b[0] * 10); l.setAttribute('y2', b[1] * 5.6);
    if (cls) l.setAttribute('class', cls);
    svg.append(l);
    return l;
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

  // Lens: slides across "0 keys" as the section passes.
  const zero = $('zero');
  const lens = $('lens');

  // Stacked cards: the list beside them follows the card on top.
  const cards = [...document.querySelectorAll('.scard')];
  const nav = [...document.querySelectorAll('#stack-nav li')];

  let ticking = false;
  function onScroll() {
    ticking = false;
    const vh = innerHeight;
    if (grove && !reduce) {
      const r = grove.getBoundingClientRect();
      groveAt(clamp(-r.top / (r.height - vh)));
    }
    if (zero && lens) {
      const r = zero.getBoundingClientRect();
      const p = clamp((vh - r.top) / (vh + r.height));
      lens.style.left = `${(0.08 + p * 0.84) * 100}%`;
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

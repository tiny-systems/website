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

  // Pollen: a few soft motes drifting up through the sunbeam.
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
      const beamX = w * 0.86;
      for (const m of motes) {
        m.y -= m.v; m.x += Math.sin(t / 2400 + m.d) * 0.18;
        if (m.y < -4) { m.y = h + 4; m.x = Math.random() * w; }
        const near = Math.max(0, 1 - Math.abs(m.x - beamX) / 260); // brighter in the beam
        ctx.globalAlpha = m.a * (0.35 + near * 0.9);
        ctx.fillStyle = near > 0.3 ? '#D9FFE6' : '#7FE8A6';
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r + near, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
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

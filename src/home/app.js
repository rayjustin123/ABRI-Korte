(() => {
'use strict';
const CFG = window.ABRI || {};
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));
const G = window.gsap, ST = window.ScrollTrigger;
if (G && ST) G.registerPlugin(ST);

/* ---------- theme: light first, a toggle for dark, remembered per visitor ---------- */
const isDark = () => root.getAttribute('data-theme') === 'dark';
try { const t = localStorage.getItem('abri-theme'); if (t === 'dark' || t === 'light') root.setAttribute('data-theme', t); } catch (e) {}
const themeBtn = $('#theme');
const syncTheme = () => { themeBtn.setAttribute('aria-label', isDark() ? 'Switch to light mode' : 'Switch to dark mode'); themeBtn.setAttribute('aria-pressed', String(isDark())); };
themeBtn.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('abri-theme', next); } catch (e) {}
});
const themeHooks = [];
const themeColor = () => { const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', isDark() ? '#08131D' : '#016FA8'); };
new MutationObserver(() => { syncTheme(); themeColor(); themeHooks.forEach(f => f()); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
syncTheme(); themeColor();

/* ---------- live bits: Manila clock, current rate, tournament countdown ---------- */
const RATES = CFG.rates || { weekday: { day: 200, night: 350 }, weekend: { day: 300, night: 400 }, dayStart: 360, dayEnd: 1020 };
const manila = () => { const d = new Date(Date.now() + 8 * 36e5); return { h: d.getUTCHours(), m: d.getUTCMinutes(), dow: d.getUTCDay() }; };
const hhmm = (h, m) => ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM');
function live() {
  const t = manila(), mins = t.h * 60 + t.m, wk = t.dow === 0 || t.dow === 6 ? 'weekend' : 'weekday';
  const part = mins >= RATES.dayStart && mins < RATES.dayEnd ? 'day' : 'night';
  const clock = $('#clock');
  if (clock) clock.innerHTML = "It's <b>" + hhmm(t.h, t.m) + '</b> in Consolacion and the court is open. ' + (part === 'day' ? 'Day' : 'Night') + ' rate right now: <b>&#8369;' + RATES[wk][part] + '</b> an hour.';
  $$('[data-rate]').forEach(td => td.classList.toggle('now', td.dataset.rate === wk + '-' + part));
  const cnt = $('#count');
  if (cnt) {
    const start = Date.UTC(2026, 10, 20, 23, 0), end = Date.UTC(2026, 10, 22, 9, 0), now = Date.now();
    if (now < start) { const d = Math.ceil((start - now) / 864e5); cnt.innerHTML = '<b class="num">' + d + (d === 1 ? ' day' : ' days') + '</b>until the first serve'; }
    else if (now < end) cnt.innerHTML = '<b>Happening now</b>Come watch at the court';
    else cnt.innerHTML = '<b>Thanks for playing</b>Results are on the schedule page';
  }
}
live(); setInterval(live, 30000);

/* ---------- words for the hero colliders, the event columns and the marquees ---------- */
$$('[data-collide]').forEach(w => { const t = w.textContent.trim(); w.textContent = ''; for (const c of t) { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; w.appendChild(s); } });
const TAGS = ['Birthdays', 'Team building', 'Reunions', 'Barkada nights', 'Despedidas', 'Family days', 'Office sportsfest', 'Christmas parties'];
$$('.cols ul').forEach((ul, i) => {
  let h = '';
  for (let k = 0; k < 26; k++) h += '<li><span class="tag t' + (1 + (k + i * 2) % 5) + '">' + TAGS[(k * 3 + i * 5) % TAGS.length] + '</span></li>';
  ul.innerHTML = h;
});
$$('.marq ul').forEach((ul, i) => {
  let h = '';
  for (let k = 0; k < 18; k++) h += '<li><span class="tag t' + (1 + (k + i) % 5) + '">' + TAGS[(k * 3 + i * 4) % TAGS.length] + '</span></li>';
  ul.innerHTML = h;
});

/* ---------- brand lockups: the heavier word sets the size, the lighter word is spaced out to the same width ---------- */
function fitLockups() {
  $$('.lockup, .tour-title, .wordbox').forEach(box => {
    const lines = $$('[data-fit]', box);
    lines.forEach(el => { el.style.fontSize = ''; el.style.letterSpacing = ''; });
    const W = box.getBoundingClientRect().width;
    if (W < 40 || !lines.length) return;
    let base = 0;
    lines.forEach(el => {
      if (el.dataset.fit === 'size') {
        el.style.fontSize = '100px';
        const w = el.getBoundingClientRect().width || 1;
        base = 100 * W / w; el.style.fontSize = base.toFixed(2) + 'px';
      } else if (base) {
        if (!el.dataset.split) {   // the last letter gets no spacing after it, so the line ends exactly at the edge
          const t = el.textContent.trim(), last = document.createElement('span');
          last.textContent = t.slice(-1); last.style.letterSpacing = '0';
          el.textContent = t.slice(0, -1); el.appendChild(last); el.dataset.split = '1';
        }
        let fs = base * (parseFloat(el.dataset.k) || 0.75);
        el.style.fontSize = fs.toFixed(2) + 'px'; el.style.letterSpacing = '0px';
        let w = el.getBoundingClientRect().width;
        if (w > W) { fs *= W / w; el.style.fontSize = fs.toFixed(2) + 'px'; w = el.getBoundingClientRect().width; }
        const n = Math.max(2, el.textContent.trim().length), ls = Math.max(0, (W - w) / (n - 1));
        el.style.letterSpacing = ls.toFixed(2) + 'px';
      }
    });
  });
}
function fitHero() {
  const w1 = $('.hero-words .w1'), kw = $('.hero-words .kw'), tag = $('.hero-words .ktag');
  if (!w1 || !kw) return;
  const W = w1.getBoundingClientRect().width; if (W < 20) return;
  const spread = (el, lastSel) => {
    el.style.fontSize = ''; el.style.letterSpacing = '0px'; el.style.marginRight = '';
    let w = el.getBoundingClientRect().width;
    if (w > W) { el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * W / w).toFixed(2) + 'px'; w = el.getBoundingClientRect().width; }
    const n = Math.max(2, el.textContent.trim().length), ls = Math.max(0, (W - w) / (n - 1));
    el.style.letterSpacing = ls.toFixed(2) + 'px';
    const last = lastSel ? $$(lastSel, el).pop() : null;
    if (last) last.style.letterSpacing = '0px'; else el.style.marginRight = (-ls).toFixed(2) + 'px';
  };
  spread(kw, '.ch');
  if (tag) spread(tag, null);
}
fitLockups(); fitHero();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitLockups(); fitHero(); });
{ let ft = null; addEventListener('resize', () => { clearTimeout(ft); ft = setTimeout(() => { fitLockups(); fitHero(); }, 120); }); }

/* the booking section: a faint grid follows the pointer, and the cloud of players turns toward it */
const howEl = $('#how'), howPtr = { x: 0, y: 0, on: false };
if (howEl) howEl.addEventListener('pointermove', e => {
  const r = howEl.getBoundingClientRect();
  howEl.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
  howEl.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
  if (e.pointerType === 'mouse') { howPtr.x = (e.clientX - r.left) / r.width * 2 - 1; howPtr.y = (e.clientY - r.top) / r.height * 2 - 1; howPtr.on = true; }
});
if (howEl) howEl.addEventListener('pointerleave', () => { howPtr.on = false; });

/* ---------- GSAP: header state, transform-only reveals, magnetic ball button, scrubbed columns ---------- */
const heroEl = $('#hero');
if (G && ST) {
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
  if (!reduce) {
    G.from('[data-intro]', { y: 22, duration: 1.1, ease: 'power3.out', stagger: 0.12, delay: 0.15 });
    $$('[data-rise]').forEach(el => G.from(el, { y: 28, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } }));
    $$('.cols ul').forEach(ul => {
      const sp = parseFloat(ul.dataset.speed) || 0.3;
      const range = () => ul.parentElement.offsetHeight * Math.abs(sp);
      G.fromTo(ul, { y: () => (sp > 0 ? -range() : 0) }, { y: () => (sp > 0 ? 0 : -range()), ease: 'none', immediateRender: true,
        scrollTrigger: { trigger: '.events', start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true } });
    });
    $$('.marq ul').forEach(ul => {
      const dir = parseFloat(ul.dataset.dir) || 1;
      const shift = () => Math.max(0, ul.scrollWidth - ul.parentElement.offsetWidth);
      G.fromTo(ul, { x: () => (dir > 0 ? 0 : -shift()) }, { x: () => (dir > 0 ? -shift() : 0), ease: 'none',
        scrollTrigger: { trigger: '.events', start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true } });
    });
    if (!coarse) $$('[data-magnet]').forEach(el => {
      const xTo = G.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }), yTo = G.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.32); yTo((e.clientY - r.top - r.height / 2) * 0.32); });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }
}

/* ---------- WebGL: one renderer, one fixed canvas, a scene per section box ---------- */
const THREE = window.THREE;
const canvas = $('#gl');
let R = null;
try {
  if (!THREE) throw new Error('three.js did not load');
  R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.6 : 2));
  R.outputEncoding = THREE.sRGBEncoding;
  R.toneMapping = THREE.ACESFilmicToneMapping;
  R.toneMappingExposure = 0.95;
  R.setClearColor(0x000000, 0);
  R.autoClear = false;
} catch (e) { R = null; root.classList.add('no-gl'); }
if (!R) return;
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); root.classList.add('no-gl'); R = null; }, false);

const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
const views = [];

function makeEnv() {
  const pm = new THREE.PMREMGenerator(R), s = new THREE.Scene();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ side: THREE.BackSide, color: new THREE.Color(0.30, 0.32, 0.35) }));
  box.scale.set(14, 9, 14); s.add(box);
  const panel = (w, h, x, y, z, k, col) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col || 0xffffff).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(5, 2.4, -2.6, 3.8, 2.8, 7.5);
  panel(2.4, 4, 6, 0.6, -1, 2.4, 0xcfe9ff);
  panel(9, 1.2, 0, -4.2, 0.5, 1.3, 0xfff0d2);
  panel(3, 3, 0.5, 1, -6, 1.8);
  const tex = pm.fromScene(s, 0.02).texture; pm.dispose(); return tex;
}
const env = makeEnv();

/* the ball: optic yellow with 40 holes cut through the outer shell. Through each one you see the white inside of the ball */
const HOLES = (() => { const out = [], g = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < 40; i++) { const y = 1 - (i + 0.5) / 40 * 2, r = Math.sqrt(1 - y * y), t = g * i; out.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r)); } return out; })();
const ballGeo = new THREE.SphereGeometry(1, 44, 30);
const INNER = lin('#FFFDF2');
function ballMat(extra) {
  const m = new THREE.MeshStandardMaterial(Object.assign({ color: lin('#D8EC26'), roughness: 0.55, metalness: 0, envMapIntensity: 0.85, side: THREE.DoubleSide }, extra || {}));
  m.alphaToCoverage = true;
  m.onBeforeCompile = sh => {
    sh.uniforms.uHoles = { value: HOLES };
    sh.uniforms.uCos = { value: Math.cos(0.118) };
    sh.uniforms.uInner = { value: INNER };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vON;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n\tvON = objectNormal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vON;\nuniform vec3 uHoles[40];\nuniform float uCos;\nuniform vec3 uInner;')
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        'vec3 bn = normalize(vON); float mx = -1.0;',
        'for (int i = 0; i < 40; i++) { mx = max(mx, dot(bn, uHoles[i])); }',
        'float aw = max(fwidth(mx), 0.00002);',
        'float cover = gl_FrontFacing ? 1.0 - smoothstep(uCos - aw, uCos + aw, mx) : 1.0;',
        'if (cover < 0.02) discard;',
        'diffuseColor.a = cover;',
        'float inside = gl_FrontFacing ? 0.0 : 1.0;',
        'float lip = smoothstep(uCos - 0.02, uCos, mx) * (1.0 - inside);',
        'float seam = (1.0 - smoothstep(0.004, 0.015, abs(bn.y))) * (1.0 - inside);',
        'diffuseColor.rgb = mix(diffuseColor.rgb * (1.0 - 0.08 * lip - 0.08 * seam), uInner, inside);'].join('\n'))
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n\troughnessFactor = mix(roughnessFactor, 0.9, inside);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += inside * uInner * 0.5;');
  };
  return m;
}
const radialTex = (inner, outer) => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
};
const shadowTex = radialTex('rgba(0,0,0,0.85)', 'rgba(0,0,0,0)');

/* ---------- the Abri mark, drawn on canvas the same way the SVG symbol draws it ---------- */
function drawMark(g, cx, cy, w) {
  const s = w / 660;
  g.save(); g.translate(cx, cy); g.scale(s, s); g.translate(-360, -365);
  const poly = (pts, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
  poly([178, 505, 542, 505, 620, 660, 100, 660], '#028FD6');
  poly([150.3, 560, 569.7, 560, 586.8, 594, 133.2, 594], '#AA442D');
  g.strokeStyle = '#1B242D'; g.lineCap = 'round'; g.lineJoin = 'round';
  const pl = (pts, wd) => { g.lineWidth = wd; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
  pl([60, 662, 360, 70, 660, 662], 46); pl([360, 70, 360, 465], 30); pl([160, 465, 560, 465], 38); pl([205, 380, 360, 270, 515, 380], 30);
  g.restore();
}

/* ---------- the paddle: extruded face with the Abri graphic, dark edge guard, wrapped grip ---------- */
const FACE = { L: -1, R: 1, T: 1.3, B: -1.3, throat: -1.64 };
function faceTexture() {
  const W = 800, H = 1176, c = document.createElement('canvas'); c.width = W; c.height = H;
  const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy());
  tex.repeat.set(1 / 2, 1 / 2.94); tex.offset.set(0.5, 1.64 / 2.94);
  const draw = () => {
    const g = c.getContext('2d'), X = x => (x + 1) / 2 * W, Y = y => (1.3 - y) / 2.94 * H, S = v => v / 2 * W;
    g.fillStyle = '#F2EEE7'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(27,36,45,0.05)'; g.lineWidth = 1.2;
    for (let i = -H; i < W + H; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H * 0.6, H); g.stroke(); }
    g.save(); g.translate(X(0), Y(-0.72)); g.rotate(-0.46);
    const band = (a, b, col) => { g.fillStyle = col; g.fillRect(-S(3), S(a), S(6), S(b - a)); };
    band(-0.3, -0.05, '#028FD6'); band(-0.05, 0.07, '#AA442D'); band(0.07, 0.3, '#028FD6');
    g.restore();
    drawMark(g, X(0), Y(0.56), S(0.98));
    g.fillStyle = '#1B242D'; g.font = '600 ' + Math.round(S(0.12)) + 'px Barlow, "Segoe UI", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const word = 'ABRI KORTE', sp = S(0.05); let tw = 0; for (const ch of word) tw += g.measureText(ch).width + sp; tw -= sp;
    let x = X(0) - tw / 2; g.textAlign = 'left';
    for (const ch of word) { g.fillText(ch, x, Y(-0.04)); x += g.measureText(ch).width + sp; }
    g.strokeStyle = 'rgba(27,36,45,0.55)'; g.lineWidth = S(0.012);
    tex.needsUpdate = true;
  };
  draw();
  if (document.fonts && document.fonts.load) document.fonts.load('600 40px Barlow').then(draw, () => {});
  return tex;
}
function gripTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#1D252C'; g.fillRect(0, 0, 256, 512);
  g.strokeStyle = '#2E3943'; g.lineWidth = 9;
  for (let y = -256; y < 768; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y + 90); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1.6); return t;
}
let faceTex = null, gripTex = null;
function buildPaddle() {
  if (!faceTex) { faceTex = faceTexture(); gripTex = gripTexture(); }
  const { L, R: Rr, T, B, throat } = FACE, rT = 0.62, rB = 0.42;
  const s = new THREE.Shape();
  s.moveTo(-0.27, throat);
  s.quadraticCurveTo(-0.3, B - 0.03, -0.64, B);
  s.lineTo(L + rB, B); s.quadraticCurveTo(L, B, L, B + rB);
  s.lineTo(L, T - rT); s.quadraticCurveTo(L, T, L + rT, T);
  s.lineTo(Rr - rT, T); s.quadraticCurveTo(Rr, T, Rr, T - rT);
  s.lineTo(Rr, B + rB); s.quadraticCurveTo(Rr, B, Rr - rB, B);
  s.lineTo(0.64, B); s.quadraticCurveTo(0.3, B - 0.03, 0.27, throat);
  s.lineTo(-0.27, throat);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 4, curveSegments: 28 });
  geo.translate(0, 0, -0.05);
  { const uv = geo.attributes.uv, pz = geo.attributes.position;
    for (const g of geo.groups) if (g.materialIndex === 0) for (let k = g.start; k < g.start + g.count; k++) if (pz.getZ(k) < -0.06) uv.setX(k, -uv.getX(k));
    uv.needsUpdate = true; }
  const faceMat = new THREE.MeshPhysicalMaterial({ map: faceTex, roughness: 0.42, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.32, envMapIntensity: 0.45 });
  faceMat.toneMapped = false;
  const edgeMat = new THREE.MeshStandardMaterial({ color: lin('#1B242D'), roughness: 0.5 });
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(geo, [faceMat, edgeMat]));
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.185, 1.36, 40), new THREE.MeshStandardMaterial({ map: gripTex, roughness: 0.82 }));
  grip.position.y = throat - 0.66; grp.add(grip);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.2, 0.09, 40), new THREE.MeshStandardMaterial({ color: lin('#028FD6'), roughness: 0.4 }));
  cap.position.y = throat - 1.38; grp.add(cap);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.08, 40), edgeMat);
  collar.position.y = throat + 0.01; grp.add(collar);
  return grp;
}

const progress = (r, H) => clamp((H - r.top) / (H + r.height), 0, 1);

/* ---------- hero: pickleballs rain onto the letters of ABRI KORTE (Matter.js 2D physics, three.js balls) ---------- */
function heroView() {
  const el = heroEl, M = window.Matter;
  const scene = new THREE.Scene(); scene.environment = env;
  const cam = new THREE.OrthographicCamera(0, 100, 0, -100, 1, 4000); cam.position.set(0, 0, 1500);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x203a55, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.35); key.position.set(-0.5, 0.9, 0.7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb3e0ff, 0.6); rim.position.set(0.8, -0.25, -0.6); scene.add(rim);
  const MAX = 150;
  const mesh = new THREE.InstancedMesh(ballGeo, ballMat(), MAX);
  mesh.count = 0; mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh);

  const st = { W: 0, H: 0, r: 20, balls: [], statics: [], queue: [], ready: false, acc: 0, t: 0, ptr: null };
  const engine = M ? M.Engine.create({ enableSleeping: true }) : null;
  if (engine) { engine.gravity.y = 1; engine.gravity.scale = 0.0013; engine.positionIterations = 8; engine.velocityIterations = 6; }
  const rnd = () => Math.random();
  const randQ = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6.283, rnd() * 6.283, rnd() * 6.283));

  function spawn(x, y, vx, vy) {
    if (!engine) return;
    if (st.balls.length >= MAX) { const old = st.balls.shift(); M.Composite.remove(engine.world, old.b); }
    const b = M.Bodies.circle(x, y, st.r, { restitution: 0.55, friction: 0.04, frictionStatic: 0.5, frictionAir: 0.006, density: 0.0016, slop: 0.03 });
    M.Body.setVelocity(b, { x: vx || 0, y: vy || 0 });
    M.Body.setAngularVelocity(b, (rnd() - 0.5) * 0.25);
    M.Composite.add(engine.world, b);
    st.balls.push({ b, q0: randQ() });
  }

  function colliders() {
    M.Composite.remove(engine.world, st.statics); st.statics = [];
    const hr = el.getBoundingClientRect(), W = st.W, H = st.H, t = 400;
    st.statics.push(M.Bodies.rectangle(W / 2, H + t / 2, W * 3, t, { isStatic: true, friction: 0.6 }));
    st.statics.push(M.Bodies.rectangle(-t / 2, -H, t, H * 5, { isStatic: true }));
    st.statics.push(M.Bodies.rectangle(W + t / 2, -H, t, H * 5, { isStatic: true }));
    const cw = Math.max(1, Math.ceil(W)), ch = Math.max(1, Math.ceil(H));
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
    for (const sp of $$('.hero-words .ch', el)) {
      const cs = getComputedStyle(sp);
      g.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      const m = g.measureText(sp.textContent), r = sp.getBoundingClientRect();
      const asc = m.fontBoundingBoxAscent != null ? m.fontBoundingBoxAscent : r.height * 0.8;
      g.fillText(sp.textContent, r.left - hr.left, r.top - hr.top + asc);
    }
    const data = g.getImageData(0, 0, cw, ch).data;
    const cell = Math.max(4, Math.round(st.r * 0.42)), gw = Math.ceil(cw / cell), gh = Math.ceil(ch / cell);
    const inside = new Uint8Array(gw * gh);
    const a = (x, y) => (x < 0 || y < 0 || x >= cw || y >= ch) ? 0 : data[(y * cw + x) * 4 + 3];
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      const x0 = gx * cell, y0 = gy * cell, q = cell / 4;
      let hit = 0;
      for (let sy = 1; sy < 4; sy++) for (let sx = 1; sx < 4; sx++) if (a(Math.round(x0 + sx * q), Math.round(y0 + sy * q)) > 110) hit++;
      if (hit >= 2) inside[gy * gw + gx] = 1;
    }
    const on = (x, y) => x >= 0 && y >= 0 && x < gw && y < gh && inside[y * gw + x];
    let n = 0;
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      if (!on(gx, gy)) continue;
      if (on(gx - 1, gy) && on(gx + 1, gy) && on(gx, gy - 1) && on(gx, gy + 1)) continue;
      st.statics.push(M.Bodies.circle(gx * cell + cell / 2, gy * cell + cell / 2, cell * 0.74, { isStatic: true, friction: 0.25, restitution: 0.4 }));
      n++;
    }
    st.glyphCells = n;
    for (const so of $$('[data-solid]', el)) {
      const anc = so.closest('[data-intro]'), dy = anc && G ? (parseFloat(G.getProperty(anc, 'y')) || 0) : 0;
      const r = so.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
      const x = r.left - hr.left + r.width / 2, y = r.top - hr.top - dy + r.height / 2;
      st.statics.push(so.dataset.solid === 'circle'
        ? M.Bodies.circle(x, y, r.width / 2, { isStatic: true, restitution: 0.6, friction: 0.2 })
        : M.Bodies.rectangle(x, y, r.width, r.height, { isStatic: true, friction: 0.3, chamfer: { radius: Math.min(10, r.height / 2) } }));
    }
    M.Composite.add(engine.world, st.statics);
  }

  function rebuild() {
    if (!engine) return;
    fitHero();
    const w1 = $('.w1', el); const hw = parseFloat(getComputedStyle(w1).fontSize) || 120;
    const r = clamp(Math.round(hw * 0.115), 11, 30);
    const changed = Math.abs(r - st.r) > 1 || !st.ready;
    st.r = r;
    colliders();
    if (changed) {
      st.balls.forEach(o => M.Composite.remove(engine.world, o.b)); st.balls = []; st.queue = []; st.t = 0;
      const n = clamp(Math.round(st.W / (2 * r) * 2.0), 24, 80);
      if (reduce) {
        for (let i = 0; i < n; i++) spawn(r + rnd() * (st.W - 2 * r), -rnd() * st.H * 0.9, 0, 0);
        for (let i = 0; i < 900; i++) M.Engine.update(engine, 1000 / 120);
      } else {
        for (let i = 0; i < n; i++) st.queue.push({ t: 0.35 + i * (2.5 / n) + rnd() * 0.06, x: r + rnd() * (st.W - 2 * r) });
      }
    } else {
      st.balls.forEach(o => { const p = o.b.position; M.Body.setPosition(o.b, { x: clamp(p.x, r, st.W - r), y: Math.min(p.y, st.H - r) }); M.Sleeping.set(o.b, false); });
    }
    st.ready = true;
  }

  let pendW = 0, pendH = 0, tmr = null, fontsOk = false;
  function onSize(W, H) {
    if (Math.abs(W - st.W) < 1 && Math.abs(H - st.H) < 1) return;
    const first = !st.W;
    st.W = W; st.H = H;
    cam.left = 0; cam.right = W; cam.top = 0; cam.bottom = -H; cam.updateProjectionMatrix();
    clearTimeout(tmr);
    if (fontsOk) tmr = setTimeout(rebuild, first ? 0 : 220);
  }
  const fontsReady = (document.fonts && document.fonts.load)
    ? Promise.race([Promise.all([document.fonts.load('500 100px Poppins'), document.fonts.load('300 100px Poppins'), document.fonts.ready]), new Promise(r => setTimeout(r, 2500))])
    : Promise.resolve();
  fontsReady.then(() => { fontsOk = true; if (st.W) rebuild(); }, () => { fontsOk = true; if (st.W) rebuild(); });

  /* pointer: a mouse sweeps balls aside, a click or tap drops a new one */
  el.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, now = performance.now();
    if (st.ptr) { const d = Math.max(8, now - st.ptr.time); st.ptr.vx = (x - st.ptr.x) / d * 16.67; st.ptr.vy = (y - st.ptr.y) / d * 16.67; }
    else st.ptr = { vx: 0, vy: 0 };
    st.ptr.x = x; st.ptr.y = y; st.ptr.time = now;
  });
  el.addEventListener('pointerleave', () => { st.ptr = null; });
  let down = null;
  el.addEventListener('pointerdown', e => { down = e.target.closest('a,button') ? null : { x: e.clientX, y: e.clientY, t: performance.now() }; });
  el.addEventListener('pointerup', e => {
    if (!down || reduce) { down = null; return; }
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), quick = performance.now() - down.t < 600; down = null;
    if (moved > 10 || !quick || !st.ready) return;
    const r = el.getBoundingClientRect();
    spawn(clamp(e.clientX - r.left, st.r, st.W - st.r), -st.r * 2, (rnd() - 0.5) * 2, 2);
  });

  function sweep() {
    const p = st.ptr; if (!p || performance.now() - p.time > 90) return;
    const sp = Math.hypot(p.vx, p.vy); if (sp < 1) return;
    const R2 = st.r * 4.5, k0 = Math.min(sp, 40) * 0.06;
    for (const o of st.balls) {
      const b = o.b, dx = b.position.x - p.x, dy = b.position.y - p.y, d = Math.hypot(dx, dy);
      if (d > R2 || d < 0.01) continue;
      const k = (1 - d / R2) * k0, v = M.Body.getVelocity(b);
      M.Sleeping.set(b, false);
      M.Body.setVelocity(b, { x: v.x + (dx / d * 1.2 + p.vx / sp * 0.8) * k, y: v.y + (dy / d * 1.2 + p.vy / sp * 0.8) * k - k * 0.4 });
    }
    p.vx *= 0.6; p.vy *= 0.6;
  }

  const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), qz = new THREE.Quaternion(), sc = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
  function update(dt, r) {
    onSize(r.width, r.height);
    if (!engine || !st.ready) return;
    st.t += dt;
    while (st.queue.length && st.queue[0].t <= st.t) { const it = st.queue.shift(); spawn(it.x, -st.r * (1.4 + rnd() * 2.5), (rnd() - 0.5) * 1.2, 1 + rnd() * 2); }
    if (!reduce || st.balls.some(o => !o.b.isSleeping)) {
      sweep();
      st.acc += dt * 1000; let n = 0; const h = 1000 / 120, vmax = st.r * 1.7;
      while (st.acc >= h && n < 8) {
        M.Engine.update(engine, h); st.acc -= h; n++;
        for (const o of st.balls) { const v = M.Body.getVelocity(o.b), s = Math.hypot(v.x, v.y); if (s > vmax) M.Body.setVelocity(o.b, { x: v.x / s * vmax, y: v.y / s * vmax }); }
      }
      if (n === 8) st.acc = 0;
    }
    const cnt = Math.min(st.balls.length, MAX);
    for (let i = 0; i < cnt; i++) {
      const o = st.balls[i], b = o.b;
      pos.set(b.position.x, -b.position.y, 0); qz.setFromAxisAngle(Z, -b.angle); q.multiplyQuaternions(qz, o.q0); sc.setScalar(st.r);
      m4.compose(pos, q, sc); mesh.setMatrixAt(i, m4);
    }
    mesh.count = cnt; mesh.instanceMatrix.needsUpdate = true;
  }
  st.ff = sec => { const h = 1000 / 120; for (let i = 0; i < sec * 120; i++) { st.t += h / 1000; while (st.queue.length && st.queue[0].t <= st.t) { const it = st.queue.shift(); spawn(it.x, -st.r * (1.4 + rnd() * 2.5), 0, 2); } M.Engine.update(engine, h); } };
  window.__abriHero = st;
  return { name: 'hero', el, scene, camera: cam, update };
}

/* ---------- court: the surface lies flat as you scroll in, the posts go up, the roof comes down, and two paddles rally ---------- */
const WAVES = [
  [1.7, 0.9, 0.11, 0.3, 0.21, 0], [-1.1, 2.3, 0.085, 1.9, -0.17, 0], [3.3, -1.4, 0.06, 4.1, 0.13, 0], [-2.9, -3.1, 0.05, 2.2, 0.0, 0],
  [5.1, 2.7, 0.038, 0.7, -0.11, 0], [-4.3, 5.9, 0.03, 5.3, 0.0, 0], [7.7, -6.1, 0.022, 3.4, 0.09, 0], [-9.3, -8.1, 0.016, 1.1, 0.0, 0],
  [2.6, -3.7, 0.05, 0.9, 0.05, 1], [-4.8, 1.9, 0.04, 2.4, -0.04, 1], [6.4, 4.4, 0.026, 1.7, 0.03, 1]];
const f = n => n.toFixed(4);
const WAVES_GLSL = 'float wv(vec2 p, float t){ float h = 0.0;\n' + WAVES.map(w => {
  const arg = 'dot(p, vec2(' + f(w[0]) + ',' + f(w[1]) + ')) + ' + f(w[3]) + ' + t * ' + f(w[4]);
  return w[5] ? '  h += ' + f(w[2]) + ' * (0.5 - abs(sin(' + arg + ')));' : '  h += ' + f(w[2]) + ' * sin(' + arg + ');';
}).join('\n') + '\n  return h; }';
const wvJS = (x, y, t) => { let h = 0; for (const w of WAVES) { const s = Math.sin(x * w[0] + y * w[1] + w[3] + t * w[4]); h += w[5] ? w[2] * (0.5 - Math.abs(s)) : w[2] * s; } return h; };

const CT = { hw: 1.0, hl: 2.2, sw: 1.3, sl: 2.5 };   // court and run-off half sizes; one unit is 10 ft
function courtTexture() {
  const PX = 400, W = Math.round(2 * CT.sw * PX), H = Math.round(2 * CT.sl * PX), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), X = x => (x + CT.sw) * PX, Y = y => (CT.sl - y) * PX;
  g.fillStyle = '#AA442D'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#028FD6'; g.fillRect(X(-CT.hw), Y(CT.hl), 2 * CT.hw * PX, 2 * CT.hl * PX);
  g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(X(-1), Y(0.7), 2 * PX, 1.4 * PX);
  for (let i = 0; i < 26000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.05)'; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  const line = (x1, y1, x2, y2, w, col) => { g.strokeStyle = col; g.lineWidth = w * PX; g.lineCap = 'square'; g.beginPath(); g.moveTo(X(x1), Y(y1)); g.lineTo(X(x2), Y(y2)); g.stroke(); };
  const box = (w, col) => { line(-1, -2.2, 1, -2.2, w, col); line(1, -2.2, 1, 2.2, w, col); line(1, 2.2, -1, 2.2, w, col); line(-1, 2.2, -1, -2.2, w, col); };
  const yl = '#F2B233', bw = 0.013;
  box(bw, yl); line(-0.85, -2.2, -0.85, 2.2, bw, yl); line(0.85, -2.2, 0.85, 2.2, bw, yl);
  line(-1, 0.65, 1, 0.65, bw, yl); line(-1, -0.65, 1, -0.65, bw, yl); line(-1, 1.95, 1, 1.95, bw, yl); line(-1, -1.95, 1, -1.95, bw, yl);
  line(0, 0.65, 0, 2.2, bw, yl); line(0, -0.65, 0, -2.2, bw, yl);
  const wl = '#F7F3EC', pw = 0.0167;
  box(pw, wl); line(-1, 0.7, 1, 0.7, pw, wl); line(-1, -0.7, 1, -0.7, pw, wl); line(0, 0.7, 0, 2.2, pw, wl); line(0, -0.7, 0, -2.2, pw, wl);
  const sh = g.createLinearGradient(0, Y(0) - 0.05 * PX, 0, Y(0) + 0.05 * PX);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.5, 'rgba(0,0,0,0.2)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh; g.fillRect(X(-1.12), Y(0) - 0.05 * PX, 2.24 * PX, 0.1 * PX);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy()); return t;
}
function netTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
  g.fillStyle = 'rgba(27,36,45,0.16)'; g.fillRect(0, 0, 32, 32);
  g.fillStyle = 'rgba(27,36,45,0.92)'; g.fillRect(0, 0, 32, 3); g.fillRect(0, 0, 3, 32);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(56, 7); t.anisotropy = 4; return t;
}
const UPY = new THREE.Vector3(0, 1, 0);
function beam(a, b, r, mat) {
  const d = new THREE.Vector3().subVectors(b, a), len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10, 1), mat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UPY, d.normalize());
  return m;
}

/* the shelter: four posts down each long side and a low gable roof on trusses, sheeted on both slopes */
const ROOF = { xp: 1.42, eave: 1.3, ridge: 1.86, over: 0.2, ys: [-2.25, -0.75, 0.75, 2.25], y0: -2.62, y1: 2.62 };
function roofFrames() {
  const mat = new THREE.MeshStandardMaterial({ color: lin('#1B242D'), roughness: 0.55, metalness: 0.1, envMapIntensity: 0.5 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const { xp: X, eave: E, ridge: Z, over: O, ys: YS, y0, y1 } = ROOF;
  const slope = (Z - E) / X, zAt = x => Z - slope * Math.abs(x), xo = X + O, zo = E - slope * O;
  const posts = new THREE.Group(), roof = new THREE.Group();
  for (const y of YS) for (const sx of [-1, 1]) posts.add(beam(V(sx * X, y, 0), V(sx * X, y, E), 0.034, mat));
  for (const sx of [-1, 1]) roof.add(beam(V(sx * X, y0, E), V(sx * X, y1, E), 0.024, mat));
  roof.add(beam(V(0, y0, Z), V(0, y1, Z), 0.022, mat));
  for (const y of YS) {
    roof.add(beam(V(-xo, y, zo), V(0, y, Z), 0.02, mat), beam(V(xo, y, zo), V(0, y, Z), 0.02, mat));
    roof.add(beam(V(-X, y, E), V(X, y, E), 0.016, mat));
    roof.add(beam(V(0, y, E), V(0, y, Z), 0.012, mat));
    for (const sx of [-1, 1]) {
      roof.add(beam(V(sx * X / 2, y, E), V(sx * X / 2, y, zAt(X / 2)), 0.011, mat));
      roof.add(beam(V(0, y, E), V(sx * X / 2, y, zAt(X / 2)), 0.011, mat));
    }
  }
  for (const sx of [-1, 1]) roof.add(beam(V(sx * X / 2, y0, zAt(X / 2)), V(sx * X / 2, y1, zAt(X / 2)), 0.012, mat));
  /* corrugated sheeting on both slopes, from the eave up to the ridge; the ribs run down the slope.
     The camera looks down through the near slope, so that sheet is see-through and the game stays in view */
  const c = document.createElement('canvas'); c.width = 4; c.height = 32; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 32);
  gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.5, '#A9A9A9'); gr.addColorStop(1, '#FFFFFF');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 32);
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 44); tex.encoding = THREE.sRGBEncoding;
  const run = xo, rise = Z - zo, len = Math.hypot(run, rise), tilt = Math.atan2(rise, run), lift = 0.035;
  const sheetMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
  sheetMat.toneMapped = false;
  const nearMat = sheetMat.clone();
  for (const [side, m] of [[-1, sheetMat], [1, nearMat]]) {      // -1 is the far slope, 1 the near one
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(len + 0.02, y1 - y0 + 0.08), m);
    sheet.rotation.set(0, side * tilt, 0);
    sheet.position.set(side * (run / 2 + Math.sin(tilt) * lift), 0, (zo + Z) / 2 + Math.cos(tilt) * lift);
    roof.add(sheet);
  }
  return { posts, roof, mat, sheet: sheetMat, near: nearMat };
}

function courtView() {
  const el = $('[data-view="court"]');
  const scene = new THREE.Scene(); scene.environment = env;
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5a3a30, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(-2, 6, 4); scene.add(key);
  const world = new THREE.Group(); world.rotation.x = -Math.PI / 2; scene.add(world);   // court space: x across, y along, z up

  const uni = { uAmt: { value: 1 }, uT: { value: 0 } };
  const mat = new THREE.MeshBasicMaterial({ map: courtTexture() });   // unlit, so the flat court shows the logo blue and red exactly
  mat.toneMapped = false;
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uAmt;\nuniform float uT;\nvarying float vShade;\n' + WAVES_GLSL +
        '\nfloat HH(vec2 p){ return uAmt * wv(p, uT); }\nvec2 BUN(vec2 p){ return p * (1.0 - 0.11 * uAmt) + uAmt * 0.05 * vec2(sin(p.y * 4.3 + 1.0), cos(p.x * 3.7 + 0.4)); }')
      .replace('#include <begin_vertex>', ['vec2 P0 = position.xy; float ee = 0.012;',
        'float h0 = HH(P0), hx = HH(P0 + vec2(ee, 0.0)), hy = HH(P0 + vec2(0.0, ee));',
        'vec3 nn = normalize(vec3(-(hx - h0) / ee, -(hy - h0) / ee, 1.0)); vec3 LL = normalize(vec3(-0.45, -0.7, 1.0));',
        'vShade = clamp(1.0 + 1.3 * (dot(nn, LL) - LL.z), 0.5, 1.25);',
        'vec3 transformed = vec3(BUN(P0), h0);'].join('\n'));
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vShade;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n\tdiffuseColor.rgb *= vShade;');
  };
  const seg = coarse ? [96, 184] : [140, 270];
  const court = new THREE.Mesh(new THREE.PlaneGeometry(2 * CT.sw, 2 * CT.sl, seg[0], seg[1]), mat);
  court.frustumCulled = false; world.add(court);

  const frame = roofFrames(), roof = frame.roof, posts = frame.posts; world.add(posts, roof);
  const paintRoof = () => {
    const d = isDark(); frame.mat.color.copy(lin(d ? '#C3CEDA' : '#1B242D'));
    frame.sheet.color.copy(lin(d ? '#5B7088' : '#3B4A58')); frame.sheet.opacity = 0.9;
    frame.near.color.copy(lin(d ? '#5B7088' : '#3B4A58')); frame.near.opacity = d ? 0.26 : 0.22;
  };
  paintRoof(); themeHooks.push(paintRoof);
  const net = new THREE.Group(), NH = 0.29;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.24, NH - 0.03), new THREE.MeshBasicMaterial({ map: netTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  mesh.rotation.x = Math.PI / 2; mesh.position.z = (NH - 0.03) / 2 + 0.01; net.add(mesh);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.012, 0.03), new THREE.MeshStandardMaterial({ color: lin('#F7F3EC'), roughness: 0.6 }));
  tape.position.z = NH - 0.015; net.add(tape);
  const postMat = new THREE.MeshStandardMaterial({ color: lin('#1B242D'), roughness: 0.5 });
  for (const x of [-1.13, 1.13]) { const pst = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, NH + 0.02, 12), postMat); pst.rotation.x = Math.PI / 2; pst.position.set(x, 0, (NH + 0.02) / 2); net.add(pst); }
  world.add(net);

  /* two players: a paddle each, held at the grip, and a soft shadow under it */
  const PS = 0.16, HAND = 0.2, FACE = 2.3 * PS;
  const players = [-1, 1].map(side => {
    const pivot = new THREE.Group(), base = new THREE.Group(), pad = buildPaddle();
    pad.scale.setScalar(PS); pad.position.y = 2.3 * PS; base.rotation.x = Math.PI / 2; base.add(pad); pivot.add(base);
    const shd = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.44), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.32 }));
    world.add(pivot, shd);
    return { side, pivot, shd, x: side * -0.25, tx: side * -0.25, y: side * 1.85, ty: side * 1.85, q: new THREE.Quaternion() };
  });
  const BR = 0.066, ball = new THREE.Mesh(ballGeo, ballMat()); ball.scale.setScalar(BR); world.add(ball);
  const bsh = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.45 })); world.add(bsh);

  const contact = (pl, out) => out.set(pl.x, pl.y - pl.side * 0.09, HAND + FACE);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), Bn = new THREE.Vector3(), P = new THREE.Vector3();
  const shot = { from: 0, t: 0, dur: 1.15, sb: 0.72 };
  function newShot(from) {
    const hit = players[from], rec = players[1 - from];
    shot.from = from; shot.t = 0; shot.dur = 1.0 + Math.random() * 0.35;
    rec.tx = (Math.random() * 2 - 1) * 0.55; rec.ty = rec.side * (1.75 + Math.random() * 0.2);
    contact(hit, A);
    Bn.set(rec.tx * 0.9, A.y + (rec.ty - A.y) * shot.sb, BR);
  }
  newShot(0);
  const swingAt = u => {
    if (u < -0.5 || u > 0.75) return 0;
    if (u < -0.12) return -smooth(-0.5, -0.12, u);
    if (u < 0.12) return -1 + 1.8 * smooth(-0.12, 0.12, u);
    return 0.8 * (1 - smooth(0.12, 0.75, u));
  };
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), ZA = new THREE.Vector3(0, 0, 1), XA = new THREE.Vector3(1, 0, 0);
  function pose(pl, u, k) {
    const a = swingAt(u);
    qa.setFromAxisAngle(ZA, pl.side * (0.18 + 0.85 * a)); qb.setFromAxisAngle(XA, pl.side * (0.1 - 0.42 * a));
    pl.pivot.quaternion.multiplyQuaternions(qa, qb);
    pl.pivot.position.set(pl.x, pl.y, HAND);
    pl.pivot.scale.setScalar(Math.max(0.001, k));
    pl.shd.position.set(pl.x + 0.05, pl.y, 0.004); pl.shd.material.opacity = 0.3 * k;
  }

  /* points that outline the scene, in three.js space (court x, court z up, minus court y) */
  const hull = [], xo = ROOF.xp + ROOF.over, zo = ROOF.eave - (ROOF.ridge - ROOF.eave) / ROOF.xp * ROOF.over;
  for (const y of [ROOF.y0, ROOF.y1]) hull.push(new THREE.Vector3(-xo, zo, -y), new THREE.Vector3(xo, zo, -y), new THREE.Vector3(0, ROOF.ridge, -y));
  for (const y of [ROOF.ys[0], ROOF.ys[ROOF.ys.length - 1]]) for (const x of [-ROOF.xp, ROOF.xp]) hull.push(new THREE.Vector3(x, 0, -y));
  for (const x of [-CT.sw, CT.sw]) for (const y of [-CT.sl, CT.sl]) hull.push(new THREE.Vector3(x, 0, -y));
  const camTarget = new THREE.Vector3(0, 0.62, -0.15), camDir = new THREE.Vector3(3.3, 3.0, 4.7).normalize(), pv = new THREE.Vector3();
  let fitAspect = 0;
  function fitCam(aspect) {
    fitAspect = aspect; cam.aspect = aspect;
    let lo = 2, hi = 60;
    for (let i = 0; i < 24; i++) {
      const dd = (lo + hi) / 2;
      cam.position.copy(camTarget).addScaledVector(camDir, dd); cam.lookAt(camTarget); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      let ok = true;
      for (const c of hull) { pv.copy(c).project(cam); if (Math.abs(pv.x) > 0.95 || Math.abs(pv.y) > 0.93) { ok = false; break; } }
      if (ok) hi = dd; else lo = dd;
    }
    cam.position.copy(camTarget).addScaledVector(camDir, hi); cam.lookAt(camTarget); cam.updateProjectionMatrix();
  }
  let amt = reduce ? 0 : 1, rise = reduce ? 1 : 0, cover = reduce ? 1 : 0, play = reduce ? 1 : 0;
  function update(dt, r, p) {
    const aspect = r.width / r.height;
    if (Math.abs(aspect - fitAspect) > 0.002) fitCam(aspect);
    amt = reduce ? 0 : damp(amt, 1 - smooth(0.06, 0.36, p), 4, dt);
    rise = reduce ? 1 : damp(rise, smooth(0.2, 0.34, p), 5, dt);
    cover = reduce ? 1 : damp(cover, smooth(0.3, 0.46, p), 5, dt);
    play = reduce ? 1 : damp(play, smooth(0.34, 0.48, p), 6, dt);
    if (amt > 0.002) uni.uT.value += dt * 0.55;
    uni.uAmt.value = amt;
    posts.scale.set(1, 1, Math.max(0.001, rise)); posts.visible = rise > 0.02;      // the posts go up
    roof.position.z = (1 - cover) * (1 - cover) * 3.2; roof.visible = cover > 0.02;  // then the roof comes down onto them
    net.scale.set(1, 1, Math.max(0.001, rise)); net.visible = rise > 0.01;

    if (!reduce && play > 0.6) shot.t += dt;
    if (shot.t >= shot.dur) newShot(1 - shot.from);
    const hit = players[shot.from], rec = players[1 - shot.from];
    for (const pl of players) { pl.x = damp(pl.x, pl.tx, 3.4, dt); pl.y = damp(pl.y, pl.ty, 3.4, dt); }
    contact(rec, B);
    const s = clamp(shot.t / shot.dur, 0, 1);
    if (s < shot.sb) {
      const q = s / shot.sb;
      P.lerpVectors(A, Bn, q); P.z = A.z + (Bn.z - A.z) * q + 4 * 0.5 * q * (1 - q);
    } else {
      const q = (s - shot.sb) / (1 - shot.sb);
      P.lerpVectors(Bn, B, q); P.z = Bn.z + (B.z - Bn.z) * q + 4 * 0.2 * q * (1 - q);
    }
    if (reduce) P.set(0.15, -0.6, 0.62);
    ball.position.copy(P); ball.rotation.x += dt * 9 * (hit.side > 0 ? 1 : -1); ball.rotation.z += dt * 2.5;
    ball.scale.setScalar(BR * Math.max(0.001, play)); ball.visible = play > 0.02;
    bsh.position.set(P.x + 0.04, P.y, 0.005); bsh.scale.setScalar(0.8 + P.z * 0.9); bsh.material.opacity = 0.45 * play / (1 + P.z * 2.2); bsh.visible = ball.visible;
    pose(hit, reduce ? 0.3 : shot.t, play); pose(rec, reduce ? -0.3 : shot.t - shot.dur, play);
    players.forEach(pl => { pl.pivot.visible = play > 0.02; pl.shd.visible = pl.pivot.visible; });
  }
  window.__abriCourt = { players, shot, sheet: frame.sheet, near: frame.near, get amt() { return amt; }, get play() { return play; } };
  return { name: 'court', el, scene, camera: cam, update };
}

/* ---------- gear: a ball balancing on a paddle; scroll nudges the target, the paddle keeps it on ---------- */
function gearView() {
  const el = $('[data-view="paddle"]');
  const scene = new THREE.Scene(); scene.environment = env;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5a2618, 0.34));
  const key = new THREE.DirectionalLight(0xffffff, 0.62); key.position.set(-3, 6, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35); rim.position.set(4, 2, -4); scene.add(rim);
  const space = $('.gear-space');
  const yawG = new THREE.Group(), base = new THREE.Group(), paddle = buildPaddle();
  base.rotation.x = -Math.PI / 2; base.add(paddle); yawG.add(base); scene.add(yawG);
  const BR = 0.37, TOP = 0.085;
  const ball = new THREE.Mesh(ballGeo, ballMat()); ball.scale.setScalar(BR); scene.add(ball);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.28 }));
  shadow.rotation.x = -Math.PI / 2; shadow.rotation.z = -1.12; shadow.position.y = -1.05; scene.add(shadow);
  const s = { u: 0.02, v: -0.3, vu: 0, vv: 0, al: 0, be: 0, t: 0 };
  const qW = new THREE.Quaternion(), qI = new THREE.Quaternion(), gL = new THREE.Vector3(), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  const qBall = new THREE.Quaternion(), dq = new THREE.Quaternion(), ax = new THREE.Vector3(), tmp = new THREE.Vector3();
  const XA = new THREE.Vector3(1, 0, 0), YA = new THREE.Vector3(0, 1, 0), GRAV = 7.5;
  function update(dt, r, p) {
    const aspect = r.width / r.height, sr = space.getBoundingClientRect();
    const frac = clamp(sr.height / r.height, 0.2, 1), oy = sr.top + sr.height / 2 - r.top - r.height / 2;
    const tf = Math.tan(THREE.MathUtils.degToRad(15));
    const dist = Math.max(2.9 / (2 * tf * frac), 4.2 / (2 * tf * aspect));
    cam.aspect = aspect; cam.setViewOffset(r.width, r.height, 0, -oy, r.width, r.height);
    cam.position.set(0, dist * 0.6, dist * 0.8); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    if (!reduce) {
      s.t += dt;
      const tu = 0.3 * Math.sin(p * 9 + s.t * 0.35), tv = -0.3 + 0.13 * Math.sin(p * 6 + 1.1 + s.t * 0.27);
      const du = 7 * (tu - s.u) - 4.2 * s.vu, dv = 7 * (tv - s.v) - 4.2 * s.vv;
      s.al = damp(s.al, Math.asin(clamp(du * 1.4 / GRAV, -0.3, 0.3)), 9, dt);
      s.be = damp(s.be, -Math.asin(clamp(dv * 1.4 / GRAV, -0.3, 0.3)), 9, dt);
      yawG.rotation.y = 1.12 + (p - 0.5) * 0.5 + Math.sin(s.t * 0.4) * 0.04;
      yawG.position.y = Math.sin(s.t * 1.1) * 0.03;
    } else { yawG.rotation.y = 1.12; s.v = -0.3; }
    qa.setFromAxisAngle(YA, s.al); qb.setFromAxisAngle(XA, s.be); paddle.quaternion.multiplyQuaternions(qa, qb);
    scene.updateMatrixWorld(true);
    if (!reduce) {
      const steps = 4, h = Math.min(dt, 0.05) / steps;
      paddle.getWorldQuaternion(qW); qI.copy(qW).invert();
      gL.set(0, -GRAV, 0).applyQuaternion(qI);
      for (let i = 0; i < steps; i++) {
        s.vu += (gL.x * 5 / 7 - s.vu * 0.7) * h; s.vv += (gL.y * 5 / 7 - s.vv * 0.7) * h;
        s.u += s.vu * h; s.v += s.vv * h;
        const ex = s.u / 0.7, ey = s.v / 0.95, e2 = ex * ex + ey * ey;
        if (e2 > 1) { const k = 1 / Math.sqrt(e2); s.u *= k; s.v *= k; s.vu *= -0.3; s.vv *= -0.3; }
        const sp = Math.hypot(s.vu, s.vv);
        if (sp > 1e-5) { ax.set(-s.vv / sp, s.vu / sp, 0); dq.setFromAxisAngle(ax, sp * h / BR); qBall.premultiply(dq); }
      }
    }
    tmp.set(s.u, s.v, TOP + BR); paddle.localToWorld(tmp); ball.position.copy(tmp);
    paddle.getWorldQuaternion(qW); ball.quaternion.multiplyQuaternions(qW, qBall);
  }
  return { name: 'paddle', el, scene, camera: cam, update };
}

/* ---------- rates: a ball with a ring of spray turning around it ---------- */
function ringView() {
  const el = $('[data-view="ring"]');
  const scene = new THREE.Scene(); scene.environment = env;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100); cam.position.set(0, 0.3, 9); cam.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0x8fa6bb, 0x000000, 0.12));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-3, 3.2, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x5fb8ff, 2.4); rim.position.set(3.5, 1.2, -3); scene.add(rim);
  const grp = new THREE.Group(); scene.add(grp);
  const ball = new THREE.Mesh(ballGeo, ballMat({ envMapIntensity: 0.4 })); ball.rotation.x = 0.4; grp.add(ball);
  const N = coarse ? 2000 : 3600, data = new Float32Array(N * 4), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 1.3 + Math.pow(Math.random(), 1.7) * 2.4, gs = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    data[i * 4] = r; data[i * 4 + 1] = Math.random() * Math.PI * 2; data[i * 4 + 2] = gs * 0.05 * (0.4 + (r - 1.3) * 0.5); data[i * 4 + 3] = 0.9 / Math.pow(r, 1.4) * (0.75 + Math.random() * 0.5);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aData', new THREE.BufferAttribute(data, 4));
  const uni = { uT: { value: 0 }, uPR: { value: R.getPixelRatio() }, uSize: { value: coarse ? 30 : 34 }, uColor: { value: new THREE.Color(0.62, 0.86, 1.0) } };
  const pmat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute vec4 aData; uniform float uT; uniform float uPR; uniform float uSize; varying float vA;\n' +
      'void main(){ float a = aData.y + uT * aData.w; vec3 p = vec3(cos(a) * aData.x, aData.z, sin(a) * aData.x);\n' +
      ' vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;\n' +
      ' float k = fract(aData.y * 13.7); gl_PointSize = uSize * uPR * (0.25 + 0.75 * k * k) / -mv.z;\n' +
      ' vA = (0.35 + 0.65 * smoothstep(3.8, 1.35, aData.x)) * (0.5 + 0.5 * k); }',
    fragmentShader: 'uniform vec3 uColor; varying float vA;\n' +
      'void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA; gl_FragColor = vec4(uColor * a, a); }'
  });
  const ring = new THREE.Points(geo, pmat); ring.frustumCulled = false;
  const ringG = new THREE.Group(); ringG.rotation.set(0.3, 0, -0.17); ringG.add(ring); grp.add(ringG);
  function update(dt, r) {
    const aspect = r.width / r.height; cam.aspect = aspect; cam.updateProjectionMatrix();
    const halfH = Math.tan(THREE.MathUtils.degToRad(15)) * 9, halfW = halfH * aspect;
    if (innerWidth >= 900) { grp.position.set(halfW * 0.44, 0.12, 0); grp.scale.setScalar(Math.min(1, halfW * 0.5 / 3.6)); }
    else { grp.position.set(0, 0, 0); grp.scale.setScalar(Math.min(0.9, halfH * 0.95 / 1.25)); }
    uni.uPR.value = R.getPixelRatio();
    if (!reduce) { uni.uT.value += dt; ball.rotation.y += dt * 0.35; }
  }
  return { name: 'ring', el, scene, camera: cam, update };
}

/* ---------- events: the paddle turns as you scroll, like a product on a turntable ---------- */
function turnView() {
  const el = $('[data-view="turn"]');
  const scene = new THREE.Scene(); scene.environment = env;
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.34));
  const key = new THREE.DirectionalLight(0xffffff, 0.74); key.position.set(-3, 4, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfefff, 0.3); fill.position.set(4, 1, -3); scene.add(fill);
  const grp = new THREE.Group(), paddle = buildPaddle(); paddle.position.y = 0.88; grp.add(paddle); grp.rotation.x = 0.08; scene.add(grp);
  const ball = new THREE.Mesh(ballGeo, ballMat()); ball.scale.setScalar(0.37); scene.add(ball);
  let t = 0;
  function update(dt, r, p) {
    const aspect = r.width / r.height; cam.aspect = aspect;
    const tf = Math.tan(THREE.MathUtils.degToRad(14)), d = Math.max(2.75 / tf, 1.7 / (tf * aspect));
    cam.position.set(0, 0.2, d); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    if (!reduce) t += dt;
    grp.rotation.y = reduce ? 0.5 : p * Math.PI * 2.4 + t * 0.12;
    const a = reduce ? 0.8 : t * 0.9 + p * 4;
    ball.position.set(Math.cos(a) * 1.75, 0.95 + Math.sin(a * 0.7) * 0.25, Math.sin(a) * 1.75);
    ball.rotation.set(a * 1.3, a * 0.7, 0);
  }
  return { name: 'turn', el, scene, camera: cam, update };
}

/* ---------- how: a player about to hit the ball, rebuilt from points of light that drift in and gather as you scroll ---------- */
function cloudView() {
  const el = $('[data-view="cloud"]');
  if (!el || !el.dataset.photo || !el.dataset.depth) return null;
  const scene = new THREE.Scene();
  const FOV = 30, cam = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  const grp = new THREE.Group(); scene.add(grp);
  const uni = { uT: { value: 0 }, uA: { value: reduce ? 1 : 0 }, uPR: { value: R.getPixelRatio() }, uSize: { value: 2 }, uDist: { value: 7 }, uFloor: { value: -0.5 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false,
    vertexShader: [
      'attribute vec3 aCol; attribute vec4 aRnd;',
      'uniform float uT; uniform float uA; uniform float uPR; uniform float uSize; uniform float uDist; uniform float uFloor;',
      'varying vec3 vC; varying float vA;',
      'vec3 sph(float a, float b){ float th = a * 6.2831853, z = b * 2.0 - 1.0, r = sqrt(max(0.0, 1.0 - z * z)); return vec3(r * cos(th), z, r * sin(th)); }',
      'void main(){',
      '  float k = clamp(uA * 1.5 - aRnd.x * 0.5, 0.0, 1.0); k = k * k * (3.0 - 2.0 * k);',
      '  vec3 from = position * vec3(1.35, 1.6, 1.0) + sph(aRnd.z, aRnd.w) * (1.2 + 2.6 * aRnd.y) + vec3(0.6, 0.25, 1.4);',
      '  vec3 p = mix(from, position, k);',
      '  float ph = aRnd.y * 6.2831853;',
      '  p += vec3(sin(uT * 0.8 + ph), cos(uT * 0.65 + ph * 1.7), sin(uT * 0.5 + ph * 0.6)) * (0.004 + 0.02 * (1.0 - k));',
      '  float low = smoothstep(uFloor, uFloor - 0.3, position.y) * step(0.4, aRnd.x);',
      '  float cyc = fract(uT * (0.05 + 0.07 * aRnd.w) + aRnd.z);',
      '  p += low * k * cyc * vec3((aRnd.z - 0.5) * 1.2, -0.12 - 0.5 * aRnd.w, (aRnd.w - 0.5) * 1.0);',
      '  float loose = step(0.965, aRnd.y);',
      '  p += loose * k * vec3(sin(ph * 3.1 + uT * 0.3), cos(ph * 2.3 + uT * 0.25), sin(ph * 1.7)) * 0.06;',
      '  vA = (1.0 - low * smoothstep(0.15, 1.0, cyc)) * (0.15 + 0.85 * k);',
      '  vC = aCol * (0.82 + 0.18 * sin(uT * (1.1 + aRnd.w * 2.4) + ph * 3.0));',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  gl_Position = projectionMatrix * mv;',
      '  gl_PointSize = max(1.0, uSize * uPR * (0.7 + 0.6 * aRnd.w) * (uDist / -mv.z) * (1.0 + 0.8 * (1.0 - k)));',
      '}'].join('\n'),
    fragmentShader: [
      'varying vec3 vC; varying float vA;',
      'void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC, smoothstep(0.5, 0.2, d) * vA); }'].join('\n')
  });
  const st = { ready: false, n: 0, SW: 3.3, H: 4.2, step: 0.01, yaw: 0, pitch: 0, t: 0 };
  const load = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  Promise.all([load(el.dataset.photo), load(el.dataset.depth)]).then(([ph, dp]) => {
    const W = ph.naturalWidth, H = ph.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(ph, 0, 0, W, H); const C = g.getImageData(0, 0, W, H).data;
    g.clearRect(0, 0, W, H); g.drawImage(dp, 0, 0, W, H); const D = g.getImageData(0, 0, W, H).data;
    let x0 = W, x1 = 0, y0 = H, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (D[(y * W + x) * 4 + 1] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const step = coarse || innerWidth < 900 ? 1.05 : 0.72, sc = st.H / Math.max(1, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const pos = [], col = [], rnd = [];
    for (let gy = y0; gy <= y1; gy += step) for (let gx = x0; gx <= x1; gx += step) {
      const x = clamp(Math.round(gx + (Math.random() - 0.5) * step), 0, W - 1), y = clamp(Math.round(gy + (Math.random() - 0.5) * step), 0, H - 1);
      const i = (y * W + x) * 4, m = D[i + 1] / 255;
      if (m < 0.06 || Math.random() > m) continue;
      pos.push((x - cx) * sc, -(y - cy) * sc, (D[i] / 255 - 0.5) * 1.1);
      let r = Math.pow(C[i] / 255, 0.7), gg = Math.pow(C[i + 1] / 255, 0.7), b = Math.pow(C[i + 2] / 255, 0.7);
      const L = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      r = L + (r - L) * 1.2; gg = L + (gg - L) * 1.2; b = L + (b - L) * 1.2;
      const glint = Math.random() < 0.04 ? 0.55 : 0;
      r = r * 1.14 + 0.02; gg = gg * 1.14 + 0.035; b = b * 1.14 + 0.07;
      col.push(clamp(r + (1 - r) * glint, 0, 1), clamp(gg + (1 - gg) * glint, 0, 1), clamp(b + (1 - b) * glint, 0, 1));
      rnd.push(Math.random(), Math.random(), Math.random(), Math.random());
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('aRnd', new THREE.Float32BufferAttribute(rnd, 4));
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; grp.add(pts);
    st.n = pos.length / 3; st.SW = (x1 - x0) * sc; st.step = step * sc; uni.uFloor.value = -st.H / 2 + st.H * 0.1;
    st.ready = true;
  }).catch(e => { console.warn('[abri] cloud', e); if (howEl) howEl.classList.add('cloud-off'); });

  function update(dt, r, p) {
    if (!st.ready) return;
    const aspect = r.width / r.height, tf = Math.tan(THREE.MathUtils.degToRad(FOV / 2)), wide = innerWidth >= 900;
    const D = Math.max(st.SW / (0.9 * 2 * tf * aspect), st.H / ((wide ? 0.82 : 0.86) * 2 * tf));
    const lift = wide ? 0.03 * 2 * tf * D : 0;
    cam.aspect = aspect; cam.position.set(0, lift, D); cam.lookAt(0, lift, 0); cam.updateProjectionMatrix();
    uni.uDist.value = D; uni.uPR.value = R.getPixelRatio();
    uni.uSize.value = st.step * (r.height / (2 * tf * D)) * 1.3;
    st.t += dt;
    const tx = howPtr.on ? howPtr.x * 0.3 : (reduce ? 0 : Math.sin(st.t * 0.32) * 0.14), ty = howPtr.on ? howPtr.y * 0.1 : 0;
    st.yaw = damp(st.yaw, tx, 2.4, dt); st.pitch = damp(st.pitch, ty, 2.4, dt);
    grp.rotation.set(st.pitch, st.yaw, 0);
    uni.uA.value = reduce ? 1 : damp(uni.uA.value, smooth(0.08, 0.4, p), 2.2, dt);
    if (!reduce) uni.uT.value += dt;
  }
  window.__abriCloud = st;
  return { name: 'cloud', el, scene, camera: cam, update };
}

[heroView, courtView, gearView, ringView, turnView, cloudView].forEach(fn => { try { const v = fn(); if (v && v.el) views.push(v); } catch (e) { console.error('[abri] view failed', e); } });

/* ---------- the loop: each visible section gets its own viewport and scissor box ---------- */
let cw = 0, ch = 0, slow = 0, frames = 0, drewLast = true;
function frame(time, deltaMs) {
  if (!R) return;
  const dt = window.__abriDt || clamp((deltaMs || 16.7) / 1000, 0.001, 0.05);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (w !== cw || h !== ch) { cw = w; ch = h; R.setSize(w, h, false); drewLast = true; }
  const rects = views.map(v => v.el.getBoundingClientRect());
  const any = rects.some(r => r.bottom > 0 && r.top < ch && r.width > 2 && r.height > 2);
  if (!any && !drewLast) return;
  R.setScissorTest(false); R.clear(true, true, true); R.setScissorTest(true);
  drewLast = any;
  views.forEach((v, i) => { v.vis = false; });
  for (let i = 0; i < views.length; i++) {
    const v = views[i], r = rects[i];
    v.vis = r.bottom > 0 && r.top < ch && r.width > 2 && r.height > 2;
    if (!v.vis) continue;
    v.update(dt, r, progress(r, ch));
    const y = ch - r.bottom;
    R.setViewport(r.left, y, r.width, r.height); R.setScissor(r.left, y, r.width, r.height);
    R.clear(false, true, false);
    R.render(v.scene, v.camera);
  }
  frames++;
  if (deltaMs > 34) slow++;
  if (frames === 150) { if (slow > 60 && R.getPixelRatio() > 1) { R.setPixelRatio(Math.max(1, R.getPixelRatio() - 0.5)); cw = 0; } frames = 0; slow = 0; }
}
if (G) G.ticker.add(frame);
else { let last = performance.now(); const loop = now => { frame(now, now - last); last = now; requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
window.__abri = { views: () => views.map(v => v.name + ':' + (v.vis ? 'on' : 'off')), hero: () => window.__abriHero };
})();

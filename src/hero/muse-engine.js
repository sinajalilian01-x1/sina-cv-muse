/* eslint-disable */
// Muse Swarm — shared live-studio engine (Three.js). Procedural room + 4 robots + scripted loop.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
export { THREE };

// ---------------------------------------------------------------- utils
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));

// ---------------------------------------------------------------- kit
export function makeKit(lowpoly = false) {
  const cache = new Map();
  const mat = (color, o = {}) => {
    const k = String(color) + JSON.stringify(o);
    if (cache.has(k)) return cache.get(k);
    const m = new THREE.MeshStandardMaterial({
      color, roughness: o.rough ?? (lowpoly ? 0.78 : 0.42), metalness: o.metal ?? 0,
      flatShading: lowpoly, emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
      transparent: o.opacity != null, opacity: o.opacity ?? 1, map: o.map ?? null, side: o.side ?? THREE.FrontSide,
    });
    if (o.map) m.map.colorSpace = THREE.SRGBColorSpace;
    cache.set(k, m); return m;
  };
  const mesh = (g, m, cast = true) => { const x = new THREE.Mesh(g, m); x.castShadow = cast; x.receiveShadow = true; return x; };
  const rbox = (w, h, d, r, m) => mesh(new RoundedBoxGeometry(w, h, d, lowpoly ? 1 : 4, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), m);
  const box = (w, h, d, m) => mesh(new THREE.BoxGeometry(w, h, d), m);
  const sphere = (r, m) => mesh(lowpoly ? new THREE.IcosahedronGeometry(r, 1) : new THREE.SphereGeometry(r, 32, 20), m);
  const cyl = (rt, rb, h, m, seg) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg ?? (lowpoly ? 7 : 32)), m);
  const capsule = (r, len, m) => mesh(new THREE.CapsuleGeometry(r, len, lowpoly ? 2 : 6, lowpoly ? 7 : 18), m);
  const plane = (w, h, m) => mesh(new THREE.PlaneGeometry(w, h), m, false);
  const at = (o, x = 0, y = 0, z = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
  const group = (...c) => { const g = new THREE.Group(); c.forEach((x) => g.add(x)); return g; };
  function plant(potColor, leafColor, s = 1, seed = 3, kind = 'leafy') {
    const r = rng(seed); const g = new THREE.Group();
    const pot = lowpoly ? cyl(0.2, 0.15, 0.3, mat(potColor), 6) : rbox(0.38, 0.32, 0.38, 0.1, mat(potColor));
    pot.position.y = 0.16; g.add(pot);
    const soil = cyl(0.16, 0.16, 0.02, mat('#6b4a36')); soil.position.y = 0.32; g.add(soil);
    const n = kind === 'tall' ? 11 : 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.5; const tilt = 0.25 + r() * 0.55;
      let leaf;
      if (lowpoly || kind === 'spiky') { leaf = mesh(new THREE.ConeGeometry(0.07, 0.55 + r() * 0.25, 4), mat(leafColor)); leaf.geometry.translate(0, 0.3, 0); }
      else { leaf = sphere(0.1, mat(leafColor, { rough: 0.6 })); leaf.scale.set(0.9, kind === 'tall' ? 3.4 : 2.6, 0.35); leaf.geometry = leaf.geometry.clone().translate(0, 0.1, 0); }
      leaf.position.y = 0.32; leaf.rotation.set(0, a, tilt, 'YXZ'); leaf.rotation.order = 'YXZ'; leaf.rotation.x = 0; leaf.rotation.z = tilt;
      const p = new THREE.Group(); p.rotation.y = a; leaf.rotation.set(0, 0, tilt); p.add(leaf); p.position.y = 0; g.add(p);
    }
    g.scale.setScalar(s); return g;
  }
  return { lowpoly, mat, mesh, rbox, box, sphere, cyl, capsule, plane, at, group, plant };
}

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// ---------------------------------------------------------------- artworks
export const THEMES = [
  { name: 'Ocean Sunset', trend: 'Ocean sunsets are trending', ask: 'Ocean sunsets?', kind: 'sea', sky: ['#FF9E7A', '#FFC48C', '#FFE3B3'], sun: '#FFF6DA', layers: ['#4C7FB5', '#35659A', '#22497A'], hint: 'Go warm on the sky', reply: 'Way ahead of you', feedback: 'More contrast', score: '8.7', price: 3 },
  { name: 'Desert Dunes', trend: 'Desert dunes are blowing up', ask: 'Desert dunes next?', kind: 'dunes', sky: ['#7EC8E3', '#B9E3EE', '#E9F6F2'], sun: '#FFF9E8', layers: ['#F6CF95', '#EBAA68', '#D9844C', '#B9653A'], hint: 'Keep the shadows soft', reply: 'Soft like sand', feedback: 'Love the light', score: '9.1', price: 3.4 },
  { name: 'Alpine Dawn', trend: 'Mountain dawns are hot today', ask: 'Alpine dawn?', kind: 'peaks', sky: ['#FFB8A0', '#FFD3BC', '#FFF0E0'], sun: '#FFFFFF', layers: ['#A9C2E0', '#7C9DC8', '#4E73A6', '#2E4F7E'], hint: 'Pink light on the snow', reply: 'Adding a glow', feedback: 'Sharper peaks', score: '8.4', price: 2.8 },
  { name: 'Cozy Autumn', trend: 'Cozy autumn is everywhere', ask: 'Something cozy?', kind: 'hills', sky: ['#F7C98B', '#FADDB0', '#FDF0D8'], sun: '#FFF7E6', layers: ['#E9A960', '#CF7B3E', '#A9572C', '#7A3F22'], trees: '#C2492C', hint: 'Add a few trees', reply: 'Planting them now', feedback: 'So cozy', score: '9.3', price: 3.6 },
  { name: 'Mint Lagoon', trend: 'Calm lagoons are trending', ask: 'Mint lagoon?', kind: 'sea', sky: ['#9FE3CF', '#C9F2E4', '#F1FFF8'], sun: '#FFFDF0', layers: ['#4DC2B4', '#2F9F95', '#1C7772'], hint: 'Calm water please', reply: 'Glassy and calm', feedback: 'Brighter sun', score: '8.9', price: 3.1 },
  { name: 'Lemon Grove', trend: 'Citrus vibes are popping', ask: 'Lemon grove?', kind: 'hills', sky: ['#FFE07A', '#FFEFB0', '#FFF9E0'], sun: '#FFFFFF', layers: ['#A6D277', '#7CB653', '#56913B', '#3A6A2A'], trees: '#F5C431', hint: 'Lots of lemons', reply: 'Squeezing them in', feedback: 'Fresh palette', score: '8.8', price: 2.9 },
];

export function paintArt(ctx, W, H, th, seed = 7) {
  const r = rng(seed);
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.7);
  th.sky.forEach((c, i) => g.addColorStop(i / (th.sky.length - 1), c));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const hz = H * (th.kind === 'sea' ? 0.56 : 0.5);
  // sun
  const sx = W * (0.35 + r() * 0.3), sy = hz - H * (th.kind === 'sea' ? 0.06 : 0.18), sr = W * 0.15;
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 3);
  glow.addColorStop(0, th.sun + 'cc'); glow.addColorStop(1, th.sun + '00');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = th.sun; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
  // clouds
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 3; i++) { const cx = r() * W, cy = H * (0.08 + r() * 0.25); for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse(cx + j * W * 0.06, cy + (j % 2) * 4, W * 0.08, H * 0.025, 0, 0, Math.PI * 2); ctx.fill(); } }
  const L = th.layers;
  if (th.kind === 'sea') {
    const sg = ctx.createLinearGradient(0, hz, 0, H); L.forEach((c, i) => sg.addColorStop(i / (L.length - 1), c));
    ctx.fillStyle = sg; ctx.fillRect(0, hz, W, H - hz);
    for (let i = 0; i < 18; i++) { const y = hz + 6 + i * i * 0.9; const w = W * (0.06 + 0.012 * i); ctx.fillStyle = th.sun + (i < 8 ? 'cc' : '55'); ctx.fillRect(sx - w / 2 + (r() - 0.5) * 8, y, w, 2 + i * 0.25); }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const y = hz + 12 + r() * (H - hz - 16); const x = r() * W; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 14, y - 4, x + 28, y); ctx.stroke(); }
  } else {
    L.forEach((c, i) => {
      const base = hz + (i / L.length) * (H - hz) * 0.9 - (th.kind === 'peaks' && i === 0 ? H * 0.12 : 0);
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, H);
      const amp = th.kind === 'peaks' ? H * (0.16 - i * 0.03) : H * (0.05 - i * 0.008);
      const ph = r() * 6, fr = 1.2 + r() * 1.6;
      if (th.kind === 'peaks') { let x = 0; ctx.lineTo(0, base); while (x < W) { const nx = x + W * (0.12 + r() * 0.14); const py = base - amp * (0.4 + r() * 0.8); ctx.lineTo((x + nx) / 2, py); ctx.lineTo(nx, base - r() * amp * 0.2); if (i === 0) { ctx.save(); ctx.restore(); } x = nx; } }
      else for (let x = 0; x <= W + 4; x += 4) ctx.lineTo(x, base - Math.sin(x / W * Math.PI * fr + ph) * amp - Math.sin(x / W * 9 + ph) * amp * 0.25);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      if (th.kind === 'peaks' && i === 0) { ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(0, 0, W, base - amp * 0.75); ctx.restore(); }
      if (th.trees && i === L.length - 2) for (let k = 0; k < 7; k++) { const tx = r() * W, ty = base + r() * 20; ctx.fillStyle = '#5b3a24'; ctx.fillRect(tx - 1.5, ty - 4, 3, 14); ctx.fillStyle = th.trees; ctx.beginPath(); ctx.arc(tx, ty - 8, 9 + r() * 5, 0, 7); ctx.fill(); }
    });
  }
  // painterly texture
  for (let i = 0; i < 900; i++) {
    const x = r() * W, y = r() * H; ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(40,20,10,0.05)';
    ctx.beginPath(); ctx.ellipse(x, y, 3 + r() * 9, 1 + r() * 2, r() * 0.6 - 0.3, 0, 7); ctx.fill();
  }
  const v = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.85); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(60,30,20,0.18)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

export class LivePainting {
  constructor(W = 256, H = 320) {
    this.W = W; this.H = H;
    this.final = document.createElement('canvas'); this.final.width = W; this.final.height = H;
    this.view = document.createElement('canvas'); this.view.width = W; this.view.height = H;
    this.tex = new THREE.CanvasTexture(this.view); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
  }
  start(theme, seed) {
    paintArt(this.final.getContext('2d'), this.W, this.H, theme, seed);
    const r = rng(seed * 31 + 5); this.strokes = [];
    for (let y = 0; y < this.H + 20; y += 18) for (let x = -10; x < this.W + 20; x += 34) this.strokes.push({ x: x + r() * 16, y: y + r() * 10, rx: 26 + r() * 14, ry: 11 + r() * 6, a: (r() - 0.5) * 0.5, k: y + r() * this.H * 0.35 });
    this.strokes.sort((a, b) => a.k - b.k); this.done = 0;
    const c = this.view.getContext('2d'); c.fillStyle = '#f8f4ec'; c.fillRect(0, 0, this.W, this.H);
    c.strokeStyle = 'rgba(80,70,60,0.25)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, this.H * 0.55); c.bezierCurveTo(this.W * 0.3, this.H * 0.5, this.W * 0.7, this.H * 0.6, this.W, this.H * 0.52); c.stroke();
    c.beginPath(); c.arc(this.W * 0.5, this.H * 0.4, this.W * 0.14, 0, 7); c.stroke();
    this.tex.needsUpdate = true;
  }
  progress(p) {
    const n = Math.floor(clamp(p, 0, 1) * this.strokes.length); if (n <= this.done) return;
    const c = this.view.getContext('2d');
    for (let i = this.done; i < n; i++) { const s = this.strokes[i]; c.save(); c.beginPath(); c.ellipse(s.x, s.y, s.rx, s.ry, s.a, 0, 7); c.clip(); c.drawImage(this.final, 0, 0); c.restore(); }
    if (n >= this.strokes.length) c.drawImage(this.final, 0, 0);
    this.done = n; this.tex.needsUpdate = true;
  }
  blank() { const c = this.view.getContext('2d'); c.fillStyle = '#f8f4ec'; c.fillRect(0, 0, this.W, this.H); this.tex.needsUpdate = true; }
  snapshotTexture() { const c = document.createElement('canvas'); c.width = this.W; c.height = this.H; c.getContext('2d').drawImage(this.final, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
  dataURL() { return this.final.toDataURL('image/jpeg', 0.85); }
  /** Swap in the real artwork (from IPFS) and repaint the strokes already revealed. */
  setFinal(img) {
    const c = this.final.getContext('2d'), W = this.W, H = this.H, k = Math.max(W / img.width, H / img.height), w = img.width * k, h = img.height * k;
    c.fillStyle = '#f8f4ec'; c.fillRect(0, 0, W, H); c.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    const v = this.view.getContext('2d');
    for (let i = 0; i < this.done; i++) { const s = this.strokes[i]; v.save(); v.beginPath(); v.ellipse(s.x, s.y, s.rx, s.ry, s.a, 0, 7); v.clip(); v.drawImage(this.final, 0, 0); v.restore(); }
    this.tex.needsUpdate = true;
  }
  frac() { return this.strokes ? this.done / this.strokes.length : 0; }
}

// ---------------------------------------------------------------- robot
export function buildRobot(kit, s) {
  const { mat, rbox, sphere, cyl, capsule } = kit;
  const bodyM = mat(s.body), headM = mat(s.head ?? s.body), accM = mat(s.accent), visorM = mat(s.visor ?? '#1c2230', { rough: 0.18 });
  const eyeM = mat(s.eye ?? '#e9f8ff', { emissive: s.eye ?? '#e9f8ff', ei: 1.4 });
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const legs = {}; for (const sx of [-1, 1]) { const lp = new THREE.Group(); lp.position.set(sx * 0.14, 0.24, 0); body.add(lp); const leg = capsule(0.085, 0.12, accM); leg.position.y = -0.09; lp.add(leg); legs[sx] = lp; }
  const torso = kit.lowpoly ? rbox(0.6, 0.52, 0.46, 0.12, bodyM) : rbox(0.62, 0.54, 0.48, 0.2, bodyM); torso.position.y = 0.52; body.add(torso);
  const belly = rbox(0.28, 0.16, 0.04, 0.06, accM); belly.position.set(0, 0.5, 0.24); body.add(belly);
  const head = new THREE.Group(); head.position.y = 0.8; body.add(head);
  const hm = kit.lowpoly ? rbox(0.64, 0.5, 0.54, 0.14, headM) : rbox(0.68, 0.52, 0.56, 0.22, headM); hm.position.y = 0.27; head.add(hm);
  const visor = rbox(0.54, 0.32, 0.06, kit.lowpoly ? 0.05 : 0.12, visorM); visor.position.set(0, 0.27, 0.27); head.add(visor);
  const eyes = [];
  for (const sx of [-1, 1]) { const e = sphere(0.05, eyeM); e.castShadow = false; e.scale.set(0.9, 1.35, 0.5); e.position.set(sx * 0.11, 0.28, 0.305); head.add(e); eyes.push(e); }
  for (const sx of [-1, 1]) { const ear = cyl(0.075, 0.075, 0.07, accM); ear.rotation.z = Math.PI / 2; ear.position.set(sx * 0.36, 0.27, 0); head.add(ear); }
  const ant = cyl(0.014, 0.014, 0.14, accM); ant.position.y = 0.58; head.add(ant);
  const ballM = new THREE.MeshStandardMaterial({ color: s.accent, emissive: s.accent, emissiveIntensity: 0.4, roughness: 0.3, flatShading: kit.lowpoly });
  const ball = sphere(0.05, ballM); ball.position.y = 0.67; head.add(ball);
  const arms = {}, hands = {};
  for (const sx of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(sx * 0.37, 0.7, 0); body.add(piv);
    const a = capsule(0.07, 0.18, bodyM); a.position.y = -0.16; piv.add(a);
    const h = sphere(0.085, accM); h.position.y = -0.33; piv.add(h);
    const anchor = new THREE.Group(); anchor.position.y = -0.36; piv.add(anchor);
    piv.rotation.z = sx * 0.12; arms[sx] = piv; hands[sx] = anchor;
  }
  return { root, body, head, eyes, arms, hands, ballM, legs, torso };
}

// ---------------------------------------------------------------- props
export function buildProps(kit, role, P, ctx) {
  const { mat, rbox, box, cyl, plane, sphere } = kit; const g = new THREE.Group(); const out = { group: g };
  const wood = mat(P.wood ?? '#d9b58c'), white = mat('#fbf8f2');
  if (role === 'curator') {
    const board = new THREE.Group(); board.position.set(0.82, 0, 0.32); board.rotation.y = -0.9; g.add(board);
    for (const sx of [-1, 1]) { const leg = box(0.05, 1.45, 0.05, wood); leg.position.set(sx * 0.42, 0.72, -0.04); board.add(leg); }
    const panel = rbox(0.98, 0.74, 0.06, 0.04, mat(P.board ?? '#f4ede1')); panel.position.y = 1.08; board.add(panel);
    out.cards = []; const r = rng(11);
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.16), mat(P.cards[i % P.cards.length], { rough: 0.8 }));
      c.position.set(-0.3 + (i % 3) * 0.3 + (r() - 0.5) * 0.04, 1.3 - Math.floor(i / 3) * 0.22, 0.035); c.rotation.z = (r() - 0.5) * 0.18; board.add(c);
      const pin = sphere(0.018, mat(P.pin ?? '#e4574a')); pin.position.set(0, 0.06, 0.01); c.add(pin); out.cards.push(c);
    }
    out.handCard = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.14), mat(P.cards[0], { side: THREE.DoubleSide })); out.handCard.visible = false;
    out.focus = board;
  }
  if (role === 'painter') {
    const easel = new THREE.Group(); easel.position.set(0.78, 0, 0.42); easel.rotation.y = -0.75; g.add(easel);
    const l1 = box(0.05, 1.5, 0.05, wood); l1.position.set(-0.28, 0.72, 0.05); l1.rotation.z = -0.12; easel.add(l1);
    const l2 = l1.clone(); l2.position.x = 0.28; l2.rotation.z = 0.12; easel.add(l2);
    const l3 = box(0.05, 1.45, 0.05, wood); l3.position.set(0, 0.7, -0.28); l3.rotation.x = -0.32; easel.add(l3);
    const ledge = box(0.7, 0.05, 0.1, wood); ledge.position.set(0, 0.62, 0.08); easel.add(ledge);
    const cv = rbox(0.62, 0.76, 0.05, 0.02, white); cv.position.set(0, 1.03, 0.06); easel.add(cv);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(0.57, 0.71), new THREE.MeshStandardMaterial({ map: ctx.painting.tex, roughness: 0.75 }));
    art.position.set(0, 1.03, 0.087); easel.add(art);
    out.anchor = new THREE.Object3D(); out.anchor.position.set(0, 1.03, 0.2); easel.add(out.anchor);
    // brush + palette
    const brush = new THREE.Group(); const stick = cyl(0.016, 0.012, 0.32, wood); stick.rotation.x = Math.PI / 2; stick.position.z = 0.1; brush.add(stick);
    out.tip = cyl(0.02, 0.006, 0.06, mat(P.paint ?? '#ff7f66').clone()); out.tip.rotation.x = Math.PI / 2; out.tip.position.z = 0.28; brush.add(out.tip); out.brush = brush;
    const pal = new THREE.Group(); const pd = cyl(0.17, 0.17, 0.02, mat('#e9d2ae')); pd.scale.z = 0.75; pal.add(pd);
    ['#ff7a66', '#ffd166', '#4cb5ae', '#5b8def', '#ffffff'].forEach((c, i) => { const d = sphere(0.03, mat(c)); d.scale.y = 0.4; d.position.set(Math.cos(i * 1.2) * 0.1, 0.015, Math.sin(i * 1.2) * 0.07); pal.add(d); });
    pal.rotation.x = -0.5; out.palette = pal; out.focus = easel;
  }
  if (role === 'critic') {
    const desk = new THREE.Group(); desk.position.set(0.7, 0, 0.36); desk.rotation.y = -0.65; g.add(desk);
    const top = rbox(0.8, 0.06, 0.5, 0.025, mat(P.desk ?? '#ffffff')); top.position.y = 0.62; desk.add(top);
    for (const [x, z] of [[-0.34, -0.2], [0.34, -0.2], [-0.34, 0.2], [0.34, 0.2]]) { const l = cyl(0.025, 0.025, 0.6, mat(P.deskLeg ?? P.wood ?? '#d9b58c')); l.position.set(x, 0.3, z); desk.add(l); }
    const tab = rbox(0.34, 0.025, 0.24, 0.02, mat('#2a2f3a', { rough: 0.25 })); tab.position.set(-0.08, 0.665, 0.02); tab.rotation.y = 0.15; desk.add(tab);
    ctx.criticScreen = new THREE.MeshStandardMaterial({ color: '#ffffff', map: ctx.painting.tex, emissive: '#ffffff', emissiveMap: ctx.painting.tex, emissiveIntensity: 0.25, roughness: 0.4 });
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), ctx.criticScreen); scr.rotation.x = -Math.PI / 2; scr.position.set(-0.08, 0.68, 0.02); scr.rotation.z = 0.15; desk.add(scr);
    const mug = cyl(0.05, 0.045, 0.1, mat(P.mug ?? '#f08a6b')); mug.position.set(0.28, 0.7, -0.12); desk.add(mug); out.mug = mug;
    out.anchor = new THREE.Object3D(); out.anchor.position.set(0.12, 0.92, 0.0); desk.add(out.anchor);
    // score paddle
    const pad = new THREE.Group(); const stick = cyl(0.015, 0.015, 0.34, wood); stick.position.y = 0.17; pad.add(stick);
    ctx.scoreCanvas = document.createElement('canvas'); ctx.scoreCanvas.width = 256; ctx.scoreCanvas.height = 192;
    ctx.scoreTex = new THREE.CanvasTexture(ctx.scoreCanvas); ctx.scoreTex.colorSpace = THREE.SRGBColorSpace;
    const card = rbox(0.42, 0.32, 0.03, 0.04, mat('#ffffff')); card.position.y = 0.46; pad.add(card);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshBasicMaterial({ map: ctx.scoreTex })); face.position.set(0, 0.46, 0.017); pad.add(face);
    pad.visible = false; out.paddle = pad; out.focus = desk;
  }
  if (role === 'seller') {
    const ctr = new THREE.Group(); ctr.position.set(0.72, 0, 0.42); ctr.rotation.y = -0.55; g.add(ctr);
    const body = rbox(0.95, 0.62, 0.46, 0.06, mat(P.counter ?? '#f6d27a')); body.position.y = 0.31; ctr.add(body);
    const top = rbox(1.02, 0.05, 0.52, 0.02, mat(P.counterTop ?? '#ffffff')); top.position.y = 0.645; ctr.add(top);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.2), new THREE.MeshStandardMaterial({ map: canvasTex(512, 160, (c, w, h) => { c.fillStyle = P.signBg ?? '#fffaf0'; c.beginPath(); c.roundRect(0, 0, w, h, 36); c.fill(); c.fillStyle = P.signFg ?? '#3a2f28'; c.font = '800 70px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('STUDIO SHOP', w / 2, h / 2 + 4); }), transparent: true, roughness: 0.6 }));
    sign.position.set(0, 0.36, 0.235); ctr.add(sign);
    const jar = cyl(0.09, 0.09, 0.2, new THREE.MeshStandardMaterial({ color: '#dff3ff', transparent: true, opacity: 0.35, roughness: 0.05 })); jar.position.set(0.36, 0.77, 0.08); ctr.add(jar);
    out.jarCoins = cyl(0.075, 0.075, 0.18, mat('#f3c03e', { metal: 0.5, rough: 0.3 })); out.jarCoins.position.set(0.36, 0.68, 0.08); out.jarCoins.scale.y = 0.2; out.jarCoins.geometry.translate(0, 0.09, 0); out.jarCoins.position.y = 0.67; ctr.add(out.jarCoins);
    const reg = rbox(0.24, 0.14, 0.18, 0.03, mat(P.register ?? '#4cb5ae')); reg.position.set(-0.32, 0.74, -0.04); ctr.add(reg);
    out.anchor = new THREE.Object3D(); out.anchor.position.set(0.02, 0.9, 0.04); ctr.add(out.anchor);
    out.coinOrigin = new THREE.Object3D(); out.coinOrigin.position.set(0.36, 0.9, 0.08); ctr.add(out.coinOrigin);
    out.focus = ctr; out.ctr = ctr; out.sign = sign; out.reg = reg;
  }
  return out;
}

// ---------------------------------------------------------------- main
export function runStudio(cfg) {
  const kit = makeKit(!!cfg.lowpoly);
  const container = cfg.container; const overlay = cfg.overlay;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = cfg.exposure ?? 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = cfg.envIntensity ?? 0.6;
  const L = cfg.lights ?? {};
  scene.add(new THREE.HemisphereLight(L.sky ?? '#ffffff', L.ground ?? '#e8d9c8', L.hemi ?? 1.1));
  const sun = new THREE.DirectionalLight(L.sunColor ?? '#fff3e2', L.sun ?? 2.2); sun.position.set(...(L.sunPos ?? [6, 12, 8]));
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; const S = L.shadowSize ?? 7;
  sc.left = -S; sc.right = S; sc.top = S; sc.bottom = -S; sc.near = 1; sc.far = 50; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025; sun.shadow.radius = 4;
  scene.add(sun); scene.add(sun.target);
  if (L.fill) { const f = new THREE.DirectionalLight(L.fillColor ?? '#dfeaff', L.fill); f.position.set(...(L.fillPos ?? [-8, 6, 4])); scene.add(f); }

  const C = cfg.camera; const camera = new THREE.PerspectiveCamera(C.fov ?? 30, 1, 0.1, 200);
  const target = new THREE.Vector3(...C.target);

  const ctx = { painting: new LivePainting(256, 320) };
  cfg.buildRoom?.(kit, scene, ctx);

  // robots
  const R = {}; const roles = ['curator', 'painter', 'critic', 'seller'];
  cfg.robots.forEach((spec, i) => {
    const station = new THREE.Group(); station.position.set(spec.x, spec.y ?? 0, spec.z); station.rotation.y = spec.ry ?? 0; station.scale.setScalar(cfg.robotScale ?? 1); scene.add(station);
    const bot = buildRobot(kit, spec); station.add(bot.root);
    const props = buildProps(kit, spec.role, cfg.props ?? {}, ctx); station.add(props.group);
    if (spec.role === 'painter') { bot.hands[1].add(props.brush); props.brush.rotation.x = 1.3; bot.hands[-1].add(props.palette); props.palette.position.set(0, -0.02, 0.05); }
    if (spec.role === 'critic') { bot.hands[-1].add(props.paddle); props.paddle.rotation.set(0, 0, Math.PI); props.paddle.position.y = -0.02; }
    if (spec.role === 'curator') { bot.hands[1].add(props.handCard); props.handCard.position.y = -0.08; }
    R[spec.role] = { ...bot, station, props, spec, idx: i, phase: i * 1.7, yaw: 0, pitch: 0, blinkT: 1 + i, hop: 0, tilt: 0 };
  });
  const focusYaw = (r) => { const p = new THREE.Vector3(); r.props.focus.getWorldPosition(p); r.station.worldToLocal(p); return clamp(Math.atan2(p.x, p.z), -1.2, 1.2); };
  roles.forEach((k) => { R[k].workYaw = focusYaw(R[k]); });

  // flying frame
  const frame = new THREE.Group(); const fm = kit.rbox(0.42, 0.5, 0.04, 0.02, kit.mat(cfg.props?.frame ?? '#ffffff'));
  const fArt = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.42), new THREE.MeshBasicMaterial({ color: '#ffffff' })); fArt.position.z = 0.022;
  frame.add(fm, fArt); frame.visible = false; scene.add(frame);
  // coins
  const coinGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.022, kit.lowpoly ? 8 : 24); const coinMat = new THREE.MeshStandardMaterial({ color: '#f5c23e', metalness: 0.55, roughness: 0.28, emissive: '#7a5200', emissiveIntensity: 0.15, flatShading: kit.lowpoly });
  const coins = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(coinGeo, coinMat); m.castShadow = true; m.visible = false; scene.add(m); return { m, v: new THREE.Vector3(), life: 0 }; });

  // overlay DOM
  const mk = (cls, html = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; overlay.appendChild(d); return d; };
  roles.forEach((k) => {
    const r = R[k];
    r.chip = mk('ms-chip', `<span class="ms-dot" style="--c:${r.spec.tag ?? r.spec.accent}"></span><b>${r.spec.name}</b><span class="ms-t"></span><span class="ms-bar"><i></i></span>`);
    r.chipT = r.chip.querySelector('.ms-t'); r.chipBar = r.chip.querySelector('.ms-bar i'); r.chipBarWrap = r.chip.querySelector('.ms-bar');
    r.bubble = mk('ms-bubble', '<span class="ms-typing"><i></i><i></i><i></i></span><span class="ms-text"></span>'); r.bubble.style.setProperty('--bc', r.spec.bubble ?? '#ffffff'); r.bubble.style.setProperty('--bt', r.spec.bubbleText ?? '#1f2328');
    r.bubbleText = r.bubble.querySelector('.ms-text'); r.bubbleHide = 0; r.lastChip = '';
  });
  const say = (k, text, dur) => { const r = R[k]; r.bubbleText.textContent = text; r.bubble.classList.remove('show', 'typed'); void r.bubble.offsetWidth; r.bubble.classList.add('show'); r.typedAt = time + 0.5; r.bubbleHide = time + (dur ?? 1.9 + text.length * 0.045); speaker = k; speakerUntil = r.bubbleHide; };
  const pop = (k, text) => { const r = R[k]; const d = mk('ms-pop', text); d.style.setProperty('--bc', r.spec.tag ?? r.spec.accent); r.pops = r.pops ?? []; const o = { d, born: time }; r.pops.push(o); setTimeout(() => { d.remove(); r.pops.splice(r.pops.indexOf(o), 1); }, 1600); };

  // state
  let time = 0, cycle = 0, ct = 0, fired = new Set(), speaker = null, speakerUntil = 0; const T = 17.5;
  const stats = { today: cfg.stats?.today ?? 23, earned: cfg.stats?.earned ?? 71.4, sold: 0 };
  const theme = () => THEMES[cycle % THEMES.length]; const nextTheme = () => THEMES[(cycle + 1) % THEMES.length];
  let artNo = cfg.stats?.artNo ?? 12; let flight = null; let frameTex = null;
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  function startCycle() {
    fired = new Set(); const th = theme(); ctx.painting.start(th, 17 + cycle * 7);
    const c = ctx.scoreCanvas.getContext('2d'); c.fillStyle = '#ffffff'; c.fillRect(0, 0, 256, 192);
    c.fillStyle = cfg.scoreColor ?? '#1f2328'; c.textAlign = 'center'; c.font = '800 96px system-ui, sans-serif'; c.fillText(th.score, 128, 112); c.font = '600 28px system-ui, sans-serif'; c.fillStyle = '#8a8f98'; c.fillText('/ 10', 128, 158); ctx.scoreTex.needsUpdate = true;
    const cards = R.curator.props.cards; const r = rng(cycle + 3); cards.forEach((cd, i) => { cd.visible = i < 3 || r() < 0.15; cd.scale.setScalar(1); });
    R.curator.pinned = cards.filter((c) => c.visible).length;
  }
  const events = [
    [0.3, () => say('curator', theme().trend)],
    [1.9, () => say('painter', 'Ooh, I can see it already')],
    [3.7, () => say('painter', 'On it, painting now')],
    [6.0, () => say('curator', theme().hint)],
    [7.6, () => say('painter', theme().reply)],
    [10.0, () => { frameTex?.dispose(); frameTex = ctx.painting.snapshotTexture(); fArt.material.map = frameTex; fArt.material.needsUpdate = true; flight = { from: R.painter.props.anchor, to: R.critic.props.anchor, t0: time, d: 0.9 }; frame.visible = true; frame.scale.setScalar(1); ctx.painting.blank(); }],
    [10.4, () => say('critic', 'Let me take a look…')],
    [11.7, () => say('critic', `${theme().feedback}. ${theme().score}/10`)],
    [12.9, () => say('painter', 'Fair. Noted!')],
    [13.1, () => { flight = { from: R.critic.props.anchor, to: R.seller.props.anchor, t0: time, d: 0.9 }; }],
    [13.4, () => { artNo++; say('seller', `Listed for ${theme().price} NEAR`); cfg.onArtwork?.({ img: ctx.painting.dataURL(), title: `${theme().name} #${String(artNo).padStart(3, '0')}`, price: theme().price, status: 'listed', theme: theme() }); }],
    [14.2, () => { flight = { from: R.seller.props.anchor, to: R.seller.hands[1], t0: time, d: 0.5, follow: true }; }],
    [15.0, () => {
      const p = theme().price; say('seller', 'Sold! Splitting earnings', 2.2); flight = { fly: true, t0: time, from: frame.position.clone() };
      const split = { curator: 0.1, painter: 0.3, critic: 0.1, seller: 0.1 };
      roles.forEach((k, i) => setTimeout(() => { pop(k, `+${(p * split[k]).toFixed(2)} NEAR`); R[k].hop = 1; }, 120 + i * 140));
      burstCoins(); stats.today++; stats.earned += p; stats.sold++; R.seller.props.jarCoins.scale.y = Math.min(1, 0.2 + stats.sold * 0.12);
      cfg.onSale?.({ price: p, owner: +(p * 0.4).toFixed(2), title: `${theme().name} #${String(artNo).padStart(3, '0')}`, buyer: ['ava.near', 'kenji.near', 'lumi.near', 'nora.near', 'otto.near'][cycle % 5] });
      cfg.onStats?.({ ...stats });
    }],
    [16.4, () => say('curator', `Next up: ${nextTheme().ask}`)],
    [16.9, () => say('critic', 'Bring it on')],
  ];
  function burstCoins() { const o = new THREE.Vector3(); R.seller.props.coinOrigin.getWorldPosition(o); coins.forEach((c, i) => { c.m.position.copy(o); c.v.set((Math.random() - 0.5) * 2.2, 2.6 + Math.random() * 1.6, (Math.random() - 0.5) * 2.2); c.life = 1.5 + Math.random() * 0.4; c.m.visible = true; c.m.scale.setScalar(1); }); }

  // camera / layout
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 }; let focus = 0, focusT = 0, W = 1, H = 1;
  addEventListener('pointermove', (e) => { mouse.tx = (e.clientX / innerWidth - 0.5) * 2; mouse.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  function resize() { W = container.clientWidth; H = container.clientHeight; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }
  new ResizeObserver(resize).observe(container); resize();

  const pv = new THREE.Vector3();
  function project(obj, dy, el, extra = '') {
    obj.getWorldPosition(pv); pv.y += dy; pv.project(camera);
    const x = (pv.x * 0.5 + 0.5) * W, y = (-pv.y * 0.5 + 0.5) * H;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) ${extra}`;
  }

  function chipState(k) {
    const th = theme(); const p = (a, b) => clamp((ct - a) / (b - a), 0, 1);
    if (k === 'curator') return ct < 3.5 ? ['Scanning trends', p(0.2, 3.4)] : ['Trend: ' + th.name.toLowerCase(), null];
    if (k === 'painter') return ct < 3.6 ? ['Mixing colors', null] : ct < 10 ? ['Painting', p(3.6, 10)] : ['Cleaning brushes', null];
    if (k === 'critic') return ct < 10.2 ? ['Waiting for art', null] : ct < 11.7 ? ['Reviewing', p(10.2, 11.7)] : ['Scored ' + th.score, null];
    if (k === 'seller') return ct < 13.3 ? ['Restocking shop', null] : ct < 15 ? ['Listing', p(13.3, 15)] : [`Sold · ${th.price} NEAR`, null];
  }

  let last = performance.now(), started = false;
  startCycle(); { const q = parseFloat(new URLSearchParams(location.search).get('t')); if (q > 0) { ct = q; time = q; events.forEach(([t, fn]) => { if (t < q - 1.2) fired.add(t); }); } } cfg.onStats?.({ ...stats });
  cfg.onArtwork?.({ img: (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 320; paintArt(c.getContext('2d'), 256, 320, THEMES[THEMES.length - 1], 99); return c.toDataURL('image/jpeg', 0.85); })(), title: `${THEMES[THEMES.length - 1].name} #${String(artNo).padStart(3, '0')}`, price: THEMES[THEMES.length - 1].price, status: 'sold', buyer: 'mira.near' });

  function tick(now) {
    const dt = Math.min(window.__msFast ? 0.12 : 0.05, (now - last) / 1000); last = now; time += dt; ct += dt;
    if (ct >= T) { ct -= T; cycle++; startCycle(); }
    for (const [t, fn] of events) if (ct >= t && !fired.has(t)) { fired.add(t); fn(); }
    // painting progress
    if (ct >= 3.6 && ct < 10) ctx.painting.progress((ct - 3.6) / 6.2);

    // robots
    roles.forEach((k) => {
      const r = R[k]; const ph = r.phase; const L = r.arms[-1], Rt = r.arms[1];
      let lx = 0, lz = -0.12, rx = 0, rz = 0.12; let yawT = 0, pitchT = 0;
      const idleSwing = Math.sin(time * 1.6 + ph) * 0.06;
      lx = idleSwing; rx = -idleSwing;
      const working =
        (k === 'curator' && ct > 0.2 && ct < 3.5) || (k === 'painter' && ct > 3.5 && ct < 10.1) ||
        (k === 'critic' && ct > 10.2 && ct < 11.6) || (k === 'seller' && ct > 13.2 && ct < 15.0);
      if (working) { yawT = r.workYaw * (cfg.workLook ?? 0.75); pitchT = 0.12; }
      if (k === 'curator') {
        if (working) { const c = (ct - 0.2) % 1.1; const reach = Math.sin(clamp(c / 0.9, 0, 1) * Math.PI); rz = 0.4 + reach * 1.1; rx = -0.4 - reach * 0.5; pitchT = -0.2;
          r.props.handCard.visible = c < 0.5; if (c > 0.5 && !r.didPin) { r.didPin = true; const nxt = r.props.cards.find((x) => !x.visible); if (nxt) { nxt.visible = true; nxt.scale.setScalar(0.01); } } if (c < 0.5) r.didPin = false; }
        else r.props.handCard.visible = false;
        r.props.cards.forEach((cd) => { if (cd.visible && cd.scale.x < 1) cd.scale.setScalar(Math.min(1, cd.scale.x + dt * 5)); });
      }
      if (k === 'painter') {
        if (working) { rz = 0.95 + Math.sin(time * 7.5) * 0.18; rx = -0.75 + Math.sin(time * 11) * 0.22; lz = -0.5; lx = -0.6; r.props.tip.material.color.set(theme().layers[Math.floor(time * 1.2) % theme().layers.length]); }
        else { lz = -0.35; lx = -0.4; }
      }
      if (k === 'critic') {
        r.props.paddle.visible = ct > 11.6 && ct < 13.4;
        if (working) { rz = 0.5; rx = -0.75 + Math.abs(Math.sin(time * 9)) * 0.12; pitchT = 0.35; }
        if (r.props.paddle.visible) { lz = -2.25 + Math.sin(time * 5) * 0.06; lx = -0.35; yawT = 0; pitchT = -0.12; }
      }
      if (k === 'seller') {
        if (ct > 13.2 && ct < 14.2) { rz = 0.6 + Math.sin(time * 8) * 0.08; rx = -0.6; }
        else if (ct >= 14.2 && ct < 14.65) { rz = 0.9; rx = -0.75; yawT = r.workYaw; }
        else if (ct >= 14.65 && ct < 15.3) { rz = 0.25; rx = -1.35; yawT = 0; pitchT = -0.1; }
        else if (ct >= 15.3 && ct < 16.4) { rz = 2.6 + Math.sin(time * 14) * 0.25; rx = 0; } // wave
      }
      // look at speaker
      if (!working && speaker && time < speakerUntil) {
        if (speaker === k) { yawT = 0; pitchT = -0.12; }
        else { const sp = new THREE.Vector3(); R[speaker].head.getWorldPosition(sp); r.station.worldToLocal(sp); yawT = clamp(Math.atan2(sp.x, sp.z), -1.1, 1.1) * (cfg.lookFactor ?? 0.55); }
      }
      if (!working && !(speaker && time < speakerUntil)) { yawT = Math.sin(time * 0.35 + ph) * 0.35; pitchT = Math.sin(time * 0.5 + ph) * 0.08; }
      r.yaw = damp(r.yaw, yawT, 6, dt); r.pitch = damp(r.pitch, pitchT, 6, dt);
      const talking = speaker === k && time < speakerUntil;
      r.tilt = damp(r.tilt, talking ? Math.sin(time * 6) * 0.07 : 0, 8, dt);
      r.head.rotation.set(r.pitch, r.yaw, r.tilt, 'YXZ');
      for (const [arm, tx, tz] of [[L, lx, lz], [Rt, rx, rz]]) { arm.rotation.x = damp(arm.rotation.x, tx, 9, dt); arm.rotation.z = damp(arm.rotation.z, tz, 9, dt); }
      // bob + hop
      r.hop = Math.max(0, r.hop - dt * 1.8); const hopY = Math.sin((1 - r.hop) * Math.PI) * 0.22 * (r.hop > 0 ? 1 : 0);
      r.body.position.y = Math.sin(time * 2.2 + ph) * 0.018 + hopY;
      r.body.rotation.y = Math.sin(time * 0.7 + ph) * 0.04;
      // blink
      r.blinkT -= dt; const bl = r.blinkT < 0.12 && r.blinkT > 0 ? 0.15 : 1; if (r.blinkT < 0) r.blinkT = 2 + Math.random() * 3.5;
      r.eyes.forEach((e) => (e.scale.y = 1.35 * bl));
      r.ballM.emissiveIntensity = 0.35 + (talking ? 0.9 + Math.sin(time * 12) * 0.4 : 0.15 * Math.sin(time * 2 + ph));
      // overlay
      project(r.head, 0.95 * (cfg.robotScale ?? 1), r.chip); project(r.head, 0.95 * (cfg.robotScale ?? 1), r.bubble);
      const [label, prog] = chipState(k); const s = label + (prog != null ? ` ${Math.round(prog * 100)}%` : '');
      if (s !== r.lastChip) { r.chipT.textContent = s; r.lastChip = s; }
      r.chipBarWrap.style.display = prog != null ? '' : 'none'; if (prog != null) r.chipBar.style.width = (prog * 100).toFixed(0) + '%';
      r.chip.classList.toggle('active', working);
      if (r.bubble.classList.contains('show')) { if (time > r.typedAt) r.bubble.classList.add('typed'); if (time > r.bubbleHide) r.bubble.classList.remove('show'); }
      (r.pops ?? []).forEach((o) => project(r.head, 0.75 + (time - o.born) * 0.5, o.d));
    });

    // flight
    if (flight && !flight.hold) {
      if (flight.fly) { const p = clamp((time - flight.t0) / 0.9, 0, 1); frame.position.copy(flight.from); frame.position.y += smooth(p) * 1.6; frame.scale.setScalar(1 - smooth(p)); frame.rotation.y += dt * 8; if (p >= 1) { frame.visible = false; flight = null; } }
      else { flight.from.getWorldPosition(tmpA); flight.to.getWorldPosition(tmpB); const p = smooth(clamp((time - flight.t0) / flight.d, 0, 1));
        frame.position.lerpVectors(tmpA, tmpB, p); frame.position.y += Math.sin(p * Math.PI) * (flight.follow ? 0.15 : 0.7); const s = flight.follow ? lerp(1, 0.8, p) : lerp(1, 0.8, p); frame.scale.setScalar(s);
        frame.lookAt(camera.position.x, frame.position.y, camera.position.z); if (p >= 1 && !flight.follow) { flight = { hold: flight.to }; } }
    }
    if (flight?.hold) { flight.hold.getWorldPosition(frame.position); frame.lookAt(camera.position.x, frame.position.y, camera.position.z); }
    // coins
    coins.forEach((c) => { if (!c.m.visible) return; c.life -= dt; c.v.y -= 7 * dt; c.m.position.addScaledVector(c.v, dt); if (c.m.position.y < 0.05) { c.m.position.y = 0.05; c.v.y *= -0.35; c.v.x *= 0.6; c.v.z *= 0.6; } c.m.rotation.x += dt * 9; c.m.rotation.z += dt * 5; if (c.life < 0.3) c.m.scale.setScalar(Math.max(0.01, c.life / 0.3)); if (c.life <= 0) c.m.visible = false; });

    // camera
    mouse.x = damp(mouse.x, mouse.tx, 2.5, dt); mouse.y = damp(mouse.y, mouse.ty, 2.5, dt);
    focus = damp(focus, focusT, 2.2, dt);
    const az = C.azimuth + Math.sin(time * (C.orbitSpeed ?? 0.08)) * (C.orbitAmp ?? 0.1) + mouse.x * (C.parallax ?? 0.07);
    const el = C.elevation - mouse.y * 0.035 + (C.focusElev ?? -0.05) * focus;
    const rad = lerp(C.radius, C.focusRadius ?? C.radius * 0.8, focus);
    camera.position.set(target.x + rad * Math.cos(el) * Math.sin(az), target.y + rad * Math.sin(el), target.z + rad * Math.cos(el) * Math.cos(az));
    camera.lookAt(target);
    const vs = cfg.viewShift?.(W, H) ?? { x: 0, y: 0 };
    const ox = vs.x * W * (1 - focus), oy = vs.y * H * (1 - focus);
    if (Math.abs(ox) > 0.5 || Math.abs(oy) > 0.5) camera.setViewOffset(W, H, -ox, -oy, W, H); else camera.clearViewOffset();
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
    if (!started) { started = true; cfg.onReady?.(); }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return { setFocus(v) { focusT = v ? 1 : 0; }, kit, scene, THREE };
}

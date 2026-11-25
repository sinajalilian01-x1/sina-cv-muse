/* eslint-disable */
// Sina's room: a Muse Swarm-family low-poly Three.js scene. Same kit, renderer, tone mapping, environment,
// lighting rig, orbit camera and evening crossfade as the Muse Swarm studio, rebuilt as a home office in Prague.
import { THREE, makeKit, canvasTex } from './muse-engine.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildGuy, POSES } from './guy.js';
import { buildPrague } from './prague.js';
import { CodeScreen, SiteScreen, GlassRain } from './screens.js';

const C = { teal: '#16A39C', tealD: '#0E7F7A', tang: '#F47A38', lemon: '#F6C53E', pink: '#F48AA6', navy: '#13243F', wall: '#F7F5F1', wood: '#E9B880', woodD: '#D9A26A', coral: '#F49A7C', coralL: '#F8B9A2', leaf: ['#3FAE77', '#2E9463', '#6CC36B', '#9BD46A'] };
const W = 3.0, H = 3.2; // interior half-size, wall height
const WIN = { x0: 0.55, x1: 2.45, y0: 1.05, y1: 2.6 }; // window opening in the back wall
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (c, t, k, dt) => c + (t - c) * (1 - Math.exp(-k * dt));
const ease = (t) => t * t * (3 - 2 * t);

function bake(scene, roots, skip) {
  scene.updateMatrixWorld(true); const buckets = new Map(), kill = [];
  roots.forEach((root) => root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return; for (let p = o; p; p = p.parent) if (skip.has(p)) return;
    if (o.material.transparent || Array.isArray(o.material)) return;
    let g = o.geometry.clone().applyMatrix4(o.matrixWorld); if (g.index) g = g.toNonIndexed();
    for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const key = o.material.uuid + (o.castShadow ? 'c' : 'n'); if (!buckets.has(key)) buckets.set(key, { m: o.material, cast: o.castShadow, gs: [] });
    buckets.get(key).gs.push(g); kill.push(o);
  }));
  kill.forEach((o) => o.parent.remove(o));
  for (const { m, cast, gs } of buckets.values()) { const mesh = new THREE.Mesh(mergeGeometries(gs, false), m); mesh.castShadow = cast; mesh.receiveShadow = true; scene.add(mesh); }
}

function addPlanks(k, scene, colors, grout) {
  scene.add(k.at(k.rbox(2 * W + 0.4, 0.1, 2 * W + 0.4, 0.04, k.mat(grout, { rough: 0.9 })), 0, 0, 0));
  const mats = colors.map((c) => k.mat(c, { rough: 0.88 }));
  const w = 0.34, gap = 0.018, th = 0.028, half = W + 0.2, y = 0.058; let row = 0;
  for (let z = -half; z < half - 0.01; z += w + gap, row++) {
    let x = -half + ((row % 2) ? 0.55 : 0); let i = 0;
    while (x < half - 0.12) {
      const len = Math.min(1.15 + ((row * 7 + i * 13) % 5) * 0.18, 2.15, half - x); if (len < 0.2) break;
      const p = k.box(len - gap, th, w, mats[(row + i * 2) % mats.length]); p.position.set(x + len / 2, y, Math.min(z + w / 2, half - w / 2)); p.castShadow = false; scene.add(p);
      x += len; i++;
    }
  }
}

function artTex(seed) {
  return canvasTex(256, 320, (g, w, h) => {
    const pal = [[C.teal, C.lemon, C.coral], [C.tang, C.teal, '#FFF4D2'], [C.pink, C.lemon, C.tealD]][seed % 3];
    g.fillStyle = '#FFF8EE'; g.fillRect(0, 0, w, h);
    g.fillStyle = pal[0]; g.beginPath(); g.arc(w * 0.38, h * 0.38, w * 0.26, 0, 7); g.fill();
    g.fillStyle = pal[1]; g.beginPath(); g.moveTo(0, h); g.lineTo(w * 0.45, h * 0.55); g.lineTo(w * 0.7, h * 0.75); g.lineTo(w, h * 0.5); g.lineTo(w, h); g.fill();
    g.fillStyle = pal[2]; g.fillRect(w * 0.62, h * 0.16, w * 0.22, w * 0.22);
  });
}

function buildRoom(k, scene, refs) {
  const { mat, rbox, box, cyl, at, plant, sphere, mesh } = k;
  const before = new Set(scene.children), skip = new Set();
  // shell: base slab, floor, two solid walls (back wall has a real window opening)
  scene.add(at(rbox(2 * W + 0.9, 0.5, 2 * W + 0.9, 0.12, mat('#E2E3E1')), 0.05, -0.27, 0.05));
  addPlanks(k, scene, ['#E9B880', '#E2AE74', '#EDC28E', '#DDA66C'], '#C99560');
  const WM = mat(C.wall), zb = -W - 0.18, xl = -W - 0.18;
  scene.add(at(rbox(0.36, H, 2 * W + 0.72, 0.08, WM), xl, H / 2, 0.0));                 // left wall
  const bx0 = -W - 0.36, bx1 = W + 0.45;
  scene.add(at(box(WIN.x0 - bx0, H, 0.36, WM), (bx0 + WIN.x0) / 2, H / 2, zb));        // back wall, left of window
  scene.add(at(box(bx1 - WIN.x1, H, 0.36, WM), (bx1 + WIN.x1) / 2, H / 2, zb));        // right of window
  scene.add(at(box(WIN.x1 - WIN.x0, WIN.y0, 0.36, WM), (WIN.x0 + WIN.x1) / 2, WIN.y0 / 2, zb));
  scene.add(at(box(WIN.x1 - WIN.x0, H - WIN.y1, 0.36, WM), (WIN.x0 + WIN.x1) / 2, (WIN.y1 + H) / 2, zb));
  // skirting
  scene.add(at(box(0.04, 0.14, 2 * W, mat('#E8E2D8')), -W + 0.02, 0.14, 0)); scene.add(at(box(2 * W, 0.14, 0.04, mat('#E8E2D8')), 0, 0.14, -W + 0.02));
  // window frame (wood), mullions, deep sill
  const wood = mat(C.wood), woodD = mat(C.woodD);
  const wx = (WIN.x0 + WIN.x1) / 2, ww = WIN.x1 - WIN.x0, wh = WIN.y1 - WIN.y0, wy = (WIN.y0 + WIN.y1) / 2;
  scene.add(at(box(ww + 0.16, 0.1, 0.42, wood), wx, WIN.y1 + 0.03, zb), at(box(ww + 0.3, 0.08, 0.6, woodD), wx, WIN.y0 - 0.02, zb + 0.1));
  scene.add(at(box(0.1, wh + 0.1, 0.42, wood), WIN.x0 - 0.03, wy, zb), at(box(0.1, wh + 0.1, 0.42, wood), WIN.x1 + 0.03, wy, zb));
  scene.add(at(box(0.06, wh, 0.1, wood), wx, wy, zb + 0.02), at(box(ww, 0.06, 0.1, wood), wx, WIN.y0 + wh * 0.62, zb + 0.02));
  // view of Prague: a plane in the opening that shows the city render target
  const viewMat = new THREE.MeshBasicMaterial({ map: refs.viewTex, toneMapped: false });
  const view = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), viewMat); view.position.set(wx, wy, zb - 0.1); scene.add(view); skip.add(view);
  const glass = new THREE.MeshStandardMaterial({ color: '#CDEFF3', transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.1, depthWrite: false });
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), glass); gl.position.set(wx, wy, zb + 0.06); scene.add(gl);
  const dropsMat = new THREE.MeshBasicMaterial({ map: refs.glassRain.tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const drops = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), dropsMat); drops.position.set(wx, wy, zb + 0.08); scene.add(drops);
  refs.dropsMat = dropsMat; refs.glass = glass;
  // curtains (coral), tied back
  for (const sx of [-1, 1]) { const c = rbox(0.26, wh + 0.5, 0.1, 0.05, mat(C.coralL)); c.position.set(sx < 0 ? WIN.x0 - 0.26 : WIN.x1 + 0.26, wy + 0.1, zb + 0.26); scene.add(c); }
  scene.add(at(cyl(0.025, 0.025, ww + 1.1, mat(C.navy)), wx, WIN.y1 + 0.24, zb + 0.28)); scene.children.at(-1).rotation.z = Math.PI / 2;

  // ---- desk along the back wall
  const deskTop = 0.95, dz = -W + 0.48, dx0 = -2.85, dx1 = 0.25, dxc = (dx0 + dx1) / 2;
  scene.add(at(rbox(dx1 - dx0, 0.07, 0.9, 0.025, mat('#FFFFFF')), dxc, deskTop - 0.035, dz));
  scene.add(at(rbox(dx1 - dx0 - 0.04, 0.03, 0.88, 0.01, mat('#F1C98E')), dxc, deskTop - 0.085, dz));
  for (const x of [dx0 + 0.08, dx1 - 0.08]) for (const z of [dz - 0.36, dz + 0.36]) scene.add(at(cyl(0.035, 0.035, deskTop - 0.1, mat(C.lemon)), x, (deskTop - 0.1) / 2 + 0.06, z));
  // drawer unit
  scene.add(at(rbox(0.5, 0.62, 0.7, 0.04, mat(C.teal)), dx0 + 0.4, 0.38, dz)); [0.5, 0.27].forEach((y) => scene.add(at(box(0.18, 0.03, 0.02, mat('#FFFFFF')), dx0 + 0.4, y, dz + 0.36)));
  // rug + chair
  const rug = cyl(1.15, 1.15, 0.03, mat('#FBEBD3', { rough: 0.95 }), 24); rug.position.set(-1.25, 0.085, -1.55); rug.castShadow = false; scene.add(rug);
  const rug2 = cyl(0.85, 0.85, 0.032, mat(C.coralL, { rough: 0.95 }), 24); rug2.position.set(-1.25, 0.09, -1.55); rug2.castShadow = false; scene.add(rug2);

  // monitor (code)
  const mon = new THREE.Group(); mon.position.set(-1.6, deskTop, dz - 0.12); mon.rotation.y = 0.08; scene.add(mon);
  mon.add(at(rbox(0.42, 0.03, 0.26, 0.012, mat(C.navy)), 0, 0.015, 0), at(rbox(0.07, 0.42, 0.05, 0.02, mat(C.navy)), 0, 0.22, -0.04));
  mon.add(at(rbox(1.22, 0.72, 0.06, 0.025, mat('#1C2533')), 0, 0.66, 0));
  const codeScr = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 0.645), new THREE.MeshBasicMaterial({ map: refs.code.tex, toneMapped: false })); codeScr.position.set(0, 0.66, 0.032); mon.add(codeScr); skip.add(codeScr);
  refs.monitorPos = new THREE.Vector3(-1.6, deskTop + 0.66, dz - 0.05);
  // laptop (site preview), angled toward him
  const lap = new THREE.Group(); lap.position.set(-0.45, deskTop, dz + 0.08); lap.rotation.y = -0.42; scene.add(lap);
  lap.add(at(rbox(0.62, 0.025, 0.42, 0.01, mat('#DDE3E8')), 0, 0.0125, 0));
  lap.add(at(box(0.5, 0.004, 0.2, mat('#AEB8C2')), 0, 0.027, -0.03));
  const lid = new THREE.Group(); lid.position.set(0, 0.025, -0.2); lid.rotation.x = -0.24; lap.add(lid);
  lid.add(at(rbox(0.62, 0.4, 0.018, 0.01, mat('#DDE3E8')), 0, 0.2, 0));
  const siteScr = new THREE.Mesh(new THREE.PlaneGeometry(0.57, 0.356), new THREE.MeshBasicMaterial({ map: refs.site.tex, toneMapped: false })); siteScr.position.set(0, 0.205, 0.011); lid.add(siteScr); skip.add(siteScr);
  refs.laptopPos = new THREE.Vector3(-0.45, deskTop + 0.25, dz - 0.05);
  // separate keyboard he types on (keys instanced) + mouse
  const kb = new THREE.Group(); kb.position.set(-1.3, deskTop, dz + 0.24); kb.rotation.y = 0.02; scene.add(kb);
  kb.add(at(rbox(0.78, 0.035, 0.26, 0.012, mat('#FFFFFF')), 0, 0.0175, 0));
  { const keyG = new THREE.BoxGeometry(0.044, 0.016, 0.044); const keyM = new THREE.MeshStandardMaterial({ color: '#2A3A52', roughness: 0.6, flatShading: true });
    const acc = new THREE.MeshStandardMaterial({ color: C.tang, roughness: 0.6, flatShading: true });
    const n = 14 * 4; const im = new THREE.InstancedMesh(keyG, keyM, n); const m4 = new THREE.Matrix4(); let i = 0;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) im.setMatrixAt(i++, m4.makeTranslation(-0.338 + c * 0.052, 0.043, -0.085 + r * 0.056));
    kb.add(im); const sp = at(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.016, 0.044), keyM), 0, 0.043, 0.088); kb.add(sp);
    const esc = at(new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.018, 0.044), acc), -0.338, 0.045, -0.085); kb.add(esc);
    const ent = at(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.018, 0.044), new THREE.MeshStandardMaterial({ color: C.teal, roughness: 0.6, flatShading: true })), 0.33, 0.045, 0.03); kb.add(ent);
    skip.add(kb); }
  refs.keyboard = kb;
  scene.add(at(rbox(0.09, 0.035, 0.14, 0.03, mat('#FFFFFF')), -0.72, deskTop + 0.018, dz + 0.3));
  scene.add(at(rbox(0.26, 0.006, 0.22, 0.004, mat(C.navy)), -0.72, deskTop + 0.003, dz + 0.3));
  // coffee mug on the desk (to his right) — the one he picks up is a separate mesh in his hand
  const mugM = mat(C.lemon);
  const deskMug = new THREE.Group(); deskMug.position.set(-0.8, deskTop, dz + 0.02); scene.add(deskMug);
  deskMug.add(at(cyl(0.058, 0.052, 0.12, mugM, 10), 0, 0.06, 0)); const h1 = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.011, 5, 8), mugM); h1.position.set(0.06, 0.065, 0); deskMug.add(h1);
  deskMug.add(at(cyl(0.05, 0.05, 0.005, mat('#6B4A36'), 10), 0, 0.118, 0)); skip.add(deskMug); refs.deskMug = deskMug;
  // desk lamp (lemon shade) — the night light source
  const lamp = new THREE.Group(); lamp.position.set(-2.55, deskTop, dz - 0.15); scene.add(lamp);
  lamp.add(at(cyl(0.13, 0.15, 0.04, mat(C.navy)), 0, 0.02, 0));
  const arm1 = cyl(0.018, 0.018, 0.5, mat(C.navy)); arm1.position.set(0.04, 0.27, 0); arm1.rotation.z = -0.2; lamp.add(arm1);
  const arm2 = cyl(0.018, 0.018, 0.42, mat(C.navy)); arm2.position.set(0.22, 0.56, 0.06); arm2.rotation.z = -1.1; lamp.add(arm2);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.2, 8, 1, true), mat(C.lemon, { side: THREE.DoubleSide })); shade.position.set(0.42, 0.6, 0.1); shade.rotation.z = 0.55; lamp.add(shade);
  const bulbM = new THREE.MeshStandardMaterial({ color: '#FFF4D2', emissive: '#FFD48A', emissiveIntensity: 0.2, roughness: 0.4, flatShading: true });
  const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), bulbM); bulb.position.set(0.44, 0.53, 0.1); lamp.add(bulb); skip.add(bulb);
  refs.bulbM = bulbM; refs.lampPos = new THREE.Vector3(-2.55 + 0.44, deskTop + 0.45, dz - 0.05);
  // desk plant, books, sticky notes
  const dp = plant('#FFFFFF', C.leaf[2], 0.55, 21, 'spiky'); dp.position.set(-2.62, deskTop, dz + 0.25); scene.add(dp);
  [[C.teal, 0.3], [C.tang, 0.26], [C.lemon, 0.32]].forEach(([c, h], i) => scene.add(at(rbox(0.06, h, 0.22, 0.01, mat(c)), -2.1 + i * 0.07, deskTop + h / 2, dz - 0.25)));
  [[C.lemon, -2.2, 2.05], [C.pink, -1.98, 2.15], [C.teal, -1.05, 2.1], [C.tang, -0.86, 1.98], [C.lemon, -0.95, 1.85]].forEach(([c, x, y], i) => { const n = box(0.17, 0.17, 0.01, mat(c)); n.position.set(x, y, -W + 0.006); n.rotation.z = (i % 2 ? 0.08 : -0.06); scene.add(n); });

  // wall shelf with plants (back wall, above the desk) and left-wall shelf
  scene.add(at(rbox(1.5, 0.06, 0.3, 0.02, wood), -1.55, 2.55, -W + 0.15));
  const sp1 = plant(C.tang, C.leaf[0], 0.55, 31, 'leafy'); sp1.position.set(-2.1, 2.58, -W + 0.15); scene.add(sp1);
  [[C.navy, 0.28], [C.teal, 0.24], ['#FFFFFF', 0.3], [C.coral, 0.22]].forEach(([c, h], i) => scene.add(at(rbox(0.07, h, 0.2, 0.01, mat(c)), -1.5 + i * 0.08, 2.58 + h / 2, -W + 0.15)));
  const trail = plant('#FFFFFF', C.leaf[1], 0.5, 37, 'leafy'); trail.position.set(-0.95, 2.58, -W + 0.15); scene.add(trail);
  for (let i = 0; i < 5; i++) { const v = sphere(0.06, mat(C.leaf[i % 2 ? 1 : 3])); v.position.set(-0.86 + (i % 2) * 0.04, 2.45 - i * 0.11, -W + 0.26); scene.add(v); }
  // left wall: framed art + shelf + bookcase
  [[0.5, 2.1, 0], [-0.55, 1.95, 1]].forEach(([z, y, s]) => {
    scene.add(at(rbox(0.05, 0.86, 0.7, 0.015, mat('#FFFFFF')), -W + 0.03, y, z));
    const a = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.76), new THREE.MeshStandardMaterial({ map: artTex(s), roughness: 0.8 })); a.rotation.y = Math.PI / 2; a.position.set(-W + 0.06, y, z); scene.add(a);
  });
  const bc = new THREE.Group(); bc.position.set(-W + 0.25, 0, 1.75); scene.add(bc);
  const bw = mat('#FFFFFF');
  bc.add(at(box(0.04, 1.3, 1.1, bw), -0.2, 0.71, 0));
  [0.08, 0.5, 0.94, 1.36].forEach((y) => bc.add(at(box(0.44, 0.04, 1.1, bw), 0, y, 0)));
  [-0.53, 0.53].forEach((z) => bc.add(at(box(0.44, 1.32, 0.04, bw), 0, 0.71, z)));
  [0.1, 0.52, 0.96].forEach((y, ri) => { for (let i = 0; i < 9; i++) { if ((i + ri) % 5 === 4) continue; const h = 0.24 + ((i * 7 + ri) % 4) * 0.035; const bk = rbox(0.3, h, 0.08, 0.01, mat([C.teal, C.tang, C.lemon, C.navy, C.coral, '#FFFFFF'][(i + ri * 2) % 6])); bk.position.set(-0.02, y + 0.02 + h / 2, -0.42 + i * 0.105); bk.rotation.x = (i % 4 === 3) ? 0.18 : 0; bc.add(bk); } });
  const bp = plant(C.teal, C.leaf[3], 0.6, 41, 'spiky'); bp.position.set(-W + 0.25, 1.37, 1.95); scene.add(bp);
  // floor plants: tall monstera-ish by the window, big leafy in the corner, small one by the bookcase
  const fp1 = plant('#FFFFFF', C.leaf[0], 1.35, 3, 'tall'); fp1.position.set(2.55, 0.06, -2.45); scene.add(fp1);
  const fp2 = plant(C.tang, C.leaf[1], 1.1, 9, 'spiky'); fp2.position.set(-2.55, 0.06, 0.55); scene.add(fp2);
  const fp3 = plant(C.lemon, C.leaf[2], 0.8, 14, 'leafy'); fp3.position.set(1.55, 0.06, -2.55); scene.add(fp3);
  const sill = plant(C.coral, C.leaf[3], 0.42, 27, 'spiky'); sill.position.set(1.05, WIN.y0 + 0.02, zb + 0.24); scene.add(sill);
  // reading corner: coral armchair + side table with a vinyl player vibe
  const ac = new THREE.Group(); ac.position.set(1.9, 0, 0.9); ac.rotation.y = -0.7; scene.add(ac);
  ac.add(at(rbox(1.0, 0.36, 0.9, 0.1, mat(C.coral)), 0, 0.3, 0), at(rbox(1.0, 0.7, 0.24, 0.1, mat(C.coral)), 0, 0.65, -0.36));
  for (const sx of [-1, 1]) ac.add(at(rbox(0.2, 0.5, 0.9, 0.08, mat(C.coral)), sx * 0.46, 0.48, 0));
  ac.add(at(rbox(0.5, 0.12, 0.4, 0.05, mat(C.lemon)), 0.08, 0.52, 0.05));
  [[-0.38, -0.32], [0.38, -0.32], [-0.38, 0.32], [0.38, 0.32]].forEach(([x, z]) => ac.add(at(cyl(0.03, 0.025, 0.14, mat(C.woodD)), x, 0.1, z)));
  scene.add(at(cyl(0.28, 0.28, 0.05, mat('#FFFFFF'), 16), 2.4, 0.62, -0.4), at(cyl(0.04, 0.05, 0.56, mat(C.navy)), 2.4, 0.33, -0.4), at(cyl(0.18, 0.2, 0.03, mat(C.navy), 12), 2.4, 0.07, -0.4));
  scene.add(at(cyl(0.12, 0.12, 0.012, mat('#1C2230'), 16), 2.4, 0.655, -0.4));
  // a couple of floating Muse gems, so it reads as the same family
  const gems = [];
  [[C.lemon, 0.18, 'dod', -0.2, 2.75, 0.8], [C.pink, 0.15, 'oct', 1.2, 2.95, 1.6], [C.teal, 0.13, 'ico', 0.6, 3.1, -0.6]].forEach(([c, r, kd, x, y, z], i) => {
    const g = kd === 'oct' ? new THREE.OctahedronGeometry(r, 0) : kd === 'dod' ? new THREE.DodecahedronGeometry(r, 0) : new THREE.IcosahedronGeometry(r, 0);
    const m = mesh(g, mat(c, { rough: 0.55 })); m.position.set(x, y, z); scene.add(m); skip.add(m); gems.push([m, y, i]);
  });
  refs.gems = gems;

  // office chair (coral seat), the guy sits on it
  const chair = new THREE.Group(); chair.position.set(-1.3, 0, -1.6); scene.add(chair); refs.chair = chair;
  chair.add(at(rbox(0.62, 0.1, 0.58, 0.05, mat(C.coral)), 0, 0.55, 0));
  chair.add(at(rbox(0.6, 0.66, 0.1, 0.06, mat(C.coral)), 0, 0.98, 0.3));
  chair.add(at(cyl(0.04, 0.04, 0.42, mat(C.navy)), 0, 0.3, 0), at(cyl(0.025, 0.025, 0.4, mat(C.navy)), 0, 0.75, 0.3));
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const s = box(0.36, 0.04, 0.06, mat(C.navy)); s.position.set(Math.cos(a) * 0.17, 0.1, Math.sin(a) * 0.17); s.rotation.y = -a; chair.add(s); chair.add(at(sphere(0.04, mat('#1C2230')), Math.cos(a) * 0.34, 0.06, Math.sin(a) * 0.34)); }
  skip.add(chair);

  bake(scene, scene.children.filter((o) => !before.has(o)), skip);
}

export function mountRoom({ container, chip, onReady }) {
  const kit = makeKit(true);
  const small = Math.min(innerWidth, innerHeight) < 700;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { container.classList.add('no-webgl'); return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-label', 'Live 3D scene: Sina at his desk in Prague, coding on a monitor with the site preview on his laptop.');
  renderer.domElement.setAttribute('role', 'img');
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45;

  // Muse Swarm light rig (day) with a no-purple evening variant
  const L = { sky: '#ffffff', ground: '#dfe3e6', hemi: 1.35, sun: 2.4, sunColor: '#fff6ea', sunPos: [5, 13, 9], fill: 0.55, fillPos: [-7, 5, 6], fillColor: '#e8f4ff' };
  const NC = { sky: '#5d7f8c', ground: '#2e2722', hemi: 0.42, sunColor: '#ffb27a', sun: 0.18, fillColor: '#6f9fb8', fill: 0.16, exposure: 0.92, env: 0.12 };
  const hemi = new THREE.HemisphereLight(L.sky, L.ground, L.hemi); scene.add(hemi);
  const sun = new THREE.DirectionalLight(L.sunColor, L.sun); sun.position.set(...L.sunPos); sun.castShadow = true; sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  const sc = sun.shadow.camera; sc.left = -5.5; sc.right = 5.5; sc.top = 5.5; sc.bottom = -5.5; sc.near = 1; sc.far = 40; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025; scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(L.fillColor, L.fill); fill.position.set(...L.fillPos); scene.add(fill);

  // window view: Prague rendered from eye level into a texture
  const prague = buildPrague();
  const rtW = small ? 448 : 640, rtH = Math.round(rtW / ((WIN.x1 - WIN.x0) / (WIN.y1 - WIN.y0)));
  const rt = new THREE.WebGLRenderTarget(rtW, rtH, { samples: small ? 0 : 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
  prague.camera.aspect = rtW / rtH; prague.camera.updateProjectionMatrix();

  const refs = { viewTex: rt.texture, code: new CodeScreen(), site: new SiteScreen(), glassRain: new GlassRain() };
  refs.code.onLine = () => refs.site.reload();
  buildRoom(kit, scene, refs);

  // night lights: desk lamp pool, monitor glow, window spill (intensity 0 by day)
  const lampL = new THREE.PointLight('#ffb867', 0, 7, 1.5); lampL.position.copy(refs.lampPos); scene.add(lampL);
  const monL = new THREE.PointLight('#5fd6cc', 0, 3.2, 1.8); monL.position.copy(refs.monitorPos).add(new THREE.Vector3(0, -0.1, 0.5)); scene.add(monL);
  const lapL = new THREE.PointLight('#ffe2b8', 0, 2.2, 1.8); lapL.position.copy(refs.laptopPos).add(new THREE.Vector3(0.1, 0, 0.4)); scene.add(lapL);
  const ceilL = new THREE.PointLight('#ffc98a', 0, 9, 1.4); ceilL.position.set(0.6, 3.0, 0.4); scene.add(ceilL);

  // the guy
  const guy = buildGuy(kit, C); guy.root.position.set(-1.3, 0.6, -1.62); guy.root.rotation.y = Math.PI; scene.add(guy.root);
  guy.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const handMug = new THREE.Group(); { const m = kit.mat(C.lemon); handMug.add(kit.at(kit.cyl(0.058, 0.052, 0.12, m, 10), 0, 0, 0)); const h = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.011, 5, 8), m); h.position.set(0.06, 0.005, 0); handMug.add(h); }
  handMug.position.set(0, -0.06, 0.05); handMug.rotation.x = 1.4; handMug.visible = false; guy.arms[-1].hand.add(handMug);

  // camera (Muse Swarm orbit: azimuth/elevation/radius around a target, slow sway + pointer parallax)
  const cam = { fov: 26, target: new THREE.Vector3(-0.25, 0.95, -0.55), azimuth: Math.PI / 4, elevation: 0.6, radius: 22, orbitAmp: 0.06, parallax: 0.12 };
  const camera = new THREE.PerspectiveCamera(cam.fov, 1, 0.1, 200);
  let Wd = 1, Ht = 1;
  function fit() {
    Wd = container.clientWidth || innerWidth; Ht = Math.max(1, container.clientHeight || innerHeight);
    renderer.setSize(Wd, Ht, false); camera.aspect = Wd / Ht; camera.updateProjectionMatrix();
    const t = Math.tan((cam.fov / 2) * Math.PI / 180), aspect = Wd / Ht;
    const narrow = Wd < 720;
    cam.radius = Math.max((narrow ? 3.0 : 3.05) / t, (narrow ? 3.8 : 4.7) / (t * aspect));
    cam.target.set(narrow ? -0.05 : -0.2, narrow ? 0.6 : 0.85, narrow ? -0.45 : -0.75);
  }
  fit(); const ro = new ResizeObserver(fit); ro.observe(container);

  // pointer + touch parallax (does not block scrolling)
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (cx, cy) => { const r = container.getBoundingClientRect(); if (cy < r.top - 80 || cy > r.bottom + 80) return; mouse.tx = clamp((cx - r.left) / r.width * 2 - 1, -1, 1); mouse.ty = clamp((cy - r.top) / r.height * 2 - 1, -1, 1); };
  const pm = (e) => onMove(e.clientX, e.clientY); const tm = (e) => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); };
  const pl = () => { mouse.tx = 0; mouse.ty = 0; };
  addEventListener('pointermove', pm, { passive: true }); container.addEventListener('touchmove', tm, { passive: true }); container.addEventListener('pointerleave', pl);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // day / night crossfade (follows <html data-theme>)
  const day = { sky: new THREE.Color(L.sky), ground: new THREE.Color(L.ground), sunC: new THREE.Color(L.sunColor), fillC: new THREE.Color(L.fillColor) };
  const eve = { sky: new THREE.Color(NC.sky), ground: new THREE.Color(NC.ground), sunC: new THREE.Color(NC.sunColor), fillC: new THREE.Color(NC.fillColor) };
  let nT = 0, nGoal = 0;
  function applyNight(t) {
    hemi.color.copy(day.sky).lerp(eve.sky, t); hemi.groundColor.copy(day.ground).lerp(eve.ground, t); hemi.intensity = lerp(L.hemi, NC.hemi, t);
    sun.color.copy(day.sunC).lerp(eve.sunC, t); sun.intensity = lerp(L.sun, NC.sun, t);
    fill.color.copy(day.fillC).lerp(eve.fillC, t); fill.intensity = lerp(L.fill, NC.fill, t);
    renderer.toneMappingExposure = lerp(1, NC.exposure, t); scene.environmentIntensity = lerp(0.45, NC.env, t);
    lampL.intensity = 5.5 * t; monL.intensity = 1.6 * t; lapL.intensity = 0.8 * t; ceilL.intensity = 1.4 * t;
    refs.bulbM.emissiveIntensity = 0.2 + 2.6 * t; refs.dropsMat.opacity = 0.85 * t; refs.glass.opacity = 0.1 + 0.06 * t;
    prague.setNight(t);
  }
  const isDark = () => document.documentElement.dataset.theme === 'dark';
  nT = nGoal = isDark() ? 1 : 0; applyNight(nT);
  const mo = new MutationObserver(() => { nGoal = isDark() ? 1 : 0; }); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ---- animation: a calm loop of typing, glancing, sipping, stretching
  const cur = { L: { x: -0.55, z: -0.16, el: -1.08 }, R: { x: -0.55, z: 0.16, el: -1.08 }, spine: -0.06, hx: 0.1, hy: 0 };
  let action = 'type', actT = 0, nextAct = 7, actIdx = 0, glance = 0, glanceT = 0, nextGlance = 2.5;
  const SEQ = ['sip', 'think', 'sip', 'stretch'];
  const LABEL = { type: ['Writing HTML', 'Styling with CSS', 'Building the hero', 'Fixing the mobile layout'], sip: 'Coffee break', stretch: 'Quick stretch', think: 'Thinking it through' };
  let label = LABEL.type[0], labelIdx = 0;
  const forced = new URLSearchParams(location.search).get('pose');
  const DEBUG_VIEW = new URLSearchParams(location.search).has('view');
  function poseTarget() {
    if (forced && POSES[forced]) return POSES[forced];
    if (action === 'sip') { if (actT < 0.9) return POSES.reach; if (actT < 3.4) return POSES.sip; if (actT < 4.3) return POSES.reach; return POSES.type; }
    if (action === 'stretch') return actT < 2.6 ? POSES.stretch : POSES.type;
    if (action === 'think') return actT < 3.2 ? POSES.think : POSES.type;
    return POSES.type;
  }
  function stepGuy(dt, time) {
    actT += dt;
    if (action === 'type' && actT > nextAct) { action = SEQ[actIdx++ % SEQ.length]; actT = 0; label = LABEL[action]; }
    const len = action === 'sip' ? 5.0 : action === 'stretch' ? 3.6 : action === 'think' ? 4.0 : 0;
    if (action !== 'type' && actT > len) { action = 'type'; actT = 0; nextAct = 8 + Math.random() * 6; labelIdx = (labelIdx + 1) % LABEL.type.length; label = LABEL.type[labelIdx]; }
    if (forced === 'sip') { refs.deskMug.visible = false; handMug.visible = true; }
    else if (action === 'sip') { const holding = actT > 0.85 && actT < 4.25; handMug.visible = holding; refs.deskMug.visible = !holding; }
    else { handMug.visible = false; refs.deskMug.visible = true; }
    const P = poseTarget(); const k = action === 'stretch' ? 3.2 : 4.2;
    for (const s of ['L', 'R']) for (const a of ['x', 'z', 'el']) cur[s][a] = damp(cur[s][a], P[s][a], k, dt);
    cur.spine = damp(cur.spine, P.spine, 3, dt);
    // glance between monitor (left) and laptop (right) while typing
    if (action === 'type') { glanceT += dt; if (glanceT > nextGlance) { glance = glance > 0.1 ? -0.05 : (Math.random() < 0.6 ? 0.32 : -0.05); glanceT = 0; nextGlance = 2 + Math.random() * 4; } }
    const hyT = action === 'type' ? glance : P.head.y, hxT = P.head.x + (action === 'type' ? Math.sin(time * 1.3) * 0.02 : 0);
    cur.hx = damp(cur.hx, hxT, 3.5, dt); cur.hy = damp(cur.hy, hyT, 3, dt);
    const typing = action === 'type' && !forced || forced === 'type';
    const tA = typing ? 1 : 0;
    const A = guy.arms;
    // typing: small alternating finger taps from the elbow + wrist, slightly out of phase
    const tapL = tA * (Math.sin(time * 15.0) * 0.05 + Math.sin(time * 23.0) * 0.025), tapR = tA * (Math.sin(time * 13.0 + 1.7) * 0.05 + Math.sin(time * 21.0 + 0.4) * 0.025);
    A[1].sh.rotation.set(cur.L.x, 0, cur.L.z); A[1].el.rotation.set(cur.L.el + tapL, 0, 0); A[1].hand.rotation.x = 0.35 * tA + tapL * 2;
    A[-1].sh.rotation.set(cur.R.x, 0, cur.R.z); A[-1].el.rotation.set(cur.R.el + tapR, 0, 0); A[-1].hand.rotation.x = 0.35 * tA + tapR * 2;
    guy.spine.rotation.x = cur.spine + Math.sin(time * 0.9) * 0.012; // breathing
    guy.head.rotation.set(cur.hx, cur.hy, 0);
    return typing;
  }

  // chip that floats above his head (same style as Muse Swarm's robot status chips)
  const headW = new THREE.Vector3(); const proj = new THREE.Vector3();
  function placeChip() {
    if (!chip) return; guy.head.getWorldPosition(headW); headW.y += 0.75; proj.copy(headW).project(camera);
    const x = (proj.x * 0.5 + 0.5) * Wd, y = (-proj.y * 0.5 + 0.5) * Ht;
    chip.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    if (chip.dataset.label !== label) { chip.dataset.label = label; chip.querySelector('span').textContent = label; }
  }

  // render loop: pauses offscreen / hidden tab; fixed max dt
  let visible = true, last = performance.now(), time = 0, frames = 0, raf = 0, started = false, fpsAcc = 0, fpsN = 0;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }, { threshold: 0.01 }); io.observe(container);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } });
  const look = { x: 0, y: 0 };
  function tick(now) {
    raf = 0; if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt; frames++;
    fpsAcc += dt; fpsN++; if (fpsAcc > 1) { window.__cv.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    if (nT !== nGoal) { nT = clamp(nT + Math.sign(nGoal - nT) * dt / 0.9); applyNight(nT); }
    const typing = stepGuy(dt, time);
    refs.code.update(dt, typing); refs.site.update(dt); refs.glassRain.update(dt, nT > 0.02);
    refs.gems.forEach(([m, y, i]) => { m.rotation.y = time * 0.4 + i; m.rotation.x = time * 0.3 + i; m.position.y = y + Math.sin(time * 0.8 + i) * 0.08; });
    // camera
    mouse.x = damp(mouse.x, reduce.matches ? 0 : mouse.tx, 2.5, dt); mouse.y = damp(mouse.y, reduce.matches ? 0 : mouse.ty, 2.5, dt);
    const sway = reduce.matches ? 0 : Math.sin(time * 0.08) * cam.orbitAmp;
    const az = cam.azimuth + sway + mouse.x * cam.parallax, el = cam.elevation - mouse.y * 0.05;
    camera.position.set(cam.target.x + cam.radius * Math.cos(el) * Math.sin(az), cam.target.y + cam.radius * Math.sin(el), cam.target.z + cam.radius * Math.cos(el) * Math.cos(az));
    camera.lookAt(cam.target); camera.updateMatrixWorld();
    // window view: parallax follows the viewing angle so the city sits "behind" the glass
    look.x = (az - Math.PI / 4) * 0.9 + 0.38; look.y = mouse.y;
    prague.update(dt, time, look);
    renderer.setRenderTarget(rt); renderer.render(prague.scene, prague.camera); renderer.setRenderTarget(null);
    if (DEBUG_VIEW) { prague.camera.aspect = Wd / Ht; prague.camera.updateProjectionMatrix(); renderer.render(prague.scene, prague.camera); prague.camera.aspect = rtW / rtH; prague.camera.updateProjectionMatrix(); }
    else renderer.render(scene, camera);
    placeChip();
    if (!started) { started = true; window.__cv.ready = true; container.classList.add('is-ready'); onReady?.(); }
    window.__cv.frames = frames;
    raf = requestAnimationFrame(tick);
  }
  window.__cv = { ready: false, frames: 0, fps: 0, setNight: (v) => { nGoal = v ? 1 : 0; }, act: (a) => { action = a; actT = 0; label = LABEL[a] || label; } };
  raf = requestAnimationFrame(tick);
  return { dispose() { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); mo.disconnect(); removeEventListener('pointermove', pm); renderer.dispose(); } };
}

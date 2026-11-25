// Low-poly Prague seen through the window: red-tiled roofs, Tyn Church's twin spires, the castle on its hill.
// Rendered from its own eye-level camera into a texture that sits in the window pane (so the room stays a normal closed room).
import { THREE, makeKit } from './muse-engine.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function rand(seed) { let s = (Math.imul(seed + 0x9e37, 2654435761) ^ 0x5bd1e995) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function bakeGroup(group) {
  group.updateMatrixWorld(true); const buckets = new Map(), kill = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.keep) return;
    let g = o.geometry.clone().applyMatrix4(o.matrixWorld); if (g.index) g = g.toNonIndexed();
    for (const a of Object.keys(g.attributes)) if (!['position', 'normal'].includes(a)) g.deleteAttribute(a);
    const key = o.material.uuid; if (!buckets.has(key)) buckets.set(key, { m: o.material, gs: [] });
    buckets.get(key).gs.push(g); kill.push(o);
  });
  kill.forEach((o) => o.parent.remove(o));
  for (const { m, gs } of buckets.values()) group.add(new THREE.Mesh(mergeGeometries(gs, false), m));
}

export function buildPrague() {
  const k = makeKit(true); const { mat, box, cyl } = k;
  const scene = new THREE.Scene();
  const city = new THREE.Group(); scene.add(city);
  const r = rand(7);
  const facades = ['#F4E3C3', '#F2C9A0', '#F7F5F1', '#F6D98B', '#E9C79A', '#CFE3D4', '#F4B9A0', '#FBEBD3'];
  const roofs = ['#C2492C', '#B5442A', '#D0573A', '#A93E26'];
  const fm = facades.map((c) => mat(c, { rough: 0.85 })), rm = roofs.map((c) => mat(c, { rough: 0.8 }));
  const chim = mat('#B36A4E');
  const winSpots = [];
  const prism = (w, h, d, m) => { // gable roof: triangular prism along x
    const sh = new THREE.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(0, h); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(-w / 2, 0, 0);
    return new THREE.Mesh(g, m);
  };
  const pyramid = (w, h, d, m) => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.scale(w, h, d); g.translate(0, h / 2, 0); return new THREE.Mesh(g, m); };

  function house(x, z, w, h, d, seed) {
    const rr = rand(seed);
    const body = box(w, h, d, fm[Math.floor(rr() * fm.length)]); body.position.set(x, h / 2, z); city.add(body);
    // cornice
    const cor = box(w + 0.08, 0.1, d + 0.08, mat('#FFFFFF')); cor.position.set(x, h + 0.05, z); city.add(cor);
    const rh = 0.9 + rr() * 1.1, roofM = rm[Math.floor(rr() * rm.length)];
    const roof = rr() < 0.72 ? prism(w + 0.12, rh, d + 0.12, roofM) : pyramid(w + 0.12, rh, d + 0.12, roofM);
    roof.position.set(x, h + 0.1, z); city.add(roof);
    if (rr() < 0.5) { const c = box(0.22, 0.6, 0.22, chim); c.position.set(x + (rr() - 0.5) * w * 0.6, h + rh * 0.6, z - d * 0.15); city.add(c); }
    if (rr() < 0.45) { // dormer
      const dm = box(0.42, 0.4, 0.3, fm[2]); dm.position.set(x + (rr() - 0.5) * w * 0.4, h + 0.35, z + d * 0.32); city.add(dm);
      const dr = prism(0.5, 0.25, 0.4, roofM); dr.position.set(dm.position.x, h + 0.55, dm.position.z); city.add(dr);
      winSpots.push([dm.position.x, h + 0.36, z + d * 0.32 + 0.16, 0.18, 0.2]);
    }
    // windows on the street face (+z)
    const cols = Math.max(2, Math.round(w / 0.55)), rows = Math.max(2, Math.round((h - 0.5) / 0.75));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const wx = x - w / 2 + (i + 0.5) * (w / cols), wy = 0.75 + j * ((h - 0.9) / rows);
      winSpots.push([wx, wy, z + d / 2 + 0.01, 0.22, 0.34]);
    }
  }

  // streets of houses, stepping back from the window
  const rows = [
    { z: -9, n: 9, y: -6.0 }, { z: -12, n: 10, y: -6.2 }, { z: -15, n: 11, y: -6.4 }, { z: -18.5, n: 12, y: -6.5 }, { z: -24, n: 13, y: -6.6 }, { z: -30, n: 14, y: -6.6 },
  ];
  rows.forEach((row, ri) => {
    let x = -16 + r() * 1.5;
    while (x < 16) {
      const w = 1.5 + r() * 1.3, h = 2.6 + r() * 2.2, d = 2 + r() * 0.6;
      if (!(ri >= 3 && ri <= 4 && x > -6.5 && x < -0.5)) house(x + w / 2, row.z, w, h, d, 100 + ri * 40 + Math.floor((x + 20) * 3));
      x += w + 0.08 + (r() < 0.15 ? 1.2 : 0);
    }
  });

  // ---- Tyn Church: two Gothic towers with spiky spires and four spirelets each, gold ball tips
  const tyn = new THREE.Group(); tyn.position.set(-3.6, 0, -21.5); city.add(tyn);
  const stone = new THREE.MeshStandardMaterial({ color: '#6E6862', roughness: 0.9, flatShading: true, emissive: '#FFB45A', emissiveIntensity: 0 });
  const slate = new THREE.MeshStandardMaterial({ color: '#3D4A4F', roughness: 0.7, flatShading: true, emissive: '#FFB45A', emissiveIntensity: 0 });
  const gold = new THREE.MeshStandardMaterial({ color: '#F6C53E', roughness: 0.35, metalness: 0.4, flatShading: true, emissive: '#F6C53E', emissiveIntensity: 0.15 });
  const nave = new THREE.Mesh(new THREE.BoxGeometry(3.4, 6.2, 6), stone); nave.position.set(0, 3.1, -3.2); tyn.add(nave);
  const naveRoof = prism(3.6, 3.2, 6.2, slate); naveRoof.rotation.y = Math.PI / 2; naveRoof.position.set(0, 6.2, -3.2); tyn.add(naveRoof);
  for (const sx of [-1, 1]) {
    const t = new THREE.Group(); t.position.x = sx * 1.25; tyn.add(t);
    const tw = new THREE.Mesh(new THREE.BoxGeometry(1.45, 9.5, 1.45), stone); tw.position.y = 4.75; t.add(tw);
    const gal = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.25, 1.7), slate); gal.position.y = 9.6; t.add(gal);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.95, 5.2, 8), slate); sp.position.y = 9.7 + 2.6; t.add(sp);
    const tip = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), gold); tip.position.y = 15.0; t.add(tip);
    for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.24, 2.0, 6), slate); s.position.set(ax * 0.72, 10.7, az * 0.72); t.add(s);
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), gold); b.position.set(ax * 0.72, 11.75, az * 0.72); t.add(b);
    }
    // tall gothic windows (lit at night)
    for (let j = 0; j < 3; j++) winSpots.push([-3.6 + sx * 1.25, 3.2 + j * 2.1, -21.5 + 0.74, 0.22, 0.8, true]);
  }
  // Tyn school gables in front
  for (let i = 0; i < 3; i++) house(-5.2 + i * 1.75, -18.3, 1.7, 3.2, 2, 900 + i);

  // ---- Prague Castle + St Vitus on the hill (far right)
  const hill = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat('#6FA35A', { rough: 0.95 })); hill.scale.set(26, 7, 10); hill.position.set(14, -1.5, -58); city.add(hill);
  const hill2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat('#5E9150', { rough: 0.95 })); hill2.scale.set(20, 5.5, 9); hill2.position.set(-14, -2.5, -62); city.add(hill2);
  const castleM = new THREE.MeshStandardMaterial({ color: '#EFE6D6', roughness: 0.9, flatShading: true, emissive: '#FFB45A', emissiveIntensity: 0 });
  const castle = new THREE.Group(); castle.position.set(11, 4.4, -55); city.add(castle);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(16, 2.2, 2.2), castleM); wing.position.y = 1.1; castle.add(wing);
  const wingRoof = prism(16.2, 1.2, 2.4, rm[0]); wingRoof.position.y = 2.2; castle.add(wingRoof);
  const vitus = new THREE.Mesh(new THREE.BoxGeometry(5, 4.4, 2.6), stone); vitus.position.set(-1.5, 2.2, -2.2); castle.add(vitus);
  const vr = prism(5.2, 2, 2.8, slate); vr.position.set(-1.5, 4.4, -2.2); castle.add(vr);
  [[-3.4, 7.5], [0.4, 9.5], [-0.6, 7.0]].forEach(([x, h], i) => {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.9, h, 0.9), stone); t.position.set(x, h / 2, -2.2); castle.add(t);
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.62, i === 1 ? 3.2 : 2.4, 8), i === 1 ? mat('#3F8F7E') : slate); s.position.set(x, h + (i === 1 ? 1.6 : 1.2), -2.2); castle.add(s);
  });
  for (let i = 0; i < 14; i++) winSpots.push([11 - 7.4 + i * 1.12, 4.4 + 1.1, -55 + 1.11, 0.28, 0.5, true]);

  // street ground + river band
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), mat('#7C8A86', { rough: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, -30); city.add(ground);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(120, 5), new THREE.MeshStandardMaterial({ color: '#4FA7B0', roughness: 0.25, metalness: 0.2, flatShading: true })); river.rotation.x = -Math.PI / 2; river.position.set(0, 0.02, -38); city.add(river);
  // a few low-poly trees along the river
  for (let i = 0; i < 16; i++) { const t = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), mat(['#3FAE77', '#2E9463', '#6CC36B'][i % 3])); t.position.set(-24 + i * 3.2 + r(), 1.0, -34.8 - r()); city.add(t); }

  bakeGroup(city);
  city.position.y = -6.4;

  // windows: two instanced sets, one lights up at night
  const winGeo = new THREE.PlaneGeometry(1, 1);
  const dark = new THREE.MeshStandardMaterial({ color: '#8FB6C4', roughness: 0.3, metalness: 0.1, flatShading: true });
  const lit = new THREE.MeshStandardMaterial({ color: '#9CC0CC', roughness: 0.3, emissive: '#FFC46B', emissiveIntensity: 0 });
  const litSpots = [], darkSpots = []; const lr = rand(42);
  winSpots.forEach((s) => (s[5] || lr() < 0.55 ? litSpots : darkSpots).push(s));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  const place = (list, m) => { const im = new THREE.InstancedMesh(winGeo, m, list.length); list.forEach(([x, y, z, w, h], i) => { p.set(x, y, z); sc.set(w, h, 1); im.setMatrixAt(i, m4.compose(p, q, sc)); }); city.add(im); return im; };
  place(darkSpots, dark); place(litSpots, lit);

  // sky dome: vertical gradient that crossfades day -> night
  const skyU = { top: { value: new THREE.Color('#8FD0E6') }, bot: { value: new THREE.Color('#FFE9C9') } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: skyU,
    vertexShader: 'varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying float vY; void main(){ float t = smoothstep(-0.05, 0.45, vY); gl_FragColor = vec4(mix(bot, top, t), 1.0); }',
  }));
  scene.add(sky);
  // stars (night only)
  const sp = []; const sr = rand(11); for (let i = 0; i < 160; i++) { const a = sr() * Math.PI * 1.2 - Math.PI * 1.1, e = 0.12 + sr() * 0.8; sp.push(Math.cos(a) * Math.cos(e) * 120, Math.sin(e) * 120, Math.sin(a) * Math.cos(e) * 120); }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#DFF6F4', size: 0.9, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false })); scene.add(stars);
  // low clouds by day
  const clouds = new THREE.Group(); const cm = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, flatShading: true, transparent: true, opacity: 0.95 });
  [[-14, 14, -70], [6, 17, -80], [22, 12, -72], [-30, 18, -85]].forEach(([x, y, z], i) => { const c = new THREE.Group(); for (let j = 0; j < 4; j++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + (j % 2), 0), cm); b.position.set(j * 2.4 - 3.6, (j % 2) * 0.8, 0); c.add(b); } c.position.set(x, y, z); clouds.add(c); });
  scene.add(clouds);

  // rain: streaks falling in front of the eye camera
  const N = 700; const rp = new Float32Array(N * 6); const rr2 = rand(5); const drops = [];
  for (let i = 0; i < N; i++) drops.push({ x: (rr2() - 0.5) * 22, y: rr2() * 16 - 8, z: -1.5 - rr2() * 16, v: 14 + rr2() * 8 });
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#BFE7F0', transparent: true, opacity: 0, depthWrite: false })); rain.frustumCulled = false; scene.add(rain);

  // lights
  const hemi = new THREE.HemisphereLight('#ffffff', '#c9d3cf', 1.3); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff3df', 2.2); sun.position.set(12, 18, 10); scene.add(sun);
  const moon = new THREE.DirectionalLight('#9fd6e0', 0); moon.position.set(-10, 14, 6); scene.add(moon);

  const camera = new THREE.PerspectiveCamera(52, 1.2, 0.1, 400); camera.position.set(0, 1.4, 0);
  const D = { top: new THREE.Color('#8FD0E6'), bot: new THREE.Color('#FFE9C9') }, Nn = { top: new THREE.Color('#020406'), bot: new THREE.Color('#0B1F24') };
  let lastN = -1;
  return {
    scene, camera,
    setNight(t) {
      if (Math.abs(t - lastN) < 1e-4) return; lastN = t;
      skyU.top.value.copy(D.top).lerp(Nn.top, t); skyU.bot.value.copy(D.bot).lerp(Nn.bot, t);
      hemi.intensity = 1.3 - 1.05 * t; hemi.color.set('#ffffff').lerp(new THREE.Color('#5f8a96'), t); hemi.groundColor.set('#c9d3cf').lerp(new THREE.Color('#1a1512'), t);
      sun.intensity = 2.2 * (1 - t); moon.intensity = 0.35 * t;
      lit.emissiveIntensity = 1.7 * t; stone.emissiveIntensity = 0.16 * t; slate.emissiveIntensity = 0.1 * t; castleM.emissiveIntensity = 0.32 * t; gold.emissiveIntensity = 0.15 + 0.6 * t;
      stars.material.opacity = t * 0.9; cm.opacity = 0.95 * (1 - t); clouds.visible = t < 0.98; rain.material.opacity = 0.5 * t; rain.visible = t > 0.02;
    },
    update(dt, t, look) {
      camera.rotation.set(-0.2 + look.y * 0.05, look.x, 0, 'YXZ');
      camera.position.x = -look.x * 1.2;
      clouds.position.x = Math.sin(t * 0.02) * 4;
      if (!rain.visible) return;
      for (let i = 0; i < N; i++) {
        const d = drops[i]; d.y -= d.v * dt; if (d.y < -9) { d.y = 8 + Math.random() * 2; d.x = (Math.random() - 0.5) * 22; }
        const o = i * 6; rp[o] = d.x; rp[o + 1] = d.y; rp[o + 2] = d.z; rp[o + 3] = d.x - 0.04; rp[o + 4] = d.y + 0.55; rp[o + 5] = d.z;
      }
      rainGeo.attributes.position.needsUpdate = true;
    },
  };
}

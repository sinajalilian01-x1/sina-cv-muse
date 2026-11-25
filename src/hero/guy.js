// Sina: a low-poly guy built from the same kit as the Muse Swarm robots (rounded boxes, capsules, flat shading).
// Rigged with simple pivots so he can type, glance between screens, sip coffee and stretch.
import { THREE } from './muse-engine.js';

export function buildGuy(k, C) {
  const { mat, rbox, sphere, cyl, capsule } = k;
  const skin = mat('#F0C29C'), skinD = mat('#E2AE86'), shirt = mat(C.teal), shirtD = mat(C.tealD), hair = mat('#3A2A22'), pants = mat('#26364F'), shoe = mat('#F7F7F4'), sole = mat(C.tang);
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const root = new THREE.Group(); // origin = seat surface, facing +z
  // legs
  root.add(at(rbox(0.5, 0.2, 0.38, 0.08, pants), 0, 0.1, 0.02));
  for (const sx of [-1, 1]) {
    root.add(at(rbox(0.2, 0.18, 0.52, 0.07, pants), sx * 0.13, 0.11, 0.27));
    root.add(at(rbox(0.18, 0.5, 0.18, 0.06, pants), sx * 0.13, -0.15, 0.5));
    root.add(at(rbox(0.2, 0.1, 0.3, 0.04, shoe), sx * 0.13, -0.43, 0.56));
    root.add(at(rbox(0.21, 0.03, 0.31, 0.02, sole), sx * 0.13, -0.49, 0.56));
  }
  const spine = new THREE.Group(); spine.position.set(0, 0.18, -0.02); root.add(spine);
  spine.add(at(rbox(0.58, 0.64, 0.36, 0.13, shirt), 0, 0.33, 0));
  spine.add(at(rbox(0.3, 0.06, 0.03, 0.02, mat(C.lemon)), 0, 0.42, -0.185)); // little stripe on the back of the tee
  spine.add(at(cyl(0.085, 0.095, 0.12, skinD), 0, 0.68, 0));
  const neck = new THREE.Group(); neck.position.y = 0.72; spine.add(neck);
  const head = new THREE.Group(); neck.add(head);
  head.add(at(rbox(0.42, 0.45, 0.41, 0.13, skin), 0, 0.22, 0.01));
  head.add(at(rbox(0.47, 0.17, 0.46, 0.08, hair), 0, 0.43, -0.01));
  head.add(at(rbox(0.46, 0.3, 0.13, 0.06, hair), 0, 0.28, -0.17));
  head.add(at(rbox(0.3, 0.09, 0.16, 0.04, hair), 0.06, 0.5, 0.09)); // swoop
  for (const sx of [-1, 1]) {
    head.add(at(rbox(0.06, 0.18, 0.2, 0.03, hair), sx * 0.215, 0.32, -0.05));
    const ear = sphere(0.055, skinD); ear.scale.set(0.6, 1, 0.8); head.add(at(ear, sx * 0.215, 0.2, 0));
    const eye = rbox(0.05, 0.06, 0.02, 0.01, mat('#1C2230')); head.add(at(eye, sx * 0.09, 0.24, 0.215));
  }
  // headphones around the neck: a small detail that reads as "developer" from behind
  const hp = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 5, 12, Math.PI * 1.25), mat(C.navy)); hp.rotation.set(Math.PI / 2, 0, Math.PI * 0.375); hp.position.set(0, 0.64, -0.02); spine.add(hp);
  for (const sx of [-1, 1]) spine.add(at(rbox(0.06, 0.12, 0.12, 0.03, mat(C.tang)), sx * 0.17, 0.62, 0.06));

  const arms = {};
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 0.33, 0.56, 0); spine.add(sh);
    sh.add(at(sphere(0.095, shirt), 0, 0, 0));
    const up = capsule(0.078, 0.22, shirt); up.position.y = -0.17; sh.add(up);
    sh.add(at(cyl(0.083, 0.083, 0.06, shirtD), 0, -0.25, 0));
    const el = new THREE.Group(); el.position.y = -0.36; sh.add(el);
    const fo = capsule(0.064, 0.2, skin); fo.position.y = -0.15; el.add(fo);
    const hand = new THREE.Group(); hand.position.y = -0.31; el.add(hand);
    hand.add(at(rbox(0.11, 0.12, 0.075, 0.03, skin), 0, -0.02, 0));
    arms[sx] = { sh, el, hand };
  }
  // sides: +1 is his left (world -x once he turns to face the desk), -1 his right
  return { root, spine, neck, head, arms };
}

// Pose targets (radians). x: forward swing (negative = forward/up), z: in/out, el: elbow bend (negative = bend forward).
export const POSES = {
  type: { L: { x: -0.55, z: -0.16, el: -1.08 }, R: { x: -0.55, z: 0.16, el: -1.08 }, spine: -0.06, head: { x: 0.1, y: 0 } },
  reach: { L: { x: -0.55, z: -0.16, el: -1.08 }, R: { x: -0.82, z: -0.08, el: -0.72 }, spine: -0.1, head: { x: 0.14, y: -0.25 } },
  sip: { L: { x: -0.55, z: -0.16, el: -1.08 }, R: { x: -0.95, z: 0.28, el: -2.35 }, spine: 0.04, head: { x: -0.12, y: -0.08 } },
  stretch: { L: { x: -2.85, z: 0.25, el: -0.25 }, R: { x: -2.85, z: -0.25, el: -0.25 }, spine: 0.16, head: { x: -0.22, y: 0 } },
  think: { L: { x: -0.4, z: -0.1, el: -0.95 }, R: { x: -0.95, z: 0.3, el: -2.2 }, spine: 0.08, head: { x: -0.05, y: 0.18 } },
};

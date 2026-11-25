// Live canvas textures for the desk screens: a code editor that types HTML/CSS, and the site preview it builds.
import { THREE } from './muse-engine.js';

const COL = {
  bg: '#0F1720', gutter: '#0B1118', num: '#3C4A58', tag: '#4FD1C7', attr: '#F6C53E', str: '#F49A7C',
  prop: '#F48AA6', val: '#9BE29B', text: '#E9EEF5', punc: '#8A98A8', com: '#5F6E7E', tab: '#16202B', tabOn: '#1E2B38',
};

// Each line is a list of [text, color] tokens. Kept short so the editor reads like real code from a distance.
const SNIPPETS = [
  [['<', 'punc'], ['section', 'tag'], [' class', 'attr'], ['=', 'punc'], ['"hero"', 'str'], ['>', 'punc']],
  [['  <', 'punc'], ['h1', 'tag'], ['>', 'punc'], ['Hello, Prague', 'text'], ['</', 'punc'], ['h1', 'tag'], ['>', 'punc']],
  [['  <', 'punc'], ['p', 'tag'], [' class', 'attr'], ['=', 'punc'], ['"lead"', 'str'], ['>', 'punc'], ['Design + code', 'text']],
  [['  <', 'punc'], ['a', 'tag'], [' href', 'attr'], ['=', 'punc'], ['"#projects"', 'str'], ['>', 'punc'], ['View work', 'text']],
  [['</', 'punc'], ['section', 'tag'], ['>', 'punc']],
  [['', 'text']],
  [['/* hero */', 'com']],
  [['.hero', 'tag'], [' {', 'punc']],
  [['  display', 'prop'], [': ', 'punc'], ['grid', 'val'], [';', 'punc']],
  [['  gap', 'prop'], [': ', 'punc'], ['24px', 'val'], [';', 'punc']],
  [['  background', 'prop'], [': ', 'punc'], ['#16A39C', 'str'], [';', 'punc']],
  [['  border-radius', 'prop'], [': ', 'punc'], ['18px', 'val'], [';', 'punc']],
  [['}', 'punc']],
  [['', 'text']],
  [['.card', 'tag'], [':hover', 'attr'], [' {', 'punc']],
  [['  transform', 'prop'], [': ', 'punc'], ['translateY(-3px)', 'val'], [';', 'punc']],
  [['}', 'punc']],
  [['', 'text']],
  [['<', 'punc'], ['div', 'tag'], [' class', 'attr'], ['=', 'punc'], ['"cards"', 'str'], ['>', 'punc']],
  [['  <', 'punc'], ['article', 'tag'], [' class', 'attr'], ['=', 'punc'], ['"card"', 'str'], ['>', 'punc']],
  [['    <', 'punc'], ['img', 'tag'], [' src', 'attr'], ['=', 'punc'], ['"muse.jpg"', 'str'], [' />', 'punc']],
  [['  </', 'punc'], ['article', 'tag'], ['>', 'punc']],
  [['</', 'punc'], ['div', 'tag'], ['>', 'punc']],
  [['', 'text']],
  [['@media', 'prop'], [' (max-width: 720px)', 'val'], [' {', 'punc']],
  [['  .cards', 'tag'], [' { ', 'punc'], ['columns', 'prop'], [': ', 'punc'], ['1', 'val'], [' }', 'punc']],
  [['}', 'punc']],
  [['', 'text']],
];
const lineLen = (l) => l.reduce((n, [t]) => n + t.length, 0);

export class CodeScreen {
  constructor(w = 640, h = 364) {
    this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h; this.g = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    this.done = []; this.idx = 0; this.chars = 0; this.scroll = 0; this.scrollT = 0; this.blink = 0; this.acc = 0;
    // start with a few lines already written
    for (let i = 0; i < 9; i++) this.done.push(SNIPPETS[i]); this.idx = 9;
    this.onLine = null; this.draw();
  }
  update(dt, typing) {
    this.blink += dt; this.acc += dt;
    if (typing) {
      this.chars += dt * 15;
      const cur = SNIPPETS[this.idx % SNIPPETS.length];
      if (this.chars >= lineLen(cur) + 2) {
        this.done.push(cur); this.idx++; this.chars = 0; this.onLine?.(this.idx);
        if (this.done.length > 60) this.done.splice(0, this.done.length - 60);
      }
    }
    if (this.acc < 1 / 12) return; this.acc = 0; this.draw();
  }
  draw() {
    const { g, c } = this; const W = c.width, H = c.height; const s = W / 640;
    g.fillStyle = COL.bg; g.fillRect(0, 0, W, H);
    // tabs
    g.fillStyle = COL.tab; g.fillRect(0, 0, W, 34 * s);
    [['index.html', COL.tag, true], ['style.css', COL.prop, false], ['main.js', COL.attr, false]].forEach(([t, col, on], i) => {
      const x = 8 * s + i * 132 * s; g.fillStyle = on ? COL.tabOn : COL.tab; g.fillRect(x, 4 * s, 126 * s, 30 * s);
      g.fillStyle = col; g.fillRect(x + 10 * s, 15 * s, 8 * s, 8 * s);
      g.fillStyle = on ? COL.text : COL.num; g.font = `${15 * s}px ui-monospace, Menlo, monospace`; g.textBaseline = 'middle'; g.fillText(t, x + 26 * s, 20 * s);
    });
    const lh = 22 * s, top = 44 * s, rows = Math.floor((H - top - 6 * s) / lh);
    const cur = SNIPPETS[this.idx % SNIPPETS.length];
    const all = [...this.done, null]; const first = Math.max(0, all.length - rows);
    g.fillStyle = COL.gutter; g.fillRect(0, 34 * s, 46 * s, H);
    g.font = `${15.5 * s}px ui-monospace, Menlo, monospace`; g.textBaseline = 'middle';
    for (let r = 0; r < rows && first + r < all.length; r++) {
      const ln = all[first + r]; const y = top + r * lh + lh / 2;
      g.fillStyle = COL.num; g.textAlign = 'right'; g.fillText(String(first + r + 1 + Math.max(0, this.idx - this.done.length)), 38 * s, y); g.textAlign = 'left';
      let x = 58 * s;
      if (ln) { for (const [t, k] of ln) { g.fillStyle = COL[k]; g.fillText(t, x, y); x += g.measureText(t).width; } }
      else {
        // the line being typed, with a caret
        g.fillStyle = 'rgba(79,209,199,0.07)'; g.fillRect(46 * s, y - lh / 2, W, lh);
        let left = Math.floor(this.chars);
        for (const [t, k] of cur) { if (left <= 0) break; const part = t.slice(0, left); left -= t.length; g.fillStyle = COL[k]; g.fillText(part, x, y); x += g.measureText(part).width; }
        if ((this.blink % 1) < 0.6) { g.fillStyle = COL.tag; g.fillRect(x + 1, y - 9 * s, 2.2 * s, 18 * s); }
      }
    }
    // minimap
    g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(W - 42 * s, 40 * s, 34 * s, H - 48 * s);
    for (let i = 0; i < 26; i++) { g.fillStyle = [COL.tag, COL.prop, COL.str, COL.attr][i % 4] + '55'; g.fillRect(W - 38 * s, 46 * s + i * 11 * s, (8 + ((i * 37) % 20)) * s, 3 * s); }
    this.tex.needsUpdate = true;
  }
}

const ACCENTS = ['#16A39C', '#F47A38', '#F6C53E', '#F48AA6'];
export class SiteScreen {
  constructor(w = 512, h = 320) {
    this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h; this.g = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    this.t = 0; this.acc = 0; this.accent = 0; this.flash = 0; this.draw();
  }
  reload() { this.accent = (this.accent + 1) % ACCENTS.length; this.flash = 1; }
  update(dt) { this.t += dt; this.acc += dt; this.flash = Math.max(0, this.flash - dt * 1.6); if (this.acc < 1 / 10) return; this.acc = 0; this.draw(); }
  draw() {
    const { g, c } = this; const W = c.width, H = c.height; const s = W / 512;
    const rr = (x, y, w, h, r, col) => { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
    g.fillStyle = '#F7F8F6'; g.fillRect(0, 0, W, H);
    // browser chrome
    g.fillStyle = '#E6EAEC'; g.fillRect(0, 0, W, 26 * s);
    ['#F47A38', '#F6C53E', '#16A39C'].forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.arc((14 + i * 14) * s, 13 * s, 4.2 * s, 0, 7); g.fill(); });
    rr(70 * s, 6 * s, 300 * s, 14 * s, 7 * s, '#FFFFFF');
    // page scrolls gently up and down
    const sc = (Math.sin(this.t * 0.25) * 0.5 + 0.5) * 120 * s;
    g.save(); g.beginPath(); g.rect(0, 26 * s, W, H - 26 * s); g.clip(); g.translate(0, 26 * s - sc);
    const acc = ACCENTS[this.accent];
    // nav
    rr(18 * s, 12 * s, 86 * s, 10 * s, 5 * s, '#13243F');
    [0, 1, 2, 3].forEach((i) => rr((300 + i * 50) * s, 13 * s, 36 * s, 8 * s, 4 * s, '#9AA6B4'));
    // hero block
    rr(18 * s, 38 * s, W - 36 * s, 150 * s, 14 * s, acc);
    rr(40 * s, 70 * s, 200 * s, 22 * s, 6 * s, 'rgba(255,255,255,0.95)');
    rr(40 * s, 102 * s, 150 * s, 10 * s, 5 * s, 'rgba(255,255,255,0.7)');
    rr(40 * s, 118 * s, 120 * s, 10 * s, 5 * s, 'rgba(255,255,255,0.7)');
    rr(40 * s, 144 * s, 84 * s, 24 * s, 8 * s, '#13243F');
    // low-poly hill motif in hero
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.moveTo(300 * s, 188 * s); g.lineTo(360 * s, 110 * s); g.lineTo(410 * s, 150 * s); g.lineTo(450 * s, 96 * s); g.lineTo(494 * s, 188 * s); g.fill();
    // cards
    for (let i = 0; i < 3; i++) {
      const x = 18 * s + i * ((W - 36 * s - 24 * s) / 3 + 12 * s), w = (W - 36 * s - 24 * s) / 3;
      rr(x, 204 * s, w, 120 * s, 10 * s, '#FFFFFF');
      rr(x + 8 * s, 212 * s, w - 16 * s, 58 * s, 7 * s, ACCENTS[(this.accent + i + 1) % 4] + 'cc');
      rr(x + 8 * s, 280 * s, w * 0.6, 9 * s, 4 * s, '#13243F'); rr(x + 8 * s, 296 * s, w * 0.8, 7 * s, 3 * s, '#B5BFCA');
    }
    // skill pills row
    for (let i = 0; i < 5; i++) rr((18 + i * 96) * s, 342 * s, 84 * s, 20 * s, 10 * s, ['#DDF3F1', '#FFE9DC', '#FFF4D2', '#FDE3EA', '#E8F5F4'][i]);
    g.restore();
    if (this.flash > 0) { g.fillStyle = `rgba(79,209,199,${0.25 * this.flash})`; g.fillRect(0, 26 * s, W, H); }
    this.tex.needsUpdate = true;
  }
}

// Raindrops sliding down the window glass (night).
export class GlassRain {
  constructor(w = 256, h = 224) {
    this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h; this.g = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace;
    this.drops = Array.from({ length: 46 }, () => this.spawn(true)); this.acc = 0;
  }
  spawn(any) { const { width: w, height: h } = this.c; return { x: Math.random() * w, y: any ? Math.random() * h : -10, r: 1.2 + Math.random() * 2.4, v: 6 + Math.random() * 40, hold: Math.random() * 2 }; }
  update(dt, on) {
    if (!on) return; this.acc += dt; if (this.acc < 1 / 20) return; const step = this.acc; this.acc = 0;
    const { g, c } = this; g.clearRect(0, 0, c.width, c.height);
    for (const d of this.drops) {
      if (d.hold > 0) d.hold -= step; else { d.y += d.v * step; d.x += Math.sin(d.y * 0.08) * 0.15; }
      if (d.y > c.height + 8) Object.assign(d, this.spawn(false));
      g.strokeStyle = 'rgba(200,236,244,0.28)'; g.lineWidth = d.r * 0.7; g.beginPath(); g.moveTo(d.x, d.y - d.r * (d.hold > 0 ? 0 : 5)); g.lineTo(d.x, d.y); g.stroke();
      g.fillStyle = 'rgba(220,244,250,0.55)'; g.beginPath(); g.arc(d.x, d.y, d.r, 0, 7); g.fill();
    }
    this.tex.needsUpdate = true;
  }
}

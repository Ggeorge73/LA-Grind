// Sprint 12 (LAG-94): the 3D apartment, ported from the approved prototype (prototypes/home-and-runner.html).
// Imperative three.js: one renderer for the life of the page. React feeds it state through `update`,
// `walkTo` and `pose`; it reports taps on hotspot markers through `onPick`. Loaded with a dynamic import,
// so three lands in its own chunk.
import * as THREE from 'three';
import type { HotspotId } from '../../sim/actions';
import type { PoseSpec } from './spots';

export interface HomeSceneOptions {
  /** Emoji per hotspot for the floating white badges. */
  icons: Record<HotspotId, string>;
  reducedMotion: boolean;
  onPick(id: HotspotId): void;
}

/** What the room shows this frame. Cheap to call on every store change. */
export interface HomeFrame {
  minute: number;
  busy: boolean;
  selected: HotspotId | null;
  /** Spots with nothing to do yet: their rings glow dimmer. */
  dim: readonly HotspotId[];
  /** TV leisure is running: the screen glows. */
  tvOn: boolean;
}

export interface HomeScene {
  update(frame: HomeFrame): void;
  /** Walk the character to a spot (through the hallway when it's far), then call `done`. */
  walkTo(id: HotspotId, done: () => void): void;
  /** Hold a pose for a running activity, or `null` to stand up and idle. */
  pose(p: PoseSpec | null): void;
  /** Pause rendering (room hidden, phone over it, tab hidden). */
  setActive(on: boolean): void;
  dispose(): void;
}

type V2 = [number, number];

/** Marker position (badge) and where the character stands to use each spot. Prototype coordinates. */
const SPOTS: Record<HotspotId, { at: [number, number, number]; stand: V2; face: V2 }> = {
  bed: { at: [3.6, 1.0, -2.6], stand: [2.4, -1.8], face: [3.6, -3.0] },
  desk: { at: [-5.45, 1.5, -0.4], stand: [-4.6, -0.4], face: [-5.5, -0.4] },
  ringlight: { at: [-5.3, 2.35, -3.4], stand: [-4.6, -2.8], face: [-5.3, -3.4] },
  tv: { at: [-3, 1.95, -4.1], stand: [-3, -1.9], face: [-3, -4.1] },
  fridge: { at: [5.4, 2.3, 0.6], stand: [4.4, 0.9], face: [5.4, 0.6] },
  shower: { at: [-5.3, 2.3, 3.8], stand: [-4.6, 2.6], face: [-5.3, 3.8] },
  table: { at: [2.8, 1.6, 2.6], stand: [2.3, 1.8], face: [2.8, 2.6] },
  door: { at: [-1.2, 2.3, 4.4], stand: [-1.2, 3.4], face: [-1.2, 4.45] },
};
const CENTER: V2 = [-1.6, 0.1];
const HALL: V2 = [-0.6, 0.6];
/** Doorway into the bedroom corner, so the walk skirts the wardrobe. */
const BEDROOM_DOOR: V2 = [0.4, -1.5];
const inBedroom = (x: number, z: number) => x > 1 && z < -0.3;

/** Seated / lying placements: [x, y, z, yaw] (lying adds the −90° pitch). */
const SEATS: Partial<Record<HotspotId, [number, number, number, number]>> = {
  bed: [3.6, 0.7, -2.4, 0],
  desk: [-4.82, 0, -0.4, -Math.PI / 2],
  tv: [-3, 0, -1.05, Math.PI],
};

const WALK_SPEED = 3.4;

function emojiTexture(emoji: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.beginPath();
  g.arc(64, 64, 58, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = '#ff8a3d';
  g.stroke();
  g.font = '62px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(emoji, 64, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createHomeScene(canvas: HTMLCanvasElement, opts: HomeSceneOptions): HomeScene {
  // Match the prototype's (r128) look: no color management, linear output, legacy-strength lights.
  THREE.ColorManagement.enabled = false;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const LEGACY = Math.PI; // r155+ physical light units: legacy intensity × π looks the same

  const disposables: { dispose(): void }[] = [];
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (hex: number, extra: THREE.MeshStandardMaterialParameters = {}) => {
    const key = hex + JSON.stringify(extra);
    let m = mats.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, ...extra });
      mats.set(key, m);
      disposables.push(m);
    }
    return m;
  };
  const geo = <G extends THREE.BufferGeometry>(g: G): G => {
    disposables.push(g);
    return g;
  };
  function mkBox(parent: THREE.Object3D, w: number, h: number, d: number, color: number, x: number, y: number, z: number, extra: THREE.MeshStandardMaterialParameters = {}, shadow = true) {
    const m = new THREE.Mesh(geo(new THREE.BoxGeometry(w, h, d)), mat(color, extra));
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function mkCyl(parent: THREE.Object3D, rt: number, rb: number, h: number, color: number, x: number, y: number, z: number, seg = 16, shadow = true) {
    const m = new THREE.Mesh(geo(new THREE.CylinderGeometry(rt, rb, h, seg)), mat(color));
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  // ---------- scene, lights ----------
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const hemi = new THREE.HemisphereLight(0xbfa9ff, 0x2a1b12, 0.55 * LEGACY);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2c0, 0.9 * LEGACY);
  sun.position.set(-8, 16, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number, extra?: THREE.MeshStandardMaterialParameters, shadow?: boolean) =>
    mkBox(scene, w, h, d, color, x, y, z, extra, shadow);
  const cyl = (rt: number, rb: number, h: number, color: number, x: number, y: number, z: number, seg?: number, shadow?: boolean) => mkCyl(scene, rt, rb, h, color, x, y, z, seg, shadow);

  // ---------- floating grass island ----------
  const island = new THREE.Mesh(geo(new THREE.CylinderGeometry(15, 14, 1.2, 40)), mat(0x3d5a3a));
  island.position.y = -0.7;
  island.receiveShadow = true;
  scene.add(island);
  const dirt = new THREE.Mesh(geo(new THREE.ConeGeometry(14, 6, 40)), mat(0x5a4030));
  dirt.position.y = -4.3;
  dirt.rotation.x = Math.PI;
  scene.add(dirt);
  const treeTop = geo(new THREE.IcosahedronGeometry(0.9, 0));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const r = 12.5;
    cyl(0.12, 0.16, 2.2, 0x6a4a34, Math.cos(a) * r, 1, Math.sin(a) * r, 8);
    const top = new THREE.Mesh(treeTop, mat(0x2f6f3e));
    top.position.set(Math.cos(a) * r, 2.4, Math.sin(a) * r);
    top.castShadow = true;
    scene.add(top);
  }

  // ---------- floor: warm wood checker, tiles in kitchen + bathroom ----------
  const W = 12;
  const D = 9;
  const tileGeo = geo(new THREE.BoxGeometry(1, 0.14, 1));
  for (let i = 0; i < W; i++)
    for (let j = 0; j < D; j++) {
      const x = -W / 2 + i + 0.5;
      const z = -D / 2 + j + 0.5;
      const tile = (z > 0.5 && x > 1) || (z > 1.5 && x < -3);
      const even = (i + j) % 2 === 0;
      const c = tile ? (even ? 0xe2d6c1 : 0xcdbfa6) : even ? 0x8e4b2c : 0x7b3e24;
      const t = new THREE.Mesh(tileGeo, mat(c));
      t.position.set(x, -0.07, z);
      t.receiveShadow = true;
      scene.add(t);
    }

  // ---------- walls (cutaway: the near walls are knee height) ----------
  const WALL = 0x2b2626;
  const H = 2.6;
  box(W, H, 0.24, WALL, 0, H / 2, -D / 2);
  box(0.24, H, D, WALL, -W / 2, H / 2, 0);
  box(W, 0.7, 0.24, WALL, 0, 0.35, D / 2);
  box(0.24, 0.7, D, WALL, W / 2, 0.35, 0);
  box(0.24, H, 2.6, WALL, 1, H / 2, -3.2);
  box(2.4, 0.9, 0.24, WALL, 4.8, 0.45, -0.4);
  box(3, 1.1, 0.24, WALL, -4.5, 0.55, 1.5);
  box(0.24, 1.1, 3, WALL, -3, 0.55, 3);
  const win = box(1.8, 1.1, 0.06, 0xffd9a0, 3.5, 1.6, -D / 2 + 0.14, { emissive: 0xffb36b, emissiveIntensity: 0.4 });
  const winMat = win.material as THREE.MeshStandardMaterial;
  box(1.2, 0.8, 0.04, 0x1a1a2e, -1.8, 1.7, -D / 2 + 0.12);
  box(1.0, 0.6, 0.05, 0xff6a3d, -1.8, 1.7, -D / 2 + 0.13, { emissive: 0x6a1d0a, emissiveIntensity: 0.4 });

  // ---------- living room ----------
  box(3.4, 0.04, 2.4, 0x4b2a5a, -3, 0.02, -2.2, {}, false);
  const sofa = new THREE.Group();
  scene.add(sofa);
  sofa.position.set(-3, 0, -1.1);
  mkBox(sofa, 2.4, 0.45, 0.9, 0xc25b4c, 0, 0.3, 0);
  mkBox(sofa, 2.4, 0.6, 0.25, 0xa94b3e, 0, 0.6, 0.35);
  mkBox(sofa, 0.25, 0.55, 0.9, 0xa94b3e, -1.2, 0.4, 0);
  mkBox(sofa, 0.25, 0.55, 0.9, 0xa94b3e, 1.2, 0.4, 0);
  box(2.2, 0.5, 0.45, 0x5a3b2a, -3, 0.25, -4.1);
  box(1.8, 1.0, 0.08, 0x111111, -3, 1.05, -4.15);
  const tvMat = new THREE.MeshStandardMaterial({ color: 0x3a6fd8, roughness: 0.85, emissive: 0x1e3c88, emissiveIntensity: 0.6 });
  disposables.push(tvMat);
  const tvScreen = new THREE.Mesh(geo(new THREE.BoxGeometry(1.65, 0.86, 0.02)), tvMat);
  tvScreen.position.set(-3, 1.05, -4.1);
  scene.add(tvScreen);
  cyl(0.22, 0.18, 0.4, 0x8a5a3c, -0.2, 0.2, -4.0);
  const bush = new THREE.Mesh(geo(new THREE.IcosahedronGeometry(0.42, 0)), mat(0x2f8f4e));
  bush.position.set(-0.2, 0.8, -4.0);
  bush.castShadow = true;
  scene.add(bush);
  // ring light
  cyl(0.02, 0.02, 1.6, 0x222222, -5.3, 0.8, -3.4, 6, false);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, emissive: 0xffffff, emissiveIntensity: 0.7 });
  disposables.push(ringMat);
  const ring = new THREE.Mesh(geo(new THREE.TorusGeometry(0.34, 0.07, 10, 30)), ringMat);
  ring.position.set(-5.3, 1.75, -3.4);
  ring.rotation.y = Math.PI / 4;
  scene.add(ring);
  // desk + laptop + chair
  box(0.8, 0.06, 1.6, 0xb98a5a, -5.5, 0.78, -0.4);
  for (const [lx, lz] of [
    [-5.8, 0.3],
    [-5.8, -1.1],
    [-5.2, 0.3],
    [-5.2, -1.1],
  ] as const)
    box(0.06, 0.78, 0.06, 0x4a3628, lx, 0.39, lz, {}, false);
  box(0.5, 0.03, 0.36, 0x9aa0aa, -5.45, 0.83, -0.4);
  const lap = box(0.03, 0.32, 0.36, 0x9aa0aa, -5.68, 1.0, -0.4);
  lap.rotation.z = 0.15;
  const lapScreen = box(0.012, 0.26, 0.3, 0x5a7bd8, -5.66, 1.0, -0.4, { emissive: 0x2a4aa8, emissiveIntensity: 0.5 }, false);
  lapScreen.rotation.z = 0.15;
  box(0.5, 0.08, 0.5, 0x333344, -4.8, 0.48, -0.4);
  box(0.08, 0.5, 0.5, 0x333344, -4.55, 0.75, -0.4);

  // ---------- bedroom ----------
  box(2.0, 0.4, 2.6, 0x3b2a22, 3.6, 0.2, -3.0);
  box(1.9, 0.18, 2.5, 0xeee6dc, 3.6, 0.48, -3.0);
  box(1.9, 0.12, 1.5, 0x4b2f7a, 3.6, 0.62, -2.5);
  box(1.5, 0.15, 0.4, 0xffffff, 3.6, 0.62, -3.95);
  box(2.0, 0.9, 0.12, 0x3b2a22, 3.6, 0.65, -4.32);
  cyl(0.04, 0.04, 1.4, 0x222222, 5.5, 0.7, -3.9, 6, false);
  const lampShade = cyl(0.18, 0.28, 0.32, 0xffe7b8, 5.5, 1.45, -3.9);
  lampShade.material = mat(0xffe7b8, { emissive: 0xffc070, emissiveIntensity: 0.6 });
  const lampLight = new THREE.PointLight(0xffc27a, 0.6, 6, 1);
  lampLight.position.set(5.5, 1.4, -3.9);
  scene.add(lampLight);
  box(1.0, 2.0, 0.6, 0x6a4a34, 1.7, 1.0, -0.9);
  box(0.04, 1.4, 0.6, 0xbfd9e8, 5.85, 1.1, -1.6, { metalness: 0.6, roughness: 0.15 });

  // ---------- kitchen ----------
  box(0.9, 0.9, 3.2, 0xe8d9bf, 5.45, 0.45, 2.7);
  box(0.95, 0.06, 3.25, 0x7a6a58, 5.45, 0.92, 2.7);
  box(0.6, 0.04, 0.6, 0x222222, 5.45, 0.96, 3.6, {}, false);
  box(0.5, 0.06, 0.4, 0xa9b7c2, 5.45, 0.94, 2.0, {}, false);
  box(0.9, 1.9, 0.8, 0xdfe5ea, 5.4, 0.95, 0.6);
  box(0.04, 0.6, 0.06, 0x9aa0aa, 4.95, 1.2, 0.4, {}, false);
  cyl(0.65, 0.65, 0.06, 0x8a5a3c, 2.8, 0.76, 2.6, 24);
  cyl(0.08, 0.12, 0.74, 0x5a3b2a, 2.8, 0.37, 2.6, 10, false);
  for (const cx of [2.0, 3.6]) {
    box(0.45, 0.06, 0.45, 0x8a3a2a, cx, 0.48, 2.6);
    box(0.45, 0.5, 0.06, 0x8a3a2a, cx, 0.75, 2.6 + (cx < 2.8 ? -0.2 : 0.2));
  }
  box(0.14, 0.18, 0.14, 0xff7a3d, 2.6, 0.88, 2.4);

  // ---------- bathroom ----------
  box(1.2, 0.08, 1.2, 0xd6e6ee, -5.3, 0.05, 3.8);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.25 });
  disposables.push(glassMat);
  const glass = new THREE.Mesh(geo(new THREE.BoxGeometry(1.2, 1.9, 0.05)), glassMat);
  glass.position.set(-5.3, 0.95, 3.2);
  scene.add(glass);
  box(0.5, 0.45, 0.6, 0xf4f4f4, -3.6, 0.23, 4.0);

  // ---------- front door ----------
  box(1.0, 0.04, 0.6, 0x6a4a2a, -1.2, 0.03, 4.1, {}, false);
  box(1.0, 1.9, 0.08, 0x7a4a2a, -1.2, 0.95, 4.45, { emissive: 0x2a1408, emissiveIntensity: 0.3 });

  // ---------- the character (pivots at hips and shoulders so it can sit and walk) ----------
  const hero = new THREE.Group();
  const skin = 0x8d5a3b;
  const pants = 0x2a2f4a;
  const limb = (x: number, y: number) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    hero.add(p);
    return p;
  };
  const legL = limb(-0.11, 0.62);
  const legR = limb(0.11, 0.62);
  for (const leg of [legL, legR]) {
    mkBox(leg, 0.18, 0.62, 0.2, pants, 0, -0.31, 0);
    mkBox(leg, 0.2, 0.1, 0.3, 0xe8e2d8, 0, -0.57, 0.04); // sneakers
  }
  mkBox(hero, 0.5, 0.62, 0.3, 0x2f9e6a, 0, 0.93, 0);
  const armL = limb(-0.33, 1.2);
  const armR = limb(0.33, 1.2);
  mkBox(armL, 0.14, 0.56, 0.16, skin, 0, -0.27, 0);
  mkBox(armR, 0.14, 0.56, 0.16, skin, 0, -0.27, 0);
  const head = new THREE.Mesh(geo(new THREE.SphereGeometry(0.24, 16, 12)), mat(skin));
  head.position.set(0, 1.47, 0);
  head.castShadow = true;
  hero.add(head);
  const hair = new THREE.Mesh(geo(new THREE.SphereGeometry(0.255, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)), mat(0x1b120c));
  hair.position.set(0, 1.5, 0);
  hair.castShadow = true;
  hero.add(hair);
  const crown = mkCyl(hero, 0.08, 0.1, 0.06, 0xffc83d, 0, 1.78, 0, 5);
  const backpack = mkBox(hero, 0.32, 0.4, 0.14, 0x3b3b4a, 0, 0.98, -0.22);
  scene.add(hero);
  hero.position.set(-2.3, 0, -0.1);
  const selRing = new THREE.Mesh(
    geo(new THREE.RingGeometry(0.34, 0.46, 32)),
    new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  );
  disposables.push(selRing.material as THREE.Material);
  selRing.rotation.x = -Math.PI / 2;
  selRing.position.y = 0.03;
  hero.add(selRing);

  // ---------- hotspot markers: white emoji badge + glowing ring on the floor ----------
  const haloGeo = geo(new THREE.RingGeometry(0.42, 0.58, 32));
  const markers = (Object.keys(SPOTS) as HotspotId[]).map((id) => {
    const s = SPOTS[id];
    const tex = emojiTexture(opts.icons[id]);
    disposables.push(tex);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    disposables.push(spriteMat);
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(...s.at);
    sprite.renderOrder = 10;
    sprite.userData.id = id;
    scene.add(sprite);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x9cff6a, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    disposables.push(haloMat);
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(s.stand[0], 0.04, s.stand[1]);
    halo.userData.id = id;
    scene.add(halo);
    return { id, sprite, halo, haloMat, phase: s.at[0] };
  });
  const pickables = markers.flatMap((m) => [m.sprite, m.halo]);

  // ---------- camera: orbit around the room, clamped ----------
  let yaw = Math.PI / 4;
  let pitch = 0.82;
  let dist = 19;
  let distGoal = 19;
  const target = new THREE.Vector3(0, 0.6, 0.2);
  let markerScale = 0.62;
  const placeCam = () => {
    cam.position.set(target.x + dist * Math.cos(pitch) * Math.sin(yaw), target.y + dist * Math.sin(pitch), target.z + dist * Math.cos(pitch) * Math.cos(yaw));
    cam.lookAt(target);
    // Badges grow a little when zoomed out, so they stay finger-sized on phones.
    markerScale = 0.62 * Math.max(1, dist / 22);
  };
  let lastW = 0;
  let lastH = 0;
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h || (w === lastW && h === lastH)) return;
    const small = w < 600;
    if (lastW === 0 || small !== lastW < 600) {
      dist = distGoal = small ? 36 : 19;
      target.set(small ? 0.6 : 0, 0.6, small ? 0.6 : 0.2);
    }
    lastW = w;
    lastH = h;
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    cam.updateProjectionMatrix();
    placeCam();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // ---------- input: drag to turn, wheel / pinch to zoom, tap to pick ----------
  const pointers = new Map<number, { x: number; y: number }>();
  let drag: { x: number; y: number; yaw: number; pitch: number; moved: boolean } | null = null;
  let pinch: { d: number; dist: number } | null = null;
  const pinchDist = () => {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pick = (x: number, y: number) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(pickables, false).find((h) => h.object.visible);
    const id = hit?.object.userData.id as HotspotId | undefined;
    if (id) opts.onPick(id);
  };
  const onDown = (e: PointerEvent) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    if (pointers.size === 2) {
      drag = null;
      pinch = { d: pinchDist(), dist: distGoal };
    } else if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, yaw, pitch, moved: false };
  };
  const onMove = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const d = pinchDist();
      if (pinch.d > 0 && d > 0) distGoal = THREE.MathUtils.clamp((pinch.dist * pinch.d) / d, 11, 36);
      if (opts.reducedMotion) dist = distGoal;
      placeCam();
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) {
      drag.moved = true;
      canvas.classList.add('dragging');
    }
    if (!drag.moved) return;
    yaw = THREE.MathUtils.clamp(drag.yaw - dx * 0.006, -0.2, 1.6);
    pitch = THREE.MathUtils.clamp(drag.pitch + dy * 0.004, 0.45, 1.2);
    placeCam();
  };
  const onUp = (e: PointerEvent) => {
    canvas.classList.remove('dragging');
    const wasTap = drag && !drag.moved && pointers.size === 1;
    pointers.delete(e.pointerId);
    if (wasTap && e.type === 'pointerup') pick(e.clientX, e.clientY);
    drag = null;
    if (pointers.size < 2) pinch = null;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    distGoal = THREE.MathUtils.clamp(distGoal + e.deltaY * 0.01, 11, 36);
    if (opts.reducedMotion) {
      dist = distGoal;
      placeCam();
    }
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  // ---------- character: walking and poses ----------
  let path: V2[] = [];
  let onArrive: (() => void) | null = null;
  let held: PoseSpec | null = null;
  let seated: 'lie' | 'sit' | null = null;
  const posXZ = (): V2 => [hero.position.x, hero.position.z];
  const near = (a: V2, b: V2, eps = 0.15) => Math.hypot(a[0] - b[0], a[1] - b[1]) < eps;

  const faceTowards = (p: V2) => {
    hero.rotation.y = Math.atan2(p[0] - hero.position.x, p[1] - hero.position.z);
  };
  const standUp = () => {
    if (!seated) return;
    const from = held && held.spot !== 'center' ? SPOTS[held.spot].stand : CENTER;
    seated = null;
    hero.rotation.set(0, hero.rotation.y, 0);
    hero.position.set(from[0], 0, from[1]);
    legL.rotation.x = legR.rotation.x = 0;
    backpack.visible = true;
  };
  const route = (to: V2): V2[] => {
    const [x, z] = posXZ();
    const pts: V2[] = [];
    const far = Math.hypot(to[0] - x, to[1] - z) > 3;
    if (inBedroom(x, z) && !inBedroom(to[0], to[1])) pts.push(BEDROOM_DOOR);
    if (far) pts.push(HALL);
    if (inBedroom(to[0], to[1]) && !inBedroom(x, z)) pts.push(BEDROOM_DOOR);
    pts.push(to);
    return pts;
  };
  const goTo = (to: V2, done: () => void) => {
    standUp();
    if (opts.reducedMotion || near(posXZ(), to)) {
      hero.position.set(to[0], 0, to[1]);
      path = [];
      onArrive = null;
      done();
      return;
    }
    path = route(to);
    onArrive = done;
  };
  const applyHeld = () => {
    const p = held;
    if (!p) return;
    const spot = p.spot === 'center' ? null : SPOTS[p.spot];
    const seat = p.spot !== 'center' ? SEATS[p.spot] : undefined;
    if ((p.kind === 'lie' || p.kind === 'sit') && seat) {
      seated = p.kind;
      hero.position.set(seat[0], seat[1], seat[2]);
      backpack.visible = false;
      if (p.kind === 'lie') hero.rotation.set(-Math.PI / 2, 0, 0);
      else {
        hero.rotation.set(0, seat[3], 0);
        legL.rotation.x = legR.rotation.x = -Math.PI / 2;
      }
      return;
    }
    if (spot) faceTowards(spot.face);
    else hero.rotation.y = Math.PI / 4; // face the camera
  };

  // ---------- day / night from the game clock ----------
  const skyDay = new THREE.Color(0x8fb7e6);
  const skyDusk = new THREE.Color(0xff9a6a);
  const skyNight = new THREE.Color(0x1b1233);
  const sky = new THREE.Color();
  scene.background = sky;
  let frame: HomeFrame = { minute: 8 * 60, busy: false, selected: null, dim: [], tvOn: false };
  const applyTimeOfDay = () => {
    const h = (((frame.minute % 1440) + 1440) % 1440) / 60;
    let k: number;
    if (h >= 7 && h < 17) {
      sky.copy(skyDay);
      k = 1;
    } else if (h >= 17 && h < 20) {
      const t = (h - 17) / 3;
      sky.copy(skyDay).lerp(skyDusk, Math.min(1, t * 1.5)).lerp(skyNight, Math.max(0, t * 1.5 - 0.5));
      k = 1 - t * 0.6;
    } else if (h >= 5 && h < 7) {
      const t = (h - 5) / 2;
      sky.copy(skyNight).lerp(skyDusk, t).lerp(skyDay, t * t);
      k = 0.4 + 0.6 * t;
    } else {
      sky.copy(skyNight);
      k = 0.4;
    }
    sun.intensity = (0.25 + 0.75 * k) * LEGACY;
    hemi.intensity = (0.3 + 0.35 * k) * LEGACY;
    lampLight.intensity = (1.2 - 0.9 * k) * LEGACY;
    winMat.emissiveIntensity = 0.2 + 0.8 * (1 - k);
    tvMat.emissiveIntensity = frame.tvOn ? 1.2 : 0.4;
  };
  applyTimeOfDay();

  // ---------- loop ----------
  const clock = new THREE.Clock();
  let t = 0;
  let raf = 0;
  let active = true;
  let pageVisible = !document.hidden;
  const tick = () => {
    raf = 0;
    if (!active || !pageVisible) return;
    const dt = Math.min(0.05, clock.getDelta());
    t += dt;
    if (dist !== distGoal) {
      dist += (distGoal - dist) * Math.min(1, dt * 10);
      if (Math.abs(dist - distGoal) < 0.01) dist = distGoal;
      placeCam();
    }
    const walking = path.length > 0;
    if (walking) {
      const goal = path[0]!;
      const dx = goal[0] - hero.position.x;
      const dz = goal[1] - hero.position.z;
      const d = Math.hypot(dx, dz);
      const step = WALK_SPEED * dt;
      if (d <= step) {
        hero.position.x = goal[0];
        hero.position.z = goal[1];
        path.shift();
        if (!path.length && onArrive) {
          const f = onArrive;
          onArrive = null;
          f();
        }
      } else {
        hero.position.x += (dx / d) * step;
        hero.position.z += (dz / d) * step;
        hero.rotation.y = Math.atan2(dx, dz);
      }
      const s = Math.sin(t * 12) * 0.6;
      legL.rotation.x = s;
      legR.rotation.x = -s;
      armL.rotation.x = -s;
      armR.rotation.x = s;
      hero.position.y = Math.abs(Math.sin(t * 12)) * 0.06;
      hero.scale.y = 1;
    } else {
      if (!seated) {
        legL.rotation.x = legR.rotation.x = 0;
        hero.position.y = 0;
        hero.scale.y = opts.reducedMotion ? 1 : 1 + Math.sin(t * 2.4) * 0.015;
      }
      const working = held && (held.kind === 'sit' || held.kind === 'work' || held.kind === 'busy') && !(held.spot === 'tv');
      const arm = working && !opts.reducedMotion ? Math.sin(t * 6) * 0.3 - 0.7 : working ? -0.7 : 0;
      armL.rotation.x = arm;
      armR.rotation.x = held?.kind === 'work' ? -1.2 + Math.sin(t * 3) * 0.2 : arm;
    }
    selRing.visible = !seated;
    (selRing.material as THREE.MeshBasicMaterial).opacity = 0.45 + Math.sin(t * 3) * 0.25;
    if (!opts.reducedMotion) crown.rotation.y += dt;
    const dim = frame.dim;
    for (const m of markers) {
      const on = !frame.busy;
      m.sprite.visible = m.halo.visible = on;
      m.sprite.position.y = SPOTS[m.id].at[1] + (opts.reducedMotion ? 0 : Math.abs(Math.sin(t * 2.5 + m.phase)) * 0.14);
      m.sprite.scale.setScalar(frame.selected === m.id ? markerScale * 1.2 : markerScale);
      const base = frame.selected === m.id ? 0.9 : dim.includes(m.id) ? 0.22 : 0.4;
      m.haloMat.opacity = base + (opts.reducedMotion ? 0 : Math.sin(t * 3) * 0.15);
    }
    renderer.render(scene, cam);
    raf = requestAnimationFrame(tick);
  };
  const kick = () => {
    if (!raf && active && pageVisible) {
      clock.getDelta();
      raf = requestAnimationFrame(tick);
    }
  };
  const onVisibility = () => {
    pageVisible = !document.hidden;
    kick();
  };
  document.addEventListener('visibilitychange', onVisibility);
  kick();

  return {
    update(f) {
      const changedClock = f.minute !== frame.minute || f.tvOn !== frame.tvOn;
      frame = f;
      if (changedClock) applyTimeOfDay();
    },
    walkTo(id, done) {
      held = null;
      goTo(SPOTS[id].stand, () => {
        faceTowards(SPOTS[id].face);
        done();
      });
    },
    pose(p) {
      if (p && held && p.spot === held.spot && p.kind === held.kind) return;
      if (!p) {
        standUp();
        held = null;
        return;
      }
      const to = p.spot === 'center' ? CENTER : SPOTS[p.spot].stand;
      // Already walking there for this action: pose on arrival. Otherwise walk over, then pose.
      if (path.length && near(path[path.length - 1]!, to)) {
        held = p;
        const prev = onArrive;
        onArrive = () => {
          prev?.();
          if (held === p) applyHeld();
        };
        return;
      }
      standUp();
      held = p;
      goTo(to, () => {
        if (held === p) applyHeld();
      });
    },
    setActive(on) {
      active = on;
      if (on) {
        resize();
        kick();
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    dispose() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
      for (const d of disposables) d.dispose();
      renderer.dispose();
    },
  };
}

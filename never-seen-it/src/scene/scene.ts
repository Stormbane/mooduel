// The room (spec §11): one fixed camera on a video-store back room,
// rendered to a low-res target (short edge <= 270) and upscaled in WebGL
// with nearest sampling. PS1 vertex snap + affine UVs via a custom
// ShaderMaterial. Post chain is a single hand-written fullscreen pass
// (Bayer 4x4 dither, RGB555 quantize, scanlines, vignette) — one merged
// pass, which is the point pmndrs/postprocessing exists to approximate.

import {
  AmbientLight, BufferAttribute, CanvasTexture, Color, DirectionalLight,
  Group, Mesh, MeshBasicMaterial, NearestFilter, OrthographicCamera,
  PerspectiveCamera, PlaneGeometry, BoxGeometry, Scene, ShaderMaterial,
  SRGBColorSpace, WebGLRenderTarget, WebGLRenderer, DoubleSide,
} from "three";
import { posterCanvas } from "../ui/posters";

// ---- tween helper (~interruptible, ease-out) ----

interface Tween {
  obj: { [k: string]: number };
  key: string;
  from: number;
  to: number;
  start: number;
  ms: number;
  done?: () => void;
}

class Tweens {
  private list: Tween[] = [];
  add(obj: object, key: string, to: number, ms: number, done?: () => void): void {
    const o = obj as { [k: string]: number };
    this.list = this.list.filter((t) => !(t.obj === o && t.key === key));
    this.list.push({ obj: o, key, from: o[key], to, start: performance.now(), ms, done });
  }
  tick(now: number): void {
    this.list = this.list.filter((t) => {
      const raw = Math.min(1, (now - t.start) / t.ms);
      const e = 1 - Math.pow(1 - raw, 3); // ease-out cubic
      t.obj[t.key] = t.from + (t.to - t.from) * e;
      if (raw >= 1) { t.done?.(); return false; }
      return true;
    });
  }
}

// ---- PS1 material ----

const PS1_VERT = /* glsl */ `
  varying vec3 vColor;
  varying float vW;
  attribute vec3 tint;
  void main() {
    vColor = tint;
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // vertex snap: quantize NDC xy to a virtual grid
    float grid = 160.0;
    vec3 ndc = clip.xyz / clip.w;
    ndc.xy = floor(ndc.xy * grid) / grid;
    clip.xyz = ndc * clip.w;
    vW = clip.w;
    gl_Position = clip;
  }
`;

const PS1_FRAG = /* glsl */ `
  varying vec3 vColor;
  void main() { gl_FragColor = vec4(vColor, 1.0); }
`;

function ps1Material(): ShaderMaterial {
  return new ShaderMaterial({ vertexShader: PS1_VERT, fragmentShader: PS1_FRAG });
}

/** Textured variant with affine UV warp (w-scaled in vert, divided in frag). */
const PS1_TEX_VERT = /* glsl */ `
  varying vec2 vUvAffine;
  varying float vW;
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    float grid = 160.0;
    vec3 ndc = clip.xyz / clip.w;
    ndc.xy = floor(ndc.xy * grid) / grid;
    clip.xyz = ndc * clip.w;
    vUvAffine = uv * clip.w;
    vW = clip.w;
    gl_Position = clip;
  }
`;
const PS1_TEX_FRAG = /* glsl */ `
  uniform sampler2D map;
  varying vec2 vUvAffine;
  varying float vW;
  void main() {
    vec2 uv = vUvAffine / vW;
    gl_FragColor = texture2D(map, uv);
  }
`;

function ps1TexMaterial(tex: CanvasTexture): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: PS1_TEX_VERT, fragmentShader: PS1_TEX_FRAG,
    uniforms: { map: { value: tex } }, side: DoubleSide,
  });
}

// ---- post pass: dither + quantize + scanlines + vignette, merged ----

const POST_FRAG = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 srcSize;
  uniform float enableDither;
  uniform float enableScan;
  uniform float time;
  varying vec2 vUv;

  float bayer(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int m[16];
    m[0]=0; m[1]=8; m[2]=2; m[3]=10; m[4]=12; m[5]=4; m[6]=14; m[7]=6;
    m[8]=3; m[9]=11; m[10]=1; m[11]=9; m[12]=15; m[13]=7; m[14]=13; m[15]=5;
    return (float(m[y*4+x]) + 0.5) / 16.0;
  }

  void main() {
    vec2 texel = vUv * srcSize;
    vec3 c = texture2D(tSrc, vUv).rgb;
    if (enableDither > 0.5) {
      float d = (bayer(floor(texel)) - 0.5) / 31.0;
      c = floor((c + d) * 31.0 + 0.5) / 31.0;  // RGB555
    }
    if (enableScan > 0.5) {
      float scan = 0.92 + 0.08 * sin(texel.y * 3.14159);
      c *= scan;
    }
    vec2 v = vUv - 0.5;
    c *= 1.0 - dot(v, v) * 0.55;  // gentle vignette
    gl_FragColor = vec4(c, 1.0);
  }
`;
const POST_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// ---- palette (slice of the 32-color global palette, §11.1) ----

const PAL = {
  night: 0x0a0e1a, wall: 0x141c30, carpet: 0x1a1430, table: 0x2a2138,
  tableTop: 0x3a2f4d, chair: 0x22304a, shelf: 0x241a30, tape1: 0x2e7d5b,
  tape2: 0x4a6db5, tape3: 0x8a2f4f, tape4: 0x93842a, crt: 0x0d1120,
  crtGlow: 0x2e7d5b, window: 0x1d2b53, printer: 0x2c2c3a, receipt: 0xe8e4d0,
};

export type CriticFace = "idle" | "smug" | "delighted" | "flustered" | "asking";

export class GameScene {
  private renderer: WebGLRenderer;
  private rt: WebGLRenderTarget;
  private scene = new Scene();
  private camera: PerspectiveCamera;
  private postScene = new Scene();
  private postCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private postMat: ShaderMaterial;
  private tweens = new Tweens();
  private cards = new Group();
  private receipt: Mesh;
  private critic: { canvas: HTMLCanvasElement; tex: CanvasTexture; face: CriticFace };
  private reducedMotion: boolean;
  private raf = 0;
  private blinkAt = 0;
  postEnabled = true;
  scanlines = true;

  constructor(canvas: HTMLCanvasElement) {
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.renderer = new WebGLRenderer({ canvas, antialias: false });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.rt = new WebGLRenderTarget(480, 270, {
      minFilter: NearestFilter, magFilter: NearestFilter,
    });
    this.camera = new PerspectiveCamera(50, 16 / 9, 0.1, 60);
    this.camera.position.set(0, 3.1, 5.4);
    this.camera.lookAt(0, 0.8, -0.6);
    this.scene.background = new Color(PAL.night);

    this.postMat = new ShaderMaterial({
      vertexShader: POST_VERT, fragmentShader: POST_FRAG,
      uniforms: {
        tSrc: { value: this.rt.texture },
        srcSize: { value: [480, 270] },
        enableDither: { value: 1 },
        enableScan: { value: 1 },
        time: { value: 0 },
      },
    });
    this.postScene.add(new Mesh(new PlaneGeometry(2, 2), this.postMat));

    this.critic = this.buildRoom();
    this.receipt = this.buildReceipt();
    this.scene.add(this.cards);
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.loop();
  }

  private box(w: number, h: number, d: number, color: number): Mesh {
    const g = new BoxGeometry(w, h, d);
    const count = g.attributes.position.count;
    const tint = new Float32Array(count * 3);
    const c = new Color(color);
    // slight per-face shading so flat colors read as 3D
    for (let i = 0; i < count; i++) {
      const shade = 0.75 + 0.25 * ((i / count) % 1);
      tint[i * 3] = c.r * shade;
      tint[i * 3 + 1] = c.g * shade;
      tint[i * 3 + 2] = c.b * shade;
    }
    g.setAttribute("tint", new BufferAttribute(tint, 3));
    const m = new Mesh(g, ps1Material());
    return m;
  }

  private buildRoom(): { canvas: HTMLCanvasElement; tex: CanvasTexture; face: CriticFace } {
    this.scene.add(new AmbientLight(0xffffff, 1));
    const dir = new DirectionalLight(0xffffff, 0.4);
    dir.position.set(2, 5, 3);
    this.scene.add(dir);

    // carpet + walls
    const floor = this.box(14, 0.1, 12, PAL.carpet);
    floor.position.set(0, -0.05, 0);
    this.scene.add(floor);
    const back = this.box(14, 6, 0.2, PAL.wall);
    back.position.set(0, 3, -4);
    this.scene.add(back);
    const left = this.box(0.2, 6, 12, PAL.wall);
    left.position.set(-6, 3, 0);
    this.scene.add(left);

    // table
    const top = this.box(4.4, 0.18, 2.6, PAL.tableTop);
    top.position.set(0, 1.0, 0.4);
    this.scene.add(top);
    for (const [x, z] of [[-1.9, -0.6], [1.9, -0.6], [-1.9, 1.4], [1.9, 1.4]]) {
      const leg = this.box(0.16, 1.0, 0.16, PAL.table);
      leg.position.set(x, 0.5, z);
      this.scene.add(leg);
    }

    // chairs
    for (const [x, z, ry] of [[0, 2.4, 0], [-2.9, 0.4, Math.PI / 2], [0, -1.7, Math.PI], [2.9, 0.4, -Math.PI / 2]]) {
      const seat = this.box(0.8, 0.12, 0.8, PAL.chair);
      seat.position.set(x, 0.55, z);
      seat.rotation.y = ry;
      this.scene.add(seat);
      const backr = this.box(0.8, 0.9, 0.1, PAL.chair);
      backr.position.set(
        x - Math.sin(ry) * 0.38, 1.05, z - Math.cos(ry) * 0.38,
      );
      backr.rotation.y = ry;
      this.scene.add(backr);
    }

    // tape shelf
    const shelf = this.box(3.4, 2.6, 0.5, PAL.shelf);
    shelf.position.set(-4.2, 1.4, -3.6);
    this.scene.add(shelf);
    const tapeColors = [PAL.tape1, PAL.tape2, PAL.tape3, PAL.tape4];
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 8; i++) {
        const tape = this.box(0.28, 0.5, 0.16, tapeColors[(row * 3 + i) % 4]);
        tape.position.set(-5.6 + i * 0.4, 0.8 + row * 0.85, -3.3);
        this.scene.add(tape);
      }
    }

    // window with rain
    const win = this.box(2.6, 1.8, 0.06, PAL.window);
    win.position.set(3.4, 3.2, -3.88);
    this.scene.add(win);

    // dot-matrix printer at the table edge
    const printer = this.box(0.9, 0.3, 0.5, PAL.printer);
    printer.position.set(1.6, 1.24, 1.35);
    this.scene.add(printer);

    // the CRT where the Critic lives
    const crt = this.box(2.2, 1.8, 0.9, PAL.crt);
    crt.position.set(0.6, 4.0, -3.4);
    this.scene.add(crt);
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 96;
    const tex = new CanvasTexture(canvas);
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestFilter;
    const screen = new Mesh(
      new PlaneGeometry(1.9, 1.5),
      new MeshBasicMaterial({ map: tex }),
    );
    screen.position.set(0.6, 4.0, -2.94);
    this.scene.add(screen);
    const state = { canvas, tex, face: "idle" as CriticFace };
    this.drawCriticFace(state, 0);
    return state;
  }

  private buildReceipt(): Mesh {
    const geo = new PlaneGeometry(0.7, 1.0);
    const mat = new MeshBasicMaterial({ color: PAL.receipt, side: DoubleSide });
    const m = new Mesh(geo, mat);
    m.position.set(1.6, 1.4, 1.35);
    m.rotation.x = -0.5;
    m.scale.set(1, 0.01, 1);
    this.scene.add(m);
    return m;
  }

  // ---- public scene events ----

  /** The dot-matrix printer prints the mood contract. */
  printContract(): void {
    this.receipt.scale.y = 0.01;
    this.tweens.add(this.receipt.scale, "y", 1, this.reducedMotion ? 1 : 700);
  }

  /** Deal n cards onto the table with staggered tweens. */
  dealCards(n: number): void {
    this.cards.clear();
    for (let i = 0; i < n; i++) {
      const card = new Mesh(
        new PlaneGeometry(0.62, 0.93),
        new MeshBasicMaterial({ color: 0x1a2238, side: DoubleSide }),
      );
      const targetX = -1.4 + i * 0.7;
      card.position.set(-3.5, 2.4, 0.8);
      card.rotation.x = -Math.PI / 2 + 0.08;
      this.cards.add(card);
      const ms = this.reducedMotion ? 1 : 220 + i * 90;
      this.tweens.add(card.position, "x", targetX, ms);
      this.tweens.add(card.position, "y", 1.12, ms);
      this.tweens.add(card.position, "z", 0.55, ms);
    }
  }

  /** Flip one table card to a poster (reveal). */
  revealCard(tmdbId: number, title: string, year: number): void {
    const card = this.cards.children[Math.floor(this.cards.children.length / 2)] as Mesh | undefined;
    if (!card) return;
    const tex = new CanvasTexture(posterCanvas(tmdbId, title, year));
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestFilter;
    const apply = () => {
      card.material = ps1TexMaterial(tex); // affine-warped, like the room
      this.tweens.add(card.scale, "x", 1, this.reducedMotion ? 1 : 150);
    };
    if (this.reducedMotion) apply();
    else {
      this.tweens.add(card.scale, "x", 0.02, 150, apply);
    }
  }

  setCriticFace(face: CriticFace): void {
    this.critic.face = face;
    this.drawCriticFace(this.critic, performance.now());
  }

  setPost(dither: boolean, scan: boolean): void {
    this.postMat.uniforms.enableDither.value = dither ? 1 : 0;
    this.postMat.uniforms.enableScan.value = scan ? 1 : 0;
  }

  // ---- critic face (pixel eyes and eyebrows on the CRT) ----

  private drawCriticFace(c: { canvas: HTMLCanvasElement; face: CriticFace; tex: CanvasTexture }, now: number): void {
    const g = c.canvas.getContext("2d")!;
    const W = c.canvas.width, H = c.canvas.height;
    g.fillStyle = "#08140c";
    g.fillRect(0, 0, W, H);
    // phosphor noise
    g.fillStyle = "rgba(46,125,91,0.08)";
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);

    const blink = now > this.blinkAt && now < this.blinkAt + 120;
    const eyeH = blink ? 2 : 14;
    const green = "#7be0a8";
    g.fillStyle = green;

    const face = c.face;
    const browTilt = face === "smug" ? 4 : face === "flustered" ? -5 : face === "delighted" ? -2 : 0;
    const eyeY = 40;
    // eyes
    g.fillRect(30, eyeY + (14 - eyeH) / 2, 16, eyeH);
    g.fillRect(82, eyeY + (14 - eyeH) / 2, 16, eyeH);
    if (face === "smug") {
      g.fillStyle = "#08140c";
      g.fillRect(30, eyeY, 16, 6); // heavy lids
      g.fillRect(82, eyeY, 16, 6);
      g.fillStyle = green;
    }
    // brows
    g.save();
    g.translate(38, eyeY - 10);
    g.rotate((browTilt * Math.PI) / 180);
    g.fillRect(-10, -2, 20, 4);
    g.restore();
    g.save();
    g.translate(90, eyeY - 10);
    g.rotate((-browTilt * Math.PI) / 180);
    g.fillRect(-10, -2, 20, 4);
    g.restore();
    // mouth: a thin line, angle by mood
    g.save();
    g.translate(64, 74);
    const mouthTilt = face === "delighted" ? -6 : face === "flustered" ? 6 : 0;
    g.rotate((mouthTilt * Math.PI) / 180);
    g.fillRect(-14, -1, 28, face === "flustered" ? 4 : 2);
    g.restore();
    if (face === "asking") {
      g.fillRect(112, 20, 4, 12);
      g.fillRect(112, 36, 4, 4);
    }
    c.tex.needsUpdate = true;
  }

  // ---- render loop ----

  private resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    const aspect = w / h;
    // short edge <= 270 (§11.1)
    let rw: number, rh: number;
    if (aspect >= 1) { rh = 270; rw = Math.round(270 * aspect); }
    else { rw = 270; rh = Math.round(270 / aspect); }
    this.rt.setSize(rw, rh);
    this.postMat.uniforms.srcSize.value = [rw, rh];
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    this.tweens.tick(now);
    if (now > this.blinkAt + 160) {
      if (now > this.blinkAt + 2600 + Math.random() * 3000) {
        this.blinkAt = now;
      }
      this.drawCriticFace(this.critic, now);
    }
    this.postMat.uniforms.time.value = now / 1000;
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  };

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
  }
}

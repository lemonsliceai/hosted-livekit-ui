/** Logical panel space. CSS px = logical px × (panelWidth / LOGICAL_W). */
const LOGICAL_W = 768;
const LOGICAL_H = 1152;

const TAU = Math.PI * 2;

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

/** Deterministic LCG, so the sparkle layout is identical on every load. */
function makeRand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(1664525, s) + 1013904223) >>> 0) / 4294967296);
}

const FLOAT = { periodS: 8, x: 15, y: 7, scale: 0.036 };

function slowFloatPose(t: number) {
  const a = (TAU * t) / FLOAT.periodS;
  return {
    dx: FLOAT.x * Math.sin(a),
    dy: FLOAT.y * Math.sin(2 * a),
    scale: 1 + (FLOAT.scale / 2) * (1 - Math.cos(a)),
  };
}

export function rigTransform(t: number, amp: number, k: number) {
  const { dx, dy, scale } = slowFloatPose(t);
  return `translate(${dx * amp * k}px, ${dy * amp * k}px) scale(${1 + (scale - 1) * amp})`;
}

const GLINT = {
  count: 30,
  seed: 1601,
  sizeMin: 0.2,
  sizeMax: 0.8,
  peakMin: 0.5,
  peakMax: 0.9,
  periodS: [4, 7] as const,
  sharpness: 5,
  rise: [6, 12] as const,
  sway: 9,
  tints: ["#ffe9c4", "#fff6e6", "#d8e6ff"] as const,
  band: 0.36,
  midAlpha: 0.8,
};

function bandAlpha(f: number) {
  const { band, midAlpha } = GLINT;
  const e = f < band ? 1 - f / band : f > 1 - band ? (f - (1 - band)) / band : 0;
  return midAlpha + (1 - midAlpha) * easeInOutSine(clamp01(e));
}

type Glint = {
  scale: number;
  x: number;
  y: number;
  vy: number;
  ph: number;
  per: number;
  sw: number;
  peak: number;
  tint: number;
  alpha: number;
};

export type GlintField = {
  update: (dt: number, t: number, amp: number) => void;
  draw: (
    ctx: CanvasRenderingContext2D,
    k: number,
    cssWidth: number,
    textures: HTMLCanvasElement[],
  ) => void;
};

export function createGlintField(): GlintField {
  const rand = makeRand(GLINT.seed);
  const range = ([lo, hi]: readonly [number, number]) => lo + rand() * (hi - lo);

  function spawn(p: Glint, initial: boolean) {
    p.scale = GLINT.sizeMin + rand() * (GLINT.sizeMax - GLINT.sizeMin);
    p.x = rand() * LOGICAL_W;
    p.y = initial ? rand() * LOGICAL_H : LOGICAL_H + 20;
    p.vy = -range(GLINT.rise);
    p.ph = rand() * TAU;
    p.per = range(GLINT.periodS);
    p.sw = GLINT.sway * (0.5 + rand());
    p.peak = GLINT.peakMin + rand() * (GLINT.peakMax - GLINT.peakMin);
    p.tint = Math.floor(rand() * GLINT.tints.length);
    p.alpha = 0;
  }

  const particles: Glint[] = [];
  for (let i = 0; i < GLINT.count; i++) {
    const p = {} as Glint;
    spawn(p, true);
    particles.push(p);
  }

  return {
    update(dt, t, amp) {
      for (const p of particles) {
        p.y += p.vy * dt;
        p.x += Math.sin(0.4 * t + p.ph) * p.sw * dt;
        if (p.y < -20) {
          p.y = LOGICAL_H + 20;
          p.x = rand() * LOGICAL_W;
        }
        const o = Math.max(0, Math.sin((TAU * t) / p.per + p.ph));
        p.alpha = amp * p.peak * Math.pow(o, GLINT.sharpness) * bandAlpha(p.y / LOGICAL_H);
      }
    },
    draw(ctx, k, cssWidth, textures) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const dpr = cssWidth > 0 ? ctx.canvas.width / cssWidth : 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) {
        if (p.alpha <= 0.001) continue;
        const texture = textures[p.tint];
        if (!texture) continue;
        const size = 64 * p.scale * k;
        ctx.globalAlpha = p.alpha;
        ctx.drawImage(texture, p.x * k - size / 2, p.y * k - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },
  };
}

const DOT = 64;

/** One white radial dot, then a pre-tinted copy per glint color. */
export function createGlintTextures(): HTMLCanvasElement[] {
  const mask = document.createElement("canvas");
  mask.width = mask.height = DOT;
  const maskCtx = mask.getContext("2d");
  if (!maskCtx) return [];
  const image = maskCtx.createImageData(DOT, DOT);
  const center = DOT / 2;
  const radius = DOT / 2;
  for (let y = 0; y < DOT; y++) {
    for (let x = 0; x < DOT; x++) {
      const r = Math.hypot(x + 0.5 - center, y + 0.5 - center) / radius;
      const alpha = r >= 1 ? 0 : (1 - r) ** 1.75;
      const i = (y * DOT + x) * 4;
      image.data[i] = 255;
      image.data[i + 1] = 255;
      image.data[i + 2] = 255;
      image.data[i + 3] = Math.round(alpha * 255);
    }
  }
  maskCtx.putImageData(image, 0, 0);

  return GLINT.tints.map((tint) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = DOT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, DOT, DOT);
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mask, 0, 0);
    return canvas;
  });
}

export const PORTRAIT_LOGICAL_W = LOGICAL_W;

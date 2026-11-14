"use client";

import { useEffect, useRef } from "react";

const GRID_SPACING = 8;
const DOT_RADIUS_MIN = 0.5;
const DOT_RADIUS_MAX = 1.6;
const ALPHA_MIN = 0.2;
const ALPHA_MAX = 0.9;
/** >1 pushes field values toward 0/1 before opacity mapping. */
const FIELD_CONTRAST = 1;

const NOISE_SCALE = 0.082;
const TIME_SPEED = 2.0;
/** How far the flow field displaces samples — higher = more liquid warp. */
const WARP_STRENGTH = 1.4;

function lattice(ix: number, iy: number): number {
  const n = ix * 374761393 + iy * 668265263;
  const h = (n ^ (n >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function valueNoise2D(x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = fade(x - x0);
  const ty = fade(y - y0);

  const n00 = lattice(x0, y0);
  const n10 = lattice(x0 + 1, y0);
  const n01 = lattice(x0, y0 + 1);
  const n11 = lattice(x0 + 1, y0 + 1);

  const nx0 = n00 + (n10 - n00) * tx;
  const nx1 = n01 + (n11 - n01) * tx;
  return nx0 + (nx1 - nx0) * ty;
}

/** Domain-warped 2D noise — blobs morph and merge instead of slicing through z. */
function sampleField(col: number, row: number, t: number): number {
  const x = col * NOISE_SCALE;
  const y = row * NOISE_SCALE;
  const time = t * TIME_SPEED;

  const warpX = (valueNoise2D(x + 12.7, y + 4.1 + time * 0.55) - 0.5) * WARP_STRENGTH;
  const warpY = (valueNoise2D(x + 31.2 + time * 0.48, y + 18.9) - 0.5) * WARP_STRENGTH;

  const wx = x + warpX;
  const wy = y + warpY;
  const base = valueNoise2D(wx, wy);
  const detail = valueNoise2D(wx * 1.9 + 8.3, wy * 1.9 + 16.1) * 0.22;
  return Math.min(1, Math.max(0, base * 0.78 + detail));
}

function fieldToPunch(field: number): number {
  const spread = Math.min(1, Math.max(0, (field - 0.5) * FIELD_CONTRAST + 0.5));
  return spread * spread * (3 - 2 * spread);
}

/** The web app's avatar-prep dot field. One still frame when motion is reduced. */
export function PrepDotMatrix() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paint = (t: number) => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const cols = Math.ceil(w / GRID_SPACING) + 1;
      const rows = Math.ceil(h / GRID_SPACING) + 1;
      const offsetX = (w - (cols - 1) * GRID_SPACING) * 0.5;
      const offsetY = (h - (rows - 1) * GRID_SPACING) * 0.5;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const punch = fieldToPunch(sampleField(col, row, t));
          const cx = offsetX + col * GRID_SPACING;
          const cy = offsetY + row * GRID_SPACING;
          const radius = DOT_RADIUS_MIN + (DOT_RADIUS_MAX - DOT_RADIUS_MIN) * punch;
          const alpha = ALPHA_MIN + punch * (ALPHA_MAX - ALPHA_MIN);

          ctx.beginPath();
          ctx.fillStyle = `rgba(255,255,255,${alpha})`;
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = (now: number) => {
      paint((now - start) * 0.001);
      raf = requestAnimationFrame(loop);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    if (reduceMotion) {
      paint(0);
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="ls-preparing-dots" aria-hidden />;
}

"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  PORTRAIT_LOGICAL_W,
  clamp01,
  createGlintField,
  createGlintTextures,
  easeInOutSine,
  rigTransform,
  type GlintField,
} from "./stageEffects";

const INTRO_S = 2;
const TOGGLE_MS = 500;
const MAX_DT_S = 0.05;

type Ramp = { from: number; to: number; start: number };

type Channel = {
  amp: number;
  ramp: Ramp | null;
  /** Set after a toggle finishes, so the intro fade does not resume. */
  hold: number | null;
};

type Clock = {
  t: number;
  started: boolean;
  drift: Channel;
  glint: Channel;
};

function channel(): Channel {
  return { amp: 0, ramp: null, hold: null };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function sizeCanvas(canvas: HTMLCanvasElement, cssWidth: number, cssHeight: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(cssWidth * dpr));
  const height = Math.max(1, Math.round(cssHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function arm(channel: Channel, enabled: boolean, wasEnabled: boolean, started: boolean) {
  if (!started || enabled === wasEnabled) return;
  channel.ramp = { from: channel.amp, to: enabled ? 1 : 0, start: 0 };
  channel.hold = null;
}

function step(channel: Channel, enabled: boolean, now: number, t: number) {
  const ramp = channel.ramp;
  if (ramp) {
    if (ramp.start === 0) ramp.start = now;
    const u = clamp01((now - ramp.start) / TOGGLE_MS);
    const amp = ramp.from + (ramp.to - ramp.from) * easeInOutSine(u);
    if (u >= 1) {
      channel.ramp = null;
      channel.hold = ramp.to;
      channel.amp = ramp.to;
      return ramp.to;
    }
    channel.amp = amp;
    return amp;
  }
  if (channel.hold != null) return channel.hold;
  const amp = enabled ? easeInOutSine(clamp01(t / INTRO_S)) : 0;
  channel.amp = amp;
  return amp;
}

/**
 * Slow portrait drift and foreground sparkles.
 * Each one fades in over 2s the first time it turns on, and over 500ms after that.
 */
export function useStageEffects({
  drift,
  glint,
  panelRef,
  rigRef,
  canvasRef,
}: {
  drift: boolean;
  glint: boolean;
  panelRef: RefObject<HTMLElement | null>;
  rigRef: RefObject<HTMLElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
  const reduced = useReducedMotion();
  const fieldRef = useRef<GlintField | null>(null);
  const texturesRef = useRef<HTMLCanvasElement[] | null>(null);
  const clockRef = useRef<Clock>({ t: 0, started: false, drift: channel(), glint: channel() });
  const driftWas = useRef(drift);
  const glintWas = useRef(glint);

  useEffect(() => {
    const panel = panelRef.current;
    const rig = rigRef.current;
    if (!panel || !rig) return;

    const clearSparkles = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    if (reduced || (!drift && !glint)) {
      rig.style.transform = "none";
      clearSparkles();
      return;
    }

    const clock = clockRef.current;
    arm(clock.drift, drift, driftWas.current, clock.started);
    arm(clock.glint, glint, glintWas.current, clock.started);
    driftWas.current = drift;
    glintWas.current = glint;

    if (!fieldRef.current) fieldRef.current = createGlintField();
    if (!texturesRef.current) texturesRef.current = createGlintTextures();
    const field = fieldRef.current;
    const textures = texturesRef.current;

    let stopped = false;
    let last = performance.now();
    let raf = 0;

    const apply = (now: number, advance: boolean) => {
      let dt = advance ? (now - last) / 1000 : 0;
      last = now;
      if (dt > MAX_DT_S) dt = MAX_DT_S;
      if (dt < 0) dt = 0;
      if (!clock.started) {
        clock.started = true;
        clock.t = 0;
        dt = 0;
      } else if (advance) {
        clock.t += dt;
      }

      const driftAmp = step(clock.drift, drift, now, clock.t);
      const glintAmp = step(clock.glint, glint, now, clock.t);
      const cssWidth = panel.clientWidth;
      const cssHeight = panel.clientHeight;
      const k = cssWidth / PORTRAIT_LOGICAL_W;
      rig.style.transform = driftAmp === 0 ? "none" : rigTransform(clock.t, driftAmp, k);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx && cssWidth > 0 && cssHeight > 0) {
        sizeCanvas(canvas, cssWidth, cssHeight);
        if (glintAmp > 0.001) {
          if (advance) field.update(dt, clock.t, glintAmp);
          field.draw(ctx, k, cssWidth, textures);
        } else {
          clearSparkles();
        }
      }

      const settling = clock.drift.ramp != null || clock.glint.ramp != null;
      if (!drift && !glint && !settling && driftAmp === 0 && glintAmp === 0) {
        rig.style.transform = "none";
        clearSparkles();
        return false;
      }
      return true;
    };

    const tick = (now: number) => {
      if (stopped || document.hidden) return;
      if (!apply(now, true)) return;
      raf = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (document.hidden || stopped) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const resize = new ResizeObserver(() => {
      if (stopped || document.hidden) return;
      apply(performance.now(), false);
    });
    resize.observe(panel);
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(tick);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [canvasRef, drift, glint, panelRef, reduced, rigRef]);
}

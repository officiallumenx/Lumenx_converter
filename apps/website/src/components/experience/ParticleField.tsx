import { useEffect, useRef } from "react";
import { experienceAllows, useExperienceTier } from "@/experience";

type Particle = { x: number; y: number; vx: number; vy: number; r: number; a: number };

/** Lightweight canvas particle field — HIGH tier only, paused when hidden. */
export function ParticleField({ className }: { className?: string }) {
  const tier = useExperienceTier();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const enabled = experienceAllows(tier, "particles");

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let particles: Particle[] = [];
    let w = 0;
    let h = 0;
    let pointer = { x: 0.5, y: 0.5 };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(48, Math.max(18, Math.floor((w * h) / 18000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: 0.6 + Math.random() * 1.4,
        a: 0.18 + Math.random() * 0.28,
      }));
    };

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = {
        x: (event.clientX - rect.left) / Math.max(1, rect.width),
        y: (event.clientY - rect.top) / Math.max(1, rect.height),
      };
    };

    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      const tx = pointer.x * w;
      const ty = pointer.y * h;
      for (const p of particles) {
        p.vx += (tx - p.x) * 0.000015;
        p.vy += (ty - p.y) * 0.000015;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        if (p.y < -4) p.y = h + 4;
        if (p.y > h + 4) p.y = -4;
        ctx.beginPath();
        ctx.fillStyle = `oklch(0.55 0.14 262 / ${p.a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      running = document.visibilityState === "visible";
      if (running) raf = requestAnimationFrame(tick);
      else cancelAnimationFrame(raf);
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.parentElement?.addEventListener("pointermove", onPointer);
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.parentElement?.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);

  if (!enabled) return null;

  return <canvas ref={canvasRef} className={className ?? "eco-particles"} aria-hidden />;
}

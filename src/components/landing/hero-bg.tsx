"use client";

import { useEffect, useRef } from "react";

export function HeroBg() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    type Particle = { x: number; y: number; speed: number; opacity: number };

    let particles: Particle[] = [];
    let raf = 0;
    let w = 0;
    let h = 0;

    function sync() {
      const rect = container!.getBoundingClientRect();
      const nw = Math.round(rect.width);
      const nh = Math.round(rect.height);
      if (nw === w && nh === h) return false;
      w = nw;
      h = nh;
      canvas!.width = w;
      canvas!.height = h;
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      return true;
    }

    function make(scatter: boolean): Particle {
      return {
        x: Math.random() * w,
        y: scatter ? Math.random() * h : h + Math.random() * 20,
        speed: Math.random() * 0.15 + 0.05,
        opacity: Math.random() * 0.25 + 0.1,
      };
    }

    function init() {
      particles = [];
      const n = Math.floor((w * h) / 8000);
      for (let i = 0; i < n; i++) particles.push(make(true));
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.y -= p.speed;
        if (p.y < -2) {
          // Wrap to bottom
          p.x = Math.random() * w;
          p.y = h + Math.random() * 10;
          p.speed = Math.random() * 0.15 + 0.05;
          p.opacity = Math.random() * 0.25 + 0.1;
          continue;
        }
        ctx!.fillStyle = `rgba(200, 170, 80, ${p.opacity})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 1, 0, Math.PI * 2);
        ctx!.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    let pollId: ReturnType<typeof setTimeout>;
    function tryStart() {
      if (!sync() && w === 0) {
        pollId = setTimeout(tryStart, 50);
        return;
      }
      init();
      raf = requestAnimationFrame(draw);
    }
    pollId = setTimeout(tryStart, 100);

    const onResize = () => {
      if (sync()) init();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(pollId);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0">
        {/* <div className="hero-hline" style={{ top: "25%" }} />
        <div className="hero-hline" style={{ top: "50%", animationDelay: "130ms" }} />
        <div className="hero-hline" style={{ top: "75%", animationDelay: "260ms" }} />
        <div className="hero-vline" style={{ left: "20%", animationDelay: "380ms" }} />
        <div className="hero-vline" style={{ left: "50%", animationDelay: "500ms" }} />
        <div className="hero-vline" style={{ left: "80%", animationDelay: "620ms" }} /> */}
      </div>
      <canvas ref={canvasRef} className="absolute top-0 left-0" />
    </div>
  );
}

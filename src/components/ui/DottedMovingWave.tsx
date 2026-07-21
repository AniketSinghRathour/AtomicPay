"use client";

import React, { useEffect, useRef } from "react";

interface DottedMovingWaveProps {
  className?: string;
  speed?: number;
}

interface GridPoint {
  px: number;
  py: number;
  h: number;
  fade: number;
  scale: number;
}

interface BokehParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  baseAlpha: number;
}

export function DottedMovingWave({
  className = "",
  speed = 0.014,
}: DottedMovingWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const bokehRef = useRef<BokehParticle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Initialize floating ambient bokeh particles
    if (bokehRef.current.length === 0) {
      const particles: BokehParticle[] = [];
      for (let i = 0; i < 35; i++) {
        const baseAlpha = 0.15 + Math.random() * 0.45;
        particles.push({
          x: Math.random(),
          y: 0.1 + Math.random() * 0.8,
          vx: (Math.random() - 0.5) * 0.0003,
          vy: (Math.random() - 0.5) * 0.0002,
          r: 1.0 + Math.random() * 1.8,
          alpha: baseAlpha,
          baseAlpha,
        });
      }
      bokehRef.current = particles;
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    // Mouse movement interaction
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener("mousemove", handleMouseMove);
      parent.addEventListener("mouseleave", handleMouseLeave);
    }

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      time += speed;

      // ── Responsive Grid Terrain Slice & Density ──
      // The grid canvas always covers the full width of the card (no blank sides).
      // On smaller devices, we map the requested percentage width of the grid terrain across the full card:
      // - Large (>= 1024px): 0% to 100% (full terrain sweep)
      // - Tablet (640px - 1024px): 0% to 88% (0 - 85/90% grid width, avoiding congested right ridge peak)
      // - Small (< 640px): 10% to 75% (avoids cramped outer steep flanks, keeping smooth central valley)
      let uMin = 0.0;
      let uMax = 1.0;

      if (width < 640) {
        uMin = 0.10;
        uMax = 0.75;
      } else if (width < 1024) {
        uMin = 0.0;
        uMax = 0.88;
      } else {
        uMin = 0.0;
        uMax = 1.0;
      }

      // Dynamically calculate columns and rows so grid spacing remains airy (~16px) across all viewports
      const cols = Math.min(76, Math.max(34, Math.round(width / 16)));
      const rows = Math.min(44, Math.max(20, Math.round(cols * 0.58)));

      // ── 1. Soft Ambient Radial Glows ──
      // Right ridge ambient soft bloom (scales with width and adapts to peak position)
      const tRightGlow = uMax < 1.0 ? 0.75 : 0.80;
      const rightGlow = ctx.createRadialGradient(
        width * tRightGlow,
        height * 0.50,
        0,
        width * tRightGlow,
        height * 0.50,
        Math.min(width * 0.50, Math.max(width * 0.32, 90))
      );
      rightGlow.addColorStop(0, "rgba(101, 137, 182, 0.16)");
      rightGlow.addColorStop(0.5, "rgba(49, 70, 98, 0.06)");
      rightGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = rightGlow;
      ctx.fillRect(0, 0, width, height);

      // Left dome ambient soft bloom (scales with width and adapts to dome position)
      const tLeftGlow = uMin > 0 ? 0.15 : 0.18;
      const leftGlow = ctx.createRadialGradient(
        width * tLeftGlow,
        height * 0.65,
        0,
        width * tLeftGlow,
        height * 0.65,
        Math.min(width * 0.40, Math.max(width * 0.25, 75))
      );
      leftGlow.addColorStop(0, "rgba(101, 137, 182, 0.12)");
      leftGlow.addColorStop(0.5, "rgba(49, 70, 98, 0.04)");
      leftGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = leftGlow;
      ctx.fillRect(0, 0, width, height);

      // ── 2. Calculate 3D Perspective Grid Points ──
      const grid: GridPoint[][] = [];

      for (let r = 0; r < rows; r++) {
        const rowPts: GridPoint[] = [];
        const v = r / (rows - 1); // 0 (front) to 1 (back)

        for (let c = 0; c < cols; c++) {
          // t: normalized horizontal position spanning the full card width [0 to 1]
          const t = c / (cols - 1);
          // u: mapped terrain coordinate based on the responsive grid range
          const u = uMin + t * (uMax - uMin);

          // ── Continuous Organic Terrain (No flat clamping) ──
          // A) Left Dome (rounded hill on left flank)
          const duLeft = (u - 0.14) / 0.18;
          const dvLeft = (v - 0.50) / 0.36;
          const leftDome = Math.exp(-(duLeft * duLeft + dvLeft * dvLeft) * 1.05) * 115;

          // B) Right Sweeping Dune Ridge (curves dynamically into upper right)
          const spineU = 0.54 + 0.40 * Math.pow(v, 0.80);
          const duRight = (u - spineU) / (0.13 + 0.09 * v);
          const dvRight = (v - 0.48) / 0.45;
          const rightRidge =
            Math.exp(-(duRight * duRight * 1.25 + dvRight * dvRight * 0.72)) *
            (125 + 95 * Math.pow(v, 0.65));

          // C) Center Curved Saddle (continuous graceful bowl depression, no flat plateau)
          const saddle = Math.sin(u * Math.PI) * (28 + 38 * (1 - v));

          // D) Fluid Harmonic Traveling Wave Ripples
          const w1 = Math.sin(u * 8.8 - time * 1.5 + v * 3.6) * 11;
          const w2 = Math.cos(u * 5.4 + time * 1.2 - v * 4.4) * 8;
          const w3 = Math.sin((u * 4.2 + v * 5.2) - time * 1.8) * 5;

          const h = leftDome + rightRidge - saddle + w1 + w2 + w3 + 22;

          // E) 3D Perspective Projection across the full card width
          const xWorld = (t - 0.5) * (width * 1.80);
          const zWorld = 75 + v * 640;
          const focalLength = 490;
          const scale = focalLength / (focalLength + zWorld * 0.68);

          let px = width * 0.5 + xWorld * scale;
          // yBase extends down to 1.08 * height to completely eliminate any bottom gap
          const yBase = height * 1.08 - v * (height * 0.64);
          let py = yBase - h * scale * 1.58;

          // Interactive mouse deflection
          if (mouseRef.current.active) {
            const dx = px - mouseRef.current.x;
            const dy = py - mouseRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 180;
            if (dist < maxDist) {
              const force = (1 - dist / maxDist) * 22;
              py += Math.sin(dist * 0.045 - time * 3) * force;
            }
          }

          // Edge fading: smooth fade at card flanks (based on full-width t) and back horizon
          const edgeX = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);
          const edgeZ = Math.pow(1.0 - (v * 0.88), 0.72);
          const fade = Math.pow(edgeX, 0.72) * edgeZ;

          rowPts.push({ px, py, h, fade, scale });
        }
        grid.push(rowPts);
      }

      // ── 3. Draw Fine Wireframe Net Lines ──
      // Draw horizontal lines along rows (#7396c3)
      for (let r = 0; r < rows; r++) {
        const row = grid[r];
        for (let c = 0; c < cols - 1; c++) {
          const p1 = row[c];
          const p2 = row[c + 1];
          const avgFade = (p1.fade + p2.fade) * 0.5;
          if (avgFade < 0.025) continue;

          const avgH = (p1.h + p2.h) * 0.5;
          const lineAlpha = avgFade * (0.06 + Math.max(0, avgH / 180) * 0.25);

          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.strokeStyle = `rgba(115, 150, 195, ${Math.min(0.38, lineAlpha)})`;
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }

      // Draw depth lines along columns (#5f82af)
      for (let r = 0; r < rows - 1; r++) {
        const row1 = grid[r];
        const row2 = grid[r + 1];
        for (let c = 0; c < cols; c++) {
          const p1 = row1[c];
          const p2 = row2[c];
          const avgFade = (p1.fade + p2.fade) * 0.5;
          if (avgFade < 0.025) continue;

          const avgH = (p1.h + p2.h) * 0.5;
          const lineAlpha = avgFade * (0.05 + Math.max(0, avgH / 180) * 0.22);

          ctx.beginPath();
          ctx.moveTo(p1.px, p1.py);
          ctx.lineTo(p2.px, p2.py);
          ctx.strokeStyle = `rgba(95, 130, 175, ${Math.min(0.32, lineAlpha)})`;
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }

      // ── 4. Draw Luminous Dotted Vertices ──
      for (let r = 0; r < rows; r++) {
        const row = grid[r];
        for (let c = 0; c < cols; c++) {
          const pt = row[c];
          if (pt.fade < 0.025) continue;

          const crestFactor = Math.min(1, Math.max(0, pt.h) / 150);
          const rad = 0.75 + crestFactor * 1.25;
          const dotAlpha = pt.fade * (0.18 + crestFactor * 0.82);

          // Radial bloom halo on elevated crest points
          if (crestFactor > 0.40 && pt.fade > 0.20) {
            const haloR = rad * 2.5;
            const haloAlpha = pt.fade * crestFactor * 0.28;
            ctx.beginPath();
            ctx.arc(pt.px, pt.py, haloR, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(135, 169, 212, ${haloAlpha})`;
            ctx.fill();
          }

          // Core vertex point
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, rad, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(236, 241, 251, ${dotAlpha})`;
          ctx.fill();
        }
      }

      // ── 5. Ambient Bokeh Particles ──
      const particles = bokehRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around borders
        if (p.x < 0) p.x = 1;
        if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1;
        if (p.y > 1) p.y = 0;

        const px = p.x * width;
        const py = p.y * height;
        const pulse = Math.sin(time * 2 + i) * 0.3 + 0.7;

        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(135, 169, 212, ${p.alpha * pulse * 0.8})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (parent) {
        parent.removeEventListener("mousemove", handleMouseMove);
        parent.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full pointer-events-none ${className}`}
    />
  );
}

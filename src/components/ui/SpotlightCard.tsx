"use client";

import React, { useState } from "react";

export interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isInteractive?: boolean;
}

export function SpotlightCard({
  children,
  className = "",
  onClick,
  isInteractive = false,
}: SpotlightCardProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`relative group rounded-[22px] transition-all duration-300 ${
        onClick || isInteractive
          ? "cursor-pointer hover:-translate-y-1 active:scale-[0.98]"
          : "hover:-translate-y-0.5"
      } ${className}`}
    >
      {/* ── Outer luminescence glow on hover ── */}
      <div
        className="absolute -inset-[1px] rounded-[23px] pointer-events-none transition-opacity duration-500 opacity-0 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at center, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.03) 65%, transparent 100%)",
          filter: "blur(12px)",
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      {/* ── Main Card Shell ── */}
      <div
        className="relative z-10 rounded-[22px] p-5 sm:p-6 text-white overflow-hidden flex flex-col justify-between h-full transition-all duration-300"
        style={{
          background: "linear-gradient(145deg, #181d28 0%, #10141e 100%)",
          border: isHovered
            ? "1px solid rgba(255, 255, 255, 0.22)"
            : "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: isHovered
            ? "0 0 25px rgba(255, 255, 255, 0.07), 0 0 10px rgba(255, 255, 255, 0.1), 0 20px 45px -12px rgba(0, 0, 0, 0.75), inset 0 1px 1px rgba(255, 255, 255, 0.15)"
            : "0 15px 35px -10px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Interactive Radial Spotlight */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            opacity: isHovered ? 1 : 0,
            background: `radial-gradient(340px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.06), transparent 75%)`,
          }}
          aria-hidden="true"
        />

        {/* Fine Architectural Dot Matrix Texture */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500 opacity-15 group-hover:opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255, 255, 255, 0.14) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
            maskImage:
              "radial-gradient(ellipse 75% 75% at 50% 30%, black 25%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 75% at 50% 30%, black 25%, transparent 80%)",
          }}
          aria-hidden="true"
        />

        {/* Top Edge Highlight Beam */}
        <div
          className="absolute top-0 inset-x-0 h-[1px] pointer-events-none transition-all duration-500 bg-gradient-to-r from-transparent via-white/15 group-hover:via-white/40 to-transparent"
          aria-hidden="true"
        />

        {/* Diagonal Subtle Glass Sheen */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-500"
          style={{
            background:
              "linear-gradient(125deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 40%, transparent 65%)",
          }}
          aria-hidden="true"
        />

        {/* Content Container */}
        <div className="relative z-10 flex flex-col h-full justify-between w-full">
          {children}
        </div>
      </div>
    </div>
  );
}

export default SpotlightCard;

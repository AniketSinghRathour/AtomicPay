"use client";

import React from "react";
import { AtomicPayLogo } from "@/components/ui/AtomicPayLogo";

export function Footer() {
  return (
    <footer className="bg-[#040A0F] border-t border-white/[0.04] relative z-20 font-sans text-slate-400 select-none py-[28px]">
      <div
        className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{
          transform: "scale(0.90)",
          transformOrigin: "center center",
        }}
      >
        {/* Left: AtomicPay Logo */}
        <div className="flex items-center">
          <AtomicPayLogo theme="dark" size="sm" />
        </div>

        {/* Right: Built with trust */}
        <div className="flex items-center gap-2 text-xs text-slate-400/90">
          <span>Atomic by design</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300">Built with trust</span>
        </div>
      </div>
    </footer>
  );
}

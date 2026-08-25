"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { SendMoneySeamlesslyMockup } from "@/components/ui/SendMoneySeamlesslyMockup";

export function HowItWorksSection() {
  const { data: session } = useSession();
  const getStartedHref = session?.user ? "/dashboard" : "/sign-in?mode=signup";
  return (
    <section 
      id="how-it-works" 
      className="pt-20 sm:pt-24 lg:pt-28 pb-0 text-white relative z-20 font-sans overflow-hidden select-none"
      style={{
        backgroundColor: "#080D16",
      }}
    >
      {/* 
        Continuous atmospheric icy steel-blue ambient glow spanning the section:
        - Layered over dark navy-charcoal background (#080D16)
        - Subtle navy/steel-blue ambient wash (#314662 / #647FAD)
      */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 75% 65% at 72% 52%, rgba(100, 127, 173, 0.12) 0%, rgba(49, 70, 98, 0.05) 45%, transparent 75%),
            radial-gradient(ellipse 65% 60% at 24% 48%, rgba(49, 70, 98, 0.08) 0%, transparent 65%)
          `,
        }}
        aria-hidden="true"
      />

      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end">
          
          {/* Left Column: Heading, Description, Get Started Button */}
          <div className="lg:col-span-5 min-w-0 space-y-6 lg:self-center pb-12 sm:pb-16 lg:pb-20">
            <p className="text-xs font-mono font-semibold uppercase tracking-[0.22em] text-slate-400">
              SIMPLE. POWERFUL.
            </p>

            <h2 className="text-4xl sm:text-5xl md:text-5xl lg:text-[54px] xl:text-[60px] font-bold tracking-tight text-white leading-[1.08]">
              Send money,<br />
              <span className="text-[#48566A]">seamlessly.</span>
            </h2>

            <p className="text-base sm:text-lg text-slate-400 font-normal leading-relaxed max-w-lg pt-1">
              Transfer to friends, manage your balance, and keep track of your transactions — all in a clean, fast, and intuitive experience.
            </p>

            <div className="pt-2">
              <Link
                href={getStartedHref}
                className="inline-flex items-center justify-center bg-white hover:bg-slate-100 text-slate-950 text-sm font-semibold px-8 py-3.5 rounded-full transition-all shadow-[0_4px_20px_rgba(255,255,255,0.12)] hover:shadow-[0_6px_24px_rgba(255,255,255,0.22)] hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                Get started
              </Link>
            </div>
          </div>

          {/* Product interface illustration */}
          <div className="lg:col-span-7 min-w-0 flex justify-center lg:justify-end items-end overflow-visible self-end">
            <SendMoneySeamlesslyMockup />
          </div>

        </div>
      </div>
    </section>
  );
}

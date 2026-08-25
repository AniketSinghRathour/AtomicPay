"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { DottedMovingWave } from "@/components/ui/DottedMovingWave";

export function DemoPreview() {
  const { data: session } = useSession();
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-[#040A0F] text-white relative z-20 font-sans select-none overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl relative z-10">
        
        {/* ── Call to action container ── */}
        <div 
          className="relative rounded-[28px] sm:rounded-[36px] lg:rounded-[40px] p-8 sm:p-12 md:p-16 lg:p-20 text-center overflow-hidden border border-white/10"
          style={{
            background: "linear-gradient(180deg, #101622 0%, #070B13 100%)",
            boxShadow: `
              0 30px 80px -20px rgba(0, 0, 0, 0.75),
              0 0 40px -10px rgba(49, 70, 98, 0.15),
              inset 0 1px 1px rgba(255, 255, 255, 0.12)
            `,
          }}
        >
          {/* Top Edge White Sheen */}
          <div 
            className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" 
            aria-hidden="true"
          />

          {/* ── Ambient background lighting ── */}
          {/* Bottom Center Pool Glow */}
          <div 
            className="absolute -bottom-10 left-[15%] right-[15%] h-[60%] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 100%, rgba(101, 137, 182, 0.16) 0%, rgba(49, 70, 98, 0.06) 45%, transparent 75%)",
              filter: "blur(50px)",
            }}
            aria-hidden="true"
          />

          {/* Left Edge Ambient Bloom */}
          <div 
            className="absolute top-[25%] -left-[12%] w-[38%] h-[65%] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle at 20% 50%, rgba(101, 137, 182, 0.09) 0%, rgba(49, 70, 98, 0.03) 50%, transparent 70%)",
              filter: "blur(46px)",
            }}
            aria-hidden="true"
          />

          {/* Right Edge Ambient Bloom */}
          <div 
            className="absolute top-[25%] -right-[12%] w-[38%] h-[65%] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle at 80% 50%, rgba(101, 137, 182, 0.09) 0%, rgba(49, 70, 98, 0.03) 50%, transparent 70%)",
              filter: "blur(46px)",
            }}
            aria-hidden="true"
          />

          {/* ── Dotted & Lined Animated Moving Waves ── */}
          <DottedMovingWave className="absolute inset-0 w-full h-full pointer-events-none z-0" />

          {/* ── Content inside Card ── */}
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-center gap-3.5">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-white/25" />
              <p className="text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-[0.25em] text-slate-400">
                READY TO GET STARTED?
              </p>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-white/25" />
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-bold tracking-tight text-white leading-[1.12]">
              Start transferring<br />
              <span className="text-[#48566A]">with confidence.</span>
            </h2>

            <p className="text-sm sm:text-base md:text-[17px] text-slate-400 font-normal leading-relaxed max-w-lg mx-auto pt-1">
              Join AtomicPay and experience fast, secure, and consistent money transfers.
            </p>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center justify-center gap-3.5 sm:gap-4">
              {session?.user ? (
                <Link
                  href="/dashboard"
                  className="bg-white hover:bg-slate-100 text-slate-950 text-xs sm:text-sm font-semibold px-8 py-3 rounded-full flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(255,255,255,0.12)] hover:shadow-[0_6px_24px_rgba(255,255,255,0.22)] hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <span>Go to Dashboard</span>
                  <span className="text-sm">→</span>
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in?mode=signup"
                    className="bg-[#475569] hover:bg-[#384658] text-white text-xs sm:text-sm font-medium px-8 py-3 rounded-full flex items-center justify-center gap-2 transition-all shadow-md shadow-black/30 hover:scale-[1.02] active:scale-95"
                  >
                    <span>Sign Up</span>
                    <span className="text-sm">→</span>
                  </Link>

                  <Link
                    href="/sign-in?mode=signin"
                    className="border border-white/20 hover:border-white/50 text-white text-xs sm:text-sm font-medium px-8 py-3 rounded-full bg-black/40 hover:bg-white/5 transition-all shadow-sm active:scale-95"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}


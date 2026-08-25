"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { Wifi } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { AtomicPayLogo } from "@/components/ui/AtomicPayLogo";

export interface AtomicPayHeroProps {
  headline?: React.ReactNode;
  supportingLine?: React.ReactNode;
  cardHolderName?: string;
  cardNumber?: string;
  expiryDate?: string;
  primaryCtaText?: string;
  secondaryCtaText?: string;
  onPrimaryCtaClick?: () => void;
  onSecondaryCtaClick?: () => void;
}

/**
 * AtomicPayHero — Hero section with interactive 3D metallic wallet card,
 * architectural background, and responsive typography.
 *
 * Visual Components:
 * 1. Background: Architectural blueprint aesthetic with subtle ambient glow
 * 2. Navbar: AtomicPay branding, theme indicators, and authentication routing
 * 3. Hero Content: Two-line bold headline with gradient highlight
 * 4. Central Wallet Card: EMV chip, contactless indicator, monospace card number, and 3D perspective tilt
 * 5. CTA Buttons: High-contrast primary action pill
 */
export function AtomicPayHero({
  headline = (
    <>
      Money transfers<br />
      you can{" "}
      <span
        className="inline-block pb-1 pr-1 overflow-visible"
        style={{
          background: "linear-gradient(140deg, #38bdf8 0%, #20a4f8 26%, #0066ff 65%, #004fe2 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          filter: "drop-shadow(0 2px 16px rgba(0, 102, 255, 0.4))",
        }}
      >
        trust.
      </span>
    </>
  ),
  supportingLine = "Atomic by design. Consistent by default. Built to stay correct under concurrency.",
  cardHolderName = "ALEX KUMAR",
  cardNumber = "0000 0000 0000 0000",
  expiryDate = "12/30",
  primaryCtaText = "Get started",
  secondaryCtaText,
  onPrimaryCtaClick,
  onSecondaryCtaClick,
}: AtomicPayHeroProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const shouldReduceMotion = useReducedMotion();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const handlePrimaryClick = () => {
    if (onPrimaryCtaClick) {
      onPrimaryCtaClick();
    } else {
      if (session?.user) {
        router.push("/dashboard");
      } else {
        router.push("/sign-in?mode=signup");
      }
    }
  };

  // Scroll detection for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Touch device detection to disable cursor tilt on mobile
  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  // ── 3D CARD TILT VALUES (SUBTLE & RESTRAINED) ──
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 200, mass: 0.6 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || isTouchDevice || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <section className="relative h-screen max-h-screen w-full flex flex-col justify-between overflow-hidden bg-[#0A0D14] text-white selection:bg-[#475569]/30 font-sans">
      
      {/* ═══════════════════ BACKGROUND: ARCHITECTURAL BACKGROUND ═══════════════════ */}
      <div 
        className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
        }}
        aria-hidden="true"
      >
        <img
          src="/images/hero-bg.webp"
          alt=""
          className="w-full h-full object-cover select-none pointer-events-none"
        />
      </div>

      {/* ═══════════════════ NAVBAR ═══════════════════ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-[#040A0F]/85 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/30"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-18 sm:h-20 flex items-center justify-between">
          {/* Left: AtomicPay Logo */}
          <div className="flex items-center">
            <AtomicPayLogo theme="dark" size="sm" />
          </div>

          {/* Right: Sign in, Sign up OR Dashboard if authenticated */}
          <div className="flex items-center gap-3">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="bg-white hover:bg-slate-100 text-black text-xs sm:text-[13px] font-semibold px-5 py-2 rounded-full transition-all shadow-md active:scale-95"
              >
                Dashboard
              </Link>
            ) : (
              <>
                {/* Dark "Sign In" Pill Button */}
                <Link
                  href="/sign-in?mode=signin"
                  className="bg-[#181D26] hover:bg-[#222937] border border-white/10 text-white text-xs sm:text-[13px] font-medium px-5 py-2 rounded-full transition-all shadow-sm active:scale-95"
                >
                  Sign In
                </Link>

                {/* Solid White "Sign Up" Pill Button */}
                <Link
                  href="/sign-in?mode=signup"
                  className="bg-white hover:bg-slate-100 text-black text-xs sm:text-[13px] font-semibold px-5 py-2 rounded-full transition-all shadow-md active:scale-95"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════ MAIN HERO CONTENT (CENTERED, BALANCED VERTICAL RHYTHM) ═══════════════════ */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-22 sm:pt-24 pb-6 flex-1 flex flex-col items-center justify-center text-center">
        
        {/* Main Headline — Bold, Centered, White with blue "trust." */}
        <motion.h1
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.2rem] font-bold tracking-tight leading-[1.08] text-white max-w-4xl"
        >
          {headline}
        </motion.h1>

        {/* Supporting Headline — Directly underneath with tight gap */}
        <motion.p
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 sm:mt-3.5 text-sm sm:text-base md:text-[16px] font-normal text-slate-300/90 max-w-3xl mx-auto leading-relaxed"
        >
          {supportingLine}
        </motion.p>

        {/* ═══════════════════ CENTRAL ATOMICPAY WALLET CARD (1.7:1 PROPORTIONS) ═══════════════════ */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 sm:mt-6 perspective-1000"
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Card Wrapper with Subtle 3D Tilt, Floating Motion & 1.05x Hover Scale */}
          <motion.div
            whileHover={
              shouldReduceMotion
                ? undefined
                : {
                    scale: 1.02,
                    transition: { duration: 0.45, ease: [0.25, 1, 0.5, 1] },
                  }
            }
            style={{
              rotateX: shouldReduceMotion || isTouchDevice ? 0 : rotateX,
              rotateY: shouldReduceMotion || isTouchDevice ? 0 : rotateY,
              transformStyle: "preserve-3d",
            }}
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    y: [0, -2, 0],
                  }
            }
            transition={{
              scale: { duration: 0.45, ease: [0.25, 1, 0.5, 1] },
              y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
            }}
            className="relative w-[350px] sm:w-[430px] md:w-[475px] aspect-[1.7/1] rounded-[20px] p-5 sm:p-6 flex flex-col justify-between select-none shadow-2xl transition-shadow duration-300 cursor-pointer"
          >
            {/* Card Background: Slate/Dark Metallic Gradient, Thin Border & Soft Shadow */}
            <div
              className="absolute inset-0 rounded-[20px] overflow-hidden pointer-events-none"
              style={{
                background: "linear-gradient(140deg, #2A2F3A 0%, #1c1f26 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: `
                  0 24px 55px -12px rgba(0, 0, 0, 0.45),
                  0 8px 20px -4px rgba(0, 0, 0, 0.55),
                  inset 0 1px 1px rgba(255, 255, 255, 0.1),
                  inset -1px -1px 1px rgba(0, 0, 0, 0.3)
                `,
              }}
            >
              {/* Subtle diagonal sheen */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(120deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 40%, transparent 65%)",
                }}
              />

              {/* Restrained radial highlight on top-left of card */}
              <div
                className="absolute -top-10 -left-10 w-44 h-44 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle, rgba(255, 255, 255, 0.06) 0%, transparent 70%)",
                }}
              />
            </div>

            {/* ── CARD TOP ROW: CHIP & CONTACTLESS ── */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Gold / Amber EMV Chip */}
                <div
                  className="w-10 h-8 rounded-[5px] relative overflow-hidden flex items-center justify-center shadow-sm"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
                    border: "1px solid rgba(180, 83, 9, 0.65)",
                    boxShadow: "inset 0 1px 1px rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.2)",
                  }}
                >
                  {/* Micro-lines */}
                  <div className="w-full h-full relative opacity-60">
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-amber-950/70 -translate-y-1/2" />
                    <div className="absolute top-0 bottom-0 left-1/3 w-[1px] bg-amber-950/70" />
                    <div className="absolute top-0 bottom-0 right-1/3 w-[1px] bg-amber-950/70" />
                    <div className="absolute top-1/4 left-1/3 right-1/3 h-[1px] bg-amber-950/70" />
                    <div className="absolute bottom-1/4 left-1/3 right-1/3 h-[1px] bg-amber-950/70" />
                  </div>
                </div>

                {/* Contactless Wave Icon */}
                <div className="text-white/75 rotate-90 scale-90">
                  <Wifi className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* ── CARD MID ROW: NUMBER & EXPIRY ── */}
            <div className="relative z-10 my-auto pt-1">
              {/* Spaced Digits Monospace */}
              <div className="font-mono text-white text-base sm:text-lg md:text-[21px] font-semibold tracking-[0.18em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                {cardNumber}
              </div>

              {/* Expiry Label & Date (positioned directly below 4th group of 0000) */}
              <div className="flex flex-col items-end mr-2 sm:mr-3 -mt-0.5">
                <span className="text-[8px] uppercase tracking-wider text-blue-200/75 font-medium">
                  VALID
                </span>
                <span className="font-mono text-[11.5px] sm:text-[12.5px] text-white font-semibold">
                  {expiryDate}
                </span>
              </div>
            </div>

            {/* ── CARD BOTTOM ROW: NAME & ATOMICPAY BRANDMARK ── */}
            <div className="relative z-10 flex items-end justify-between pt-0.5">
              {/* Cardholder Name & Simulated Wallet */}
              <div className="flex flex-col items-start">
                <div className="text-xs sm:text-[13px] font-semibold tracking-wider text-white uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                  {cardHolderName}
                </div>
                <div className="text-[7.5px] font-bold tracking-[0.14em] text-blue-300/60 uppercase mt-0.5">
                  SIMULATED WALLET
                </div>
              </div>

              {/* AtomicPay Brandmark on Card */}
              <div className="flex items-center">
                <AtomicPayLogo theme="dark" size="sm" />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* ═══════════════════ CTA BUTTONS (STABLE POSITIONING BELOW CARD) ═══════════════════ */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 sm:mt-7 flex flex-row items-center justify-center gap-3.5 sm:gap-4 pointer-events-auto"
        >
          {/* Primary CTA: "Get started" */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handlePrimaryClick}
            className="bg-white hover:bg-slate-100 text-slate-950 font-semibold text-sm sm:text-[15px] px-8 py-3 rounded-full shadow-[0_4px_20px_rgba(255,255,255,0.12)] hover:shadow-[0_6px_24px_rgba(255,255,255,0.22)] transition-all active:scale-95 cursor-pointer"
          >
            {primaryCtaText}
          </motion.button>

          {/* Secondary CTA: only rendered if provided */}
          {secondaryCtaText && onSecondaryCtaClick && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onSecondaryCtaClick}
              className="border border-white/45 hover:border-white text-white font-medium text-sm sm:text-[15px] px-6 sm:px-7 py-2.5 sm:py-3 rounded-full bg-transparent hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
            >
              {secondaryCtaText}
            </motion.button>
          )}
        </motion.div>

      </div>

      {/* Grounding spacer at bottom */}
      <div className="w-full h-4 pointer-events-none" />
    </section>
  );
}

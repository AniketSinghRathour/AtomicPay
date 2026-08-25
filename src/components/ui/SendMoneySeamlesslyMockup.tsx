"use client";

import React from "react";
import Image from "next/image";

export function SendMoneySeamlesslyMockup() {
  return (
    <div className="relative w-full max-w-[620px] md:max-w-[700px] lg:max-w-[820px] xl:max-w-[890px] flex items-end justify-center lg:justify-end select-none origin-bottom scale-[1.08] sm:scale-[1.1] hover:scale-[1.15] transition-transform duration-500 ease-out">
      <div className="relative w-full flex items-end">
        {/* Multi-layered ambient lighting and vector contours */}
        <div 
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          {/* Right Shoulder Backlight */}
          <div 
            className="absolute top-[14%] right-[10%] w-[34%] h-[36%] rounded-full opacity-70 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 50% 50%, rgba(194, 221, 246, 0.18) 0%, rgba(138, 171, 218, 0.10) 35%, rgba(49, 70, 98, 0.05) 60%, transparent 80%)",
              filter: "blur(46px)",
            }}
          />

          {/* Left Wire Apex Ambient Bloom */}
          <div 
            className="absolute top-[28%] left-[14%] w-[28%] h-[36%] rounded-full opacity-65 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 45% 50%, rgba(194, 221, 246, 0.16) 0%, rgba(100, 127, 173, 0.09) 35%, rgba(49, 70, 98, 0.04) 65%, transparent 80%)",
              filter: "blur(42px)",
            }}
          />

          {/* Lower-Right Loop Bloom */}
          <div 
            className="absolute bottom-[4%] right-[5%] w-[28%] h-[32%] rounded-full opacity-70 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 55% 55%, rgba(194, 221, 246, 0.16) 0%, rgba(138, 171, 218, 0.09) 40%, rgba(49, 70, 98, 0.03) 65%, transparent 80%)",
              filter: "blur(44px)",
            }}
          />

          <div 
            className="absolute top-[8%] left-[4%] right-[4%] h-[80%] rounded-full opacity-55 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 52% 48%, rgba(100, 127, 173, 0.12) 0%, rgba(49, 70, 98, 0.07) 45%, rgba(8, 13, 22, 0.02) 75%, transparent 85%)",
              filter: "blur(60px)",
            }}
          />
        </div>

        <svg 
          viewBox="0 0 1527 1030" 
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0"
          aria-hidden="true"
        >
          <defs>
            <filter id="arc-haze" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="28" />
            </filter>
            <filter id="arc-bloom" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="12" />
            </filter>
            <filter id="arc-inner-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>

          {/* ── LEFT WIRE GLOW: Sweeping around left phone body ── */}
          <g id="left-wire-glow">
            {/* Layer 1: Atmospheric navy-blue haze */}
            <path
              d="M 580 638 C 440 565, 335 485, 326 405 C 320 345, 400 310, 535 275"
              fill="none"
              stroke="#6688B6"
              strokeWidth="48"
              opacity="0.065"
              filter="url(#arc-haze)"
            />
            {/* Layer 2: Soft blue-gray bloom */}
            <path
              d="M 580 638 C 440 565, 335 485, 326 405 C 320 345, 400 310, 535 275"
              fill="none"
              stroke="#9DBCE0"
              strokeWidth="20"
              opacity="0.18"
              filter="url(#arc-bloom)"
            />
            {/* Layer 3: Inner soft icy halo (blurred, not a sharp line) */}
            <path
              d="M 580 638 C 440 565, 335 485, 326 405 C 320 345, 400 310, 535 275"
              fill="none"
              stroke="#C2DDF6"
              strokeWidth="8"
              opacity="0.22"
              filter="url(#arc-inner-glow)"
            />
          </g>

          {/* ── RIGHT LOWER LOOP GLOW: Teardrop loop down right device ── */}
          <g id="right-lower-glow">
            {/* Layer 1: Atmospheric navy-blue haze */}
            <path
              d="M 1270 750 C 1275 800, 1330 845, 1348 895 C 1355 935, 1290 955, 1190 955"
              fill="none"
              stroke="#6688B6"
              strokeWidth="48"
              opacity="0.065"
              filter="url(#arc-haze)"
            />
            {/* Layer 2: Soft blue-gray bloom */}
            <path
              d="M 1270 750 C 1275 800, 1330 845, 1348 895 C 1355 935, 1290 955, 1190 955"
              fill="none"
              stroke="#9DBCE0"
              strokeWidth="20"
              opacity="0.18"
              filter="url(#arc-bloom)"
            />
            {/* Layer 3: Inner soft icy halo (blurred, not a sharp line) */}
            <path
              d="M 1270 750 C 1275 800, 1330 845, 1348 895 C 1355 935, 1290 955, 1190 955"
              fill="none"
              stroke="#C2DDF6"
              strokeWidth="8"
              opacity="0.22"
              filter="url(#arc-inner-glow)"
            />
          </g>

          {/* ── RIGHT UPPER LOOP GLOW: Curving up along right shoulder ── */}
          <g id="right-upper-glow">
            {/* Layer 1: Atmospheric navy-blue haze */}
            <path
              d="M 1270 750 C 1310 760, 1405 710, 1400 620 C 1395 550, 1330 470, 1220 480"
              fill="none"
              stroke="#6688B6"
              strokeWidth="42"
              opacity="0.045"
              filter="url(#arc-haze)"
            />
            {/* Layer 2: Soft blue-gray bloom */}
            <path
              d="M 1270 750 C 1310 760, 1405 710, 1400 620 C 1395 550, 1330 470, 1220 480"
              fill="none"
              stroke="#9DBCE0"
              strokeWidth="16"
              opacity="0.14"
              filter="url(#arc-bloom)"
            />
            {/* Layer 3: Inner soft icy halo (blurred, not a sharp line) */}
            <path
              d="M 1270 750 C 1310 760, 1405 710, 1400 620 C 1395 550, 1330 470, 1220 480"
              fill="none"
              stroke="#C2DDF6"
              strokeWidth="6"
              opacity="0.18"
              filter="url(#arc-inner-glow)"
            />
          </g>
        </svg>

        <Image
          src="/images/mockup.webp"
          alt="AtomicPay Send Money Seamlessly Mockup"
          width={1527}
          height={1030}
          priority
          className="relative z-10 w-full h-auto object-contain object-bottom pointer-events-none select-none block -mb-0.5"
        />
      </div>
    </div>
  );
}

"use client";

import React from "react";
import Image from "next/image";

export interface AtomicPayLogoProps {
  className?: string;
  variant?: "full" | "icon" | "wordmark" | "combined";
  theme?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  height?: number;
  gap?: "tight" | "normal" | "wide" | "relaxed" | string;
  alt?: string;
  withGlow?: boolean;
}

/**
 * AtomicPayLogo
 */
export function AtomicPayLogo({
  className = "",
  variant = "full",
  theme = "dark",
  size = "md",
  height,
  gap,
  alt = "AtomicPay",
  withGlow = true,
}: AtomicPayLogoProps) {
  const isDark = theme === "dark";

  const logoHeight = height ?? (size === "sm" ? 28 : size === "lg" ? 44 : 36);

  const iconWidth = Math.round(logoHeight * (529 / 458));
  const wordmarkWidth = Math.round(logoHeight * (1504 / 458));

  // Determine appropriate gap between emblem and text
  const defaultGapClass =
    logoHeight <= 20
      ? "gap-1.5"
      : logoHeight <= 30
      ? "gap-2.5"
      : logoHeight <= 38
      ? "gap-3"
      : "gap-3.5";

  const gapClass = gap
    ? gap === "tight"
      ? "gap-2"
      : gap === "normal"
      ? defaultGapClass
      : gap === "wide"
      ? "gap-4"
      : gap === "relaxed"
      ? "gap-5"
      : gap
    : defaultGapClass;

  const glowStyle =
    withGlow
      ? { filter: "drop-shadow(0 2px 8px rgba(74, 222, 128, 0.22))" }
      : undefined;

  const wordmarkSrc = "/logos/logo-wordmark.webp";
  const iconSrc = "/logos/logo-icon.webp";

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      {/* 
        Default "full" variant: 
        Renders the emblem and text wordmark as separate elements with 
        deliberate, generous spacing between them for optimal brand legibility.
      */}
      {variant === "full" && (
        <div className={`inline-flex items-center ${gapClass}`}>
          <div className="relative shrink-0 flex items-center justify-center" style={glowStyle}>
            <Image
              src={iconSrc}
              alt={`${alt} emblem`}
              width={iconWidth}
              height={logoHeight}
              style={{ width: `${iconWidth}px`, height: `${logoHeight}px` }}
              className="object-contain block transition-transform duration-200"
              priority
            />
          </div>
          <div className="relative shrink-0 flex items-center justify-center">
            <Image
              src={wordmarkSrc}
              alt={`${alt} text`}
              width={wordmarkWidth}
              height={logoHeight}
              style={{ width: `${wordmarkWidth}px`, height: `${logoHeight}px` }}
              className="object-contain block transition-opacity duration-200"
              priority
            />
          </div>
        </div>
      )}

      {/* Emblem icon only */}
      {variant === "icon" && (
        <div className="relative shrink-0 flex items-center justify-center" style={glowStyle}>
          <Image
            src={iconSrc}
            alt={alt}
            width={iconWidth}
            height={logoHeight}
            style={{ width: `${iconWidth}px`, height: `${logoHeight}px` }}
            className="object-contain block"
            priority
          />
        </div>
      )}

      {/* Wordmark text only */}
      {variant === "wordmark" && (
        <div className="relative shrink-0 flex items-center justify-center">
          <Image
            src={wordmarkSrc}
            alt={alt}
            width={wordmarkWidth}
            height={logoHeight}
            style={{ width: `${wordmarkWidth}px`, height: `${logoHeight}px` }}
            className="object-contain block"
            priority
          />
        </div>
      )}
    </div>
  );
}

export default AtomicPayLogo;

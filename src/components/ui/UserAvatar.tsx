"use client";

import React from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface UserAvatarProps {
  name?: string;
  initials?: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isWallet?: boolean;
  className?: string;
}

export function UserAvatar({
  name = "User",
  initials,
  color,
  size = "md",
  isWallet = false,
  className = "",
}: UserAvatarProps) {
  const displayInitials =
    initials ||
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-18 h-18 text-xl",
  }[size];

  // Default gradient palette for profile and wallet avatars
  const defaultGradient = isWallet
    ? "from-sky-500 to-indigo-600 text-white"
    : color || "from-emerald-600 to-teal-700 text-white";

  return (
    <div
      className={`rounded-full bg-gradient-to-tr ${defaultGradient} flex items-center justify-center font-semibold shrink-0 shadow-md ring-1 ring-white/15 select-none ${sizeClasses} ${className}`}
    >
      {isWallet ? (
        <Wallet className={size === "sm" || size === "xs" ? "w-3.5 h-3.5" : "w-5 h-5"} />
      ) : (
        <span>{displayInitials}</span>
      )}
    </div>
  );
}

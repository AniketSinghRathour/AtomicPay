"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Settings, LogOut, Loader2 } from "lucide-react";
import { AtomicPayLogo } from "../ui/AtomicPayLogo";
import { UserAvatar } from "../ui/UserAvatar";
import { useSession, signOut } from "@/lib/auth-client";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const { data: session, isPending } = useSession();

  React.useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/sign-in");
    }
  }, [session, isPending, router]);

  const handleSignOut = async () => {
    setProfileOpen(false);
    try {
      await signOut();
    } catch (e) {
      console.error("Sign out failed:", e);
    }
    window.location.href = "/sign-in";
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#070B13] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const userName = session.user.name || "User";
  const userEmail = session.user.email || "";

  return (
    <div className="min-h-screen bg-[#070B13] text-slate-100 font-sans antialiased selection:bg-[#475569]/30 selection:text-white relative overflow-x-hidden flex flex-col">
      {/* ── Background Layer ── */}
      <div 
        className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
        style={{
          position: "fixed",
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
          className="w-full h-full object-cover select-none pointer-events-none opacity-90"
        />
        {/* Subtle dark atmospheric tint to ensure crisp text and card contrast */}
        <div className="absolute inset-0 bg-[#070B13]/35 pointer-events-none" />
      </div>

      {/* ── Navigation Header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#070B13]/85 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Left: AtomicPay Logo */}
          <Link href="/" className="flex items-center gap-2 group cursor-pointer transition-opacity hover:opacity-90">
            <AtomicPayLogo theme="dark" size="sm" />
          </Link>

          {/* Right: User Profile (No Notifications) */}
          <div className="flex items-center gap-3">
            
            {/* User Profile Avatar & Name Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 pl-1 pr-1.5 py-1 rounded-full hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                {/* User avatar with initial */}
                <UserAvatar name={userName} size="sm" />

                {/* Name & down chevron*/}
                <div className="hidden sm:flex items-center gap-1 text-sm font-medium text-white">
                  <span>{userName.split(" ")[0]}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0D121F] border border-white/10 shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="p-3 border-b border-white/[0.06] space-y-1">
                    <div className="font-bold text-white text-sm">{userName}</div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {userEmail}
                    </div>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <Link
                      href="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Account Settings</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-white/[0.06]">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 z-10">
        {children}
      </main>

    </div>
  );
}

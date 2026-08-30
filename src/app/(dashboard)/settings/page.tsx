"use client";

import React, { useState } from "react";
import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { 
  X, 
  Check, 
  Loader2,
  LogOut,
  Mail,
  User,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { UserAvatar } from "@/components/ui/UserAvatar";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // User details
  const [name, setName] = useState(session?.user?.name || "");
  const email = session?.user?.email || "";
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");

    const trimmed = name.trim();
    if (!trimmed) {
      setProfileError("Please enter your name.");
      return;
    }
    if (trimmed.length < 2) {
      setProfileError("Full name must be at least 2 characters long.");
      return;
    }

    setSavingProfile(true);
    try {
      if (session) {
        await authClient.updateUser({ name: trimmed });
      }
      setProfileSaved(true);
      setIsEditing(false);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err: any) {
      setProfileError(err?.message || "Failed to update profile name.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch (e) {
      console.error("Sign out failed:", e);
    }
    window.location.href = "/sign-in";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] py-4 select-none font-sans">
      <div className="w-full max-w-[440px]">
        <SpotlightCard>
          <div className="space-y-6 w-full">
            {/* Header with Close 'x' button */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Account Settings
              </h1>
              <Link
                href="/dashboard"
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-5 h-5" />
              </Link>
            </div>

            {/* User Header Profile Card */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0f121a] border border-white/10">
              <div className="flex items-center gap-3.5">
                <UserAvatar name={name} color="from-blue-600 to-indigo-600" size="lg" />
                <div>
                  <h3 className="text-base font-semibold text-white">{name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-1.5 rounded-full bg-[#181d28] hover:bg-[#222a3a] border border-white/10 text-xs font-medium text-white transition-colors cursor-pointer"
              >
                {isEditing ? "Cancel" : "Edit Name"}
              </button>
            </div>

            {/* Profile Information */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0f121a] border border-white/10 text-xs text-white focus:outline-none transition-all ${
                    isEditing ? "focus:ring-1 focus:ring-white/30" : "opacity-80 cursor-not-allowed"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Wallet ID (Email)</span>
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f121a] border border-white/10 text-xs text-white font-mono opacity-60 cursor-not-allowed focus:outline-none"
                />
              </div>

              {isEditing && (
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2 bg-[#475569] hover:bg-[#334155] text-white font-medium rounded-full text-xs transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-black/25 active:scale-95 disabled:opacity-40"
                  >
                    {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              )}

              {profileError && (
                <div className="p-2.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl font-medium flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSaved && (
                <p className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Name updated successfully
                </p>
              )}
            </form>

            {/* Account Status & Sign Out */}
            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Simulated Wallet &bull; Active</span>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}

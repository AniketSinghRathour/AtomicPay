"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, signUp, useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AtomicPayLogo } from "@/components/ui/AtomicPayLogo";
import { DottedMovingWave } from "@/components/ui/DottedMovingWave";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const initialMode = searchParams.get("mode") === "signin" ? false : true;

  const [isSignUp, setIsSignUp] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user) {
      router.replace("/dashboard");
    }
  }, [session, router]);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signin") setIsSignUp(false);
    if (mode === "signup") setIsSignUp(true);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Form validation
    if (isSignUp) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError("Please enter your full name.");
        return;
      }
      if (trimmedName.length < 2) {
        setError("Full name must be at least 2 characters long.");
        return;
      }
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address (e.g. alex@example.com).");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (password.length < 8) {
      setError("Password is too short. Minimum 8 characters required.");
      return;
    }
    if (password.length > 128) {
      setError("Password cannot exceed 128 characters.");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await signUp.email({ email: trimmedEmail, password, name: name.trim() });
        if (error) throw error;
      } else {
        const { data, error } = await signIn.email({ email: trimmedEmail, password });
        if (error) throw error;
      }
      router.push("/dashboard");
    } catch (err: any) {
      const rawMsg = err?.message || "";
      const lower = rawMsg.toLowerCase();
      if (lower.includes("short") || (lower.includes("password") && lower.includes("min"))) {
        setError("Password is too short. Minimum 8 characters required.");
      } else if (lower.includes("already exists") || lower.includes("user_already_exists")) {
        setError("An account with this email already exists. Please sign in instead.");
      } else if (lower.includes("invalid login credentials") || lower.includes("invalid password") || lower.includes("invalid email or password")) {
        setError("Incorrect email or password. Please verify your credentials.");
      } else if (lower.includes("invalid email")) {
        setError("Please enter a valid email address (e.g. alex@example.com).");
      } else {
        setError(rawMsg || "Authentication failed. Please check your details and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signIn.social({ provider: "google", callbackURL: "/dashboard" });
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0A0D14] text-white font-sans relative overflow-hidden selection:bg-[#475569]/30">
      {/* Ambient edge lighting */}
      <div 
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full pointer-events-none" 
        style={{
          background: "radial-gradient(circle at center, rgba(101, 137, 182, 0.12) 0%, rgba(49, 70, 98, 0.04) 50%, transparent 70%)",
        }}
      />
      <div 
        className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full pointer-events-none" 
        style={{
          background: "radial-gradient(circle at center, rgba(101, 137, 182, 0.10) 0%, rgba(49, 70, 98, 0.03) 50%, transparent 70%)",
        }}
      />

      {/* Dynamic background particle wave */}
      <DottedMovingWave className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <Link href="/" className="mb-5 hover:opacity-90 transition-opacity">
            <AtomicPayLogo theme="dark" size="md" />
          </Link>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-white text-center">
            {isSignUp ? "Create your account" : "Welcome back."}
          </h1>
          <p className="text-slate-400 mt-1.5 text-xs sm:text-[13px] font-normal text-center">
            {isSignUp ? "Join and start using your simulated wallet." : "Sign in to access your simulated wallet."}
          </p>
        </div>

        {/* Card */}
        <div 
          className="p-6 sm:p-7 rounded-[22px] shadow-2xl relative overflow-hidden space-y-5"
          style={{
            background: "linear-gradient(140deg, #181d28 0%, #10141e 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: `
              0 24px 50px -12px rgba(0, 0, 0, 0.6),
              inset 0 1px 1px rgba(255, 255, 255, 0.08)
            `,
          }}
        >
          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 px-4 flex items-center justify-center gap-2.5 border border-white/10 bg-[#161a24] hover:bg-[#1f2533] text-white rounded-full font-medium text-xs sm:text-[13px] transition-all active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[#131722] text-slate-400 font-normal">or</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && (
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-300">Full name</label>
                <input
                  type="text"
                  required
                  placeholder="Alex Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f121a] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-white/25 text-xs sm:text-sm font-normal transition-all"
                />
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">Email</label>
              <input
                type="email"
                required
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f121a] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-white/25 text-xs sm:text-sm font-normal transition-all"
              />
            </div>
            
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-medium text-slate-300">Password</label>
                  {isSignUp && (
                    <span className="text-[10px] text-slate-400 font-normal">
                      Min. 8 characters
                    </span>
                  )}
                </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#0f121a] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-white/25 text-xs sm:text-sm font-normal tracking-wide transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl font-medium flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2.5 bg-[#475569] hover:bg-[#334155] active:scale-[0.98] text-white rounded-full font-medium text-xs sm:text-[13px] transition-all shadow-md shadow-black/30 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSignUp ? (
                "Create account"
              ) : (
                "Sign in"
              )}
            </button>

            {/* Terms & Privacy disclaimer */}
            {isSignUp && (
              <p className="text-[11px] text-slate-400 text-center leading-relaxed pt-1">
                By clicking continue, you agree to our{" "}
                <span className="underline hover:text-white cursor-pointer transition-colors">Terms of Service</span>{" "}
                and{" "}
                <span className="underline hover:text-white cursor-pointer transition-colors">Privacy Policy</span>.
              </p>
            )}
          </form>
        </div>

        {/* Footer Switch */}
        <p className="text-center text-slate-400 text-xs sm:text-[13px] mt-6 font-normal">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-white hover:underline font-medium transition-colors cursor-pointer ml-1"
          >
            {isSignUp ? "Sign in" : "Create one"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0D14]" />}>
      <SignInContent />
    </Suspense>
  );
}

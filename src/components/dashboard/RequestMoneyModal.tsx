"use client";

import React, { useState, useEffect } from "react";
import { FileText, X, Check, AlertCircle, Loader2, Mail } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

interface RequestMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export function RequestMoneyModal({
  isOpen,
  onClose,
  onSuccess,
}: RequestMoneyModalProps) {
  const [walletEmail, setWalletEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "valid" | "invalid">("idle");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  // Success state
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastRequestedAmount, setLastRequestedAmount] = useState(0);
  const [lastRequestedRecipient, setLastRequestedRecipient] = useState("");

  useEffect(() => {
    if (isOpen) {
      setWalletEmail("");
      setVerifiedEmail("");
      setToWalletId("");
      setCounterpartyName("");
      setVerificationStatus("idle");
      setVerificationMessage("");
      setAmount("");
      setNote("");
      setError("");
      setIsRequesting(false);
      setIsSuccess(false);
    }
  }, [isOpen]);

  // Debounced lookup - immediately invalidates if input changes from verified email
  useEffect(() => {
    const trimmed = walletEmail.trim().toLowerCase();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

    // If input matches already verified email, keep current valid state
    if (verifiedEmail && trimmed === verifiedEmail) {
      return;
    }

    // Input changed from verified email: immediately invalidate previous verification
    setToWalletId("");
    setCounterpartyName("");
    setVerifiedEmail("");

    if (!isEmail) {
      setVerificationStatus("idle");
      setVerificationMessage("");
      return;
    }

    setVerificationStatus("verifying");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/lookup?q=${encodeURIComponent(trimmed)}&mode=request`);
        const data = await res.json();
        if (res.ok && data.valid && data.user) {
          setVerificationStatus("valid");
          setVerificationMessage(`Verified: ${data.user.name}`);
          setVerifiedEmail(trimmed);
          setToWalletId(data.user.walletId);
          setCounterpartyName(data.user.name);
        } else {
          setVerificationStatus("invalid");
          setVerificationMessage(data.error || "User not found");
          setVerifiedEmail("");
          setToWalletId("");
          setCounterpartyName("");
        }
      } catch (err) {
        setVerificationStatus("invalid");
        setVerificationMessage("Verification check failed");
        setVerifiedEmail("");
        setToWalletId("");
        setCounterpartyName("");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [walletEmail, verifiedEmail]);

  if (!isOpen) return null;

  const handleConfirmRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError("Please enter a valid requested amount (minimum ₹1.00).");
      return;
    }
    if (!toWalletId || verificationStatus !== "valid") {
      setError("Please enter a verified payer email address.");
      return;
    }

    setIsRequesting(true);
    try {
      const res = await fetch("/api/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toWalletId,
          amount: Math.round(num * 100), // convert to paise
          message: note || "Payment request",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create payment request");
        return;
      }

      onSuccess();
      setLastRequestedAmount(num);
      setLastRequestedRecipient(counterpartyName || walletEmail);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Error creating request");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className={`w-full ${isSuccess ? "max-w-[400px]" : "max-w-[440px]"} animate-in zoom-in-95`}>
        <SpotlightCard>
          {isSuccess ? (
            /* Success Feedback */
            <div className="w-full text-center space-y-5 py-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex justify-center -mt-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg">
                  <Check className="w-8 h-8 stroke-[2.5]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Request sent
                </h3>
                <p className="text-sm font-semibold text-slate-200 font-mono">
                  ₹ {lastRequestedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} requested
                </p>
                <p className="text-xs text-slate-400 font-mono pt-1">
                  Requested from {lastRequestedRecipient}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-full bg-[#202736] hover:bg-[#2c364b] border border-white/10 text-white font-medium text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Input Form */
            <div className="w-full space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-300" />
                  <h3 className="text-base font-bold text-white">Request money</h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmRequest} className="space-y-4">
                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Payer Wallet ID Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-slate-300">Payer Wallet ID</label>
                    {verificationStatus === "verifying" && (
                      <span className="text-[11px] text-sky-400 font-mono flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Verifying...
                      </span>
                    )}
                    {verificationStatus === "valid" && (
                      <span className="text-[11px] text-emerald-400 font-mono font-medium flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[2.5]" /> {verificationMessage}
                      </span>
                    )}
                    {verificationStatus === "invalid" && (
                      <span className="text-[11px] text-rose-400 font-mono flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {verificationMessage}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      value={walletEmail}
                      onChange={(e) => setWalletEmail(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0f121a] border text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors ${
                        verificationStatus === "valid"
                          ? "border-emerald-500/50 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20"
                          : verificationStatus === "invalid"
                          ? "border-rose-500/50 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/20"
                          : "border-white/10 focus:border-white/30 focus:ring-1 focus:ring-white/20"
                      }`}
                      placeholder="payer@atomicpay.com"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enter the payer&apos;s registered email address (their unique Wallet ID).
                  </p>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono text-slate-400 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={amount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.replace(/[^0-9]/g, "").length > 10) return;
                        setAmount(val);
                      }}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#0f121a] border border-white/10 text-base font-mono font-bold text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Note (optional)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f121a] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20"
                    placeholder="What's this for?"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-1/2 py-2.5 rounded-full bg-[#181d28] hover:bg-[#222a3a] border border-white/10 text-xs font-medium text-slate-300 hover:text-white cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isRequesting ||
                      verificationStatus !== "valid" ||
                      !toWalletId ||
                      !amount ||
                      parseFloat(amount) <= 0
                    }
                    className="w-1/2 py-2.5 rounded-full font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-[#1e2638] disabled:text-slate-500 disabled:shadow-none"
                  >
                    {isRequesting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      "Send request"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </SpotlightCard>
      </div>
    </div>
  );
}

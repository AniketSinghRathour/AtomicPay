"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, ArrowLeft, X, Check, AlertCircle, Loader2, Mail } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { PinInput, type PinInputHandle } from "@/components/ui/PinInput";

interface SendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  hasPin: boolean;
  onNeedPin: () => void;
  onSuccess: () => Promise<void> | void;
}

export function SendMoneyModal({
  isOpen,
  onClose,
  balance,
  hasPin,
  onNeedPin,
  onSuccess,
}: SendMoneyModalProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [walletEmail, setWalletEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "valid" | "invalid">("idle");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  // PIN State
  const [pin, setPin] = useState("");
  const pinRef = useRef<PinInputHandle>(null);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setWalletEmail("");
      setVerifiedEmail("");
      setToWalletId("");
      setRecipientName("");
      setVerificationStatus("idle");
      setVerificationMessage("");
      setAmount("");
      setNote("");
      setError("");
      setPin("");
      setIsSending(false);
    }
  }, [isOpen]);

  // Recipient lookup debouncing - immediately invalidates if input changes from verified email
  useEffect(() => {
    const trimmed = walletEmail.trim().toLowerCase();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

    // If input matches already verified email, keep current valid state
    if (verifiedEmail && trimmed === verifiedEmail) {
      return;
    }

    // Input changed from verified email: immediately invalidate previous verification
    setToWalletId("");
    setRecipientName("");
    setVerifiedEmail("");

    if (!isEmail) {
      setVerificationStatus("idle");
      setVerificationMessage("");
      return;
    }

    setVerificationStatus("verifying");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/lookup?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (res.ok && data.valid && data.user) {
          setVerificationStatus("valid");
          setVerificationMessage(`Verified: ${data.user.name}`);
          setVerifiedEmail(trimmed);
          setToWalletId(data.user.walletId);
          setRecipientName(data.user.name);
        } else {
          setVerificationStatus("invalid");
          setVerificationMessage(data.error || "User not found");
          setVerifiedEmail("");
          setToWalletId("");
          setRecipientName("");
        }
      } catch (err) {
        setVerificationStatus("invalid");
        setVerificationMessage("Verification check failed");
        setVerifiedEmail("");
        setToWalletId("");
        setRecipientName("");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [walletEmail, verifiedEmail]);

  if (!isOpen) return null;

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError("Please enter a valid transfer amount (minimum ₹1.00).");
      return;
    }
    if (num > balance) {
      setError(`Insufficient wallet balance. Available balance: ₹${balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}.`);
      return;
    }
    if (!toWalletId || verificationStatus !== "valid") {
      setError("Please enter a verified recipient email address.");
      return;
    }

    if (!hasPin) {
      onNeedPin();
      return;
    }

    setPin("");
    setStep(2);
  };

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (pin.length !== 4) {
      setError("Please enter your complete 4-digit PIN (4 digits required).");
      setPin("");
      pinRef.current?.focus(0);
      return;
    }

    const num = parseFloat(amount);
    setIsSending(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toWalletId,
          amount: Math.round(num * 100), // convert to paise
          description: note || "Peer transfer",
          idempotencyKey: crypto.randomUUID(),
          transactionPin: pin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Payment authorization failed. Incorrect 4-digit PIN.");
        setPin("");
        pinRef.current?.focus(0);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to execute transfer");
      setPin("");
      pinRef.current?.focus(0);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className={`w-full ${step === 1 ? "max-w-[440px]" : "max-w-[420px]"} animate-in zoom-in-95`}>
        <SpotlightCard>
          {step === 1 ? (
            /* STEP 1: Transfer Details */
            <div className="w-full space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-slate-300" />
                  <h3 className="text-base font-bold text-white">Send money</h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleContinue} className="space-y-4">
                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Recipient Wallet ID Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-slate-300">Recipient Wallet ID</label>
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
                      placeholder="recipient@atomicpay.com"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enter the recipient&apos;s registered email address (their unique Wallet ID).
                  </p>
                </div>

                {/* Amount Input */}
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

                {/* Available Balance Status */}
                <div className="pt-1 text-xs space-y-1">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Available balance</span>
                    <span className="font-mono font-semibold">₹ {balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {balance <= 0 && (
                    <div className="flex items-center gap-1.5 text-amber-400 text-[11px] pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Add money to send funds.</span>
                    </div>
                  )}
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
                      balance <= 0 ||
                      !amount ||
                      parseFloat(amount) <= 0 ||
                      parseFloat(amount) > balance ||
                      verificationStatus !== "valid" ||
                      !toWalletId
                    }
                    className="w-1/2 py-2.5 rounded-full font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-[#1e2638] disabled:text-slate-500 disabled:shadow-none"
                  >
                    Continue
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* STEP 2: PIN Authorization */
            <div className="w-full space-y-5 text-center">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] text-left">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-slate-400 hover:text-white p-1 -ml-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h3 className="text-base font-bold text-white">Authorize Transfer</h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Transfer Summary Chip */}
              <div className="p-3.5 rounded-2xl bg-[#0f121a] border border-white/10 text-left space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Sending to</span>
                  <span className="text-white font-semibold">{recipientName}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Wallet ID</span>
                  <span className="font-mono text-slate-300">{walletEmail}</span>
                </div>
                <div className="pt-2 border-t border-white/[0.06] flex justify-between items-center">
                  <span className="text-xs text-slate-300 font-medium">Total Amount</span>
                  <span className="text-lg font-mono font-bold text-white">
                    ₹ {parseFloat(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 4-Digit PIN Boxes */}
              <form onSubmit={handleAuthorize} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Enter your 4-digit transaction PIN
                  </label>
                  <PinInput
                    ref={pinRef}
                    value={pin}
                    onChange={setPin}
                    autoFocus
                    disabled={isSending}
                  />
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/2 py-2.5 rounded-full bg-[#181d28] hover:bg-[#222a3a] border border-white/10 text-xs font-medium text-slate-300 hover:text-white cursor-pointer transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSending || pin.length !== 4}
                    className="w-1/2 py-2.5 rounded-full font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-[#1e2638] disabled:text-slate-500 disabled:shadow-none"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Paying...</span>
                      </>
                    ) : (
                      `Pay ₹${parseFloat(amount).toLocaleString("en-IN")}`
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

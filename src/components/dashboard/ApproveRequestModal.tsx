"use client";

import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, X, Check, AlertCircle, Loader2 } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { PinInput, type PinInputHandle } from "@/components/ui/PinInput";

interface ApproveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any | null;
  balance: number;
  onSuccess: () => Promise<void> | void;
}

export function ApproveRequestModal({
  isOpen,
  onClose,
  request,
  balance,
  onSuccess,
}: ApproveRequestModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const pinRef = useRef<PinInputHandle>(null);

  // Success state
  const [isSuccess, setIsSuccess] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [approvedRecipient, setApprovedRecipient] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError("");
      setIsApproving(false);
      setIsSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen || !request) return null;

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pin.length !== 4) {
      setError("Please enter your complete 4-digit PIN (4 digits required).");
      setPin("");
      pinRef.current?.focus(0);
      return;
    }

    if (request.amount > balance) {
      setError(`Insufficient wallet balance to approve payment. Required: ₹${request.amount.toLocaleString("en-IN")}, Available: ₹${balance.toLocaleString("en-IN")}.`);
      return;
    }

    setIsApproving(true);
    try {
      const res = await fetch(`/api/payment-requests/${request.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionPin: pin }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Approval failed. Incorrect PIN.");
        setPin("");
        pinRef.current?.focus(0);
        return;
      }

      await onSuccess();
      setApprovedAmount(request.amount);
      setApprovedRecipient(request.party);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to approve payment request");
      setPin("");
      pinRef.current?.focus(0);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className={`w-full ${isSuccess ? "max-w-[400px]" : "max-w-[420px]"} animate-in zoom-in-95`}>
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
                  Payment complete
                </h3>
                <p className="text-sm font-semibold text-slate-200 font-mono">
                  ₹ {approvedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} paid
                </p>
                <p className="text-xs text-slate-400 font-mono pt-1">
                  Sent to {approvedRecipient}
                </p>
                <p className="text-xs text-emerald-400 font-mono pt-1">
                  New balance: ₹ {balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
            /* PIN Authorization Form */
            <div className="w-full space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Authorize Payment</h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Amount & Beneficiary Summary */}
              <div className="p-3.5 rounded-xl bg-[#0f121a] border border-white/10 text-center space-y-1">
                <p className="text-xs text-slate-400 font-medium">Paying to {request.party}</p>
                <div className="text-2xl font-mono font-bold text-white">
                  ₹ {request.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                {request.message && (
                  <p className="text-[11px] text-slate-400 italic">
                    &ldquo;{request.message}&rdquo;
                  </p>
                )}
              </div>

              <form onSubmit={handleConfirmApprove} className="space-y-4">
                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300 block text-center">
                    Enter your 4-digit transaction PIN
                  </label>
                  <div className="flex justify-center">
                    <PinInput
                      ref={pinRef}
                      idPrefix="approve-pin"
                      value={pin}
                      onChange={setPin}
                      autoFocus
                      disabled={isApproving}
                    />
                  </div>
                </div>

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
                    disabled={isApproving || pin.length !== 4}
                    className="w-1/2 py-2.5 rounded-full font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-[#1e2638] disabled:text-slate-500 disabled:shadow-none"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Authorizing...</span>
                      </>
                    ) : (
                      "Confirm & Pay"
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

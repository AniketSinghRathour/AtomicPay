"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Check, AlertCircle, Info, Loader2 } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

interface AddMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onSuccess: () => Promise<void> | void;
}

export function AddMoneyModal({
  isOpen,
  onClose,
  balance,
  onSuccess,
}: AddMoneyModalProps) {
  const [topUpAmount, setTopUpAmount] = useState<number>(1000);
  const [customTopUp, setCustomTopUp] = useState<string>("1000");
  const [error, setError] = useState<string>("");
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [lastAddedAmount, setLastAddedAmount] = useState<number>(1000);

  useEffect(() => {
    if (isOpen) {
      setTopUpAmount(1000);
      setCustomTopUp("1000");
      setError("");
      setIsAdding(false);
      setIsSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmAddMoney = async () => {
    setError("");
    const amt = parseFloat(customTopUp) || topUpAmount;
    if (isNaN(amt) || amt <= 0) {
      setError("Please enter a valid top-up amount (minimum ₹1.00).");
      return;
    }

    if (amt > 10000000) {
      setError("Maximum top-up limit is ₹1,00,00,000 per transaction.");
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch("/api/wallet/add-money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(amt * 100), // convert to paise
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add money");
        return;
      }

      onSuccess();
      setLastAddedAmount(amt);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Error processing top-up");
    } finally {
      setIsAdding(false);
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
                  Money added
                </h3>
                <p className="text-sm font-semibold text-slate-200 font-mono">
                  ₹ {lastAddedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} added to your wallet
                </p>
                <p className="text-xs text-slate-400 font-mono pt-1">
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
            /* Input Form */
            <div className="w-full space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-slate-300" />
                  <h3 className="text-base font-bold text-white">Add money</h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Preset Chips */}
                <div className="grid grid-cols-4 gap-2">
                  {[500, 1000, 2500, 5000].map((amt) => {
                    const isSelected = topUpAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setTopUpAmount(amt);
                          setCustomTopUp(amt.toString());
                        }}
                        className={`py-2 px-1 text-center font-mono text-xs rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#252e3e] border-white/20 text-white font-bold shadow-sm"
                            : "bg-[#11141c] hover:bg-[#181d28] border-white/10 text-slate-300"
                        }`}
                      >
                        ₹ {amt.toLocaleString("en-IN")}
                      </button>
                    );
                  })}
                </div>

                {/* Divider */}
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.08]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-[#11141e] text-slate-400 font-normal">or</span>
                  </div>
                </div>

                {/* Enter Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Enter amount</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono text-slate-400 font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={customTopUp}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.replace(/[^0-9]/g, "").length > 10) return;
                        setCustomTopUp(val);
                        setTopUpAmount(parseFloat(val) || 0);
                      }}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#0f121a] border border-white/10 text-base font-mono font-bold text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      maxLength={10}
                    />
                  </div>
                </div>

                {/* Info Notice */}
                <div className="p-3 rounded-xl bg-[#0f121a] border border-white/10 text-xs text-slate-300 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-[11px] leading-relaxed">
                    <p className="font-semibold text-slate-200">Simulated top-up</p>
                    <p className="text-slate-400">Instantly minted from Central Bank via atomic double-entry ledger.</p>
                  </div>
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
                    type="button"
                    onClick={handleConfirmAddMoney}
                    disabled={isAdding || !customTopUp || parseFloat(customTopUp) <= 0}
                    className="w-1/2 py-2.5 rounded-full font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-[#1e2638] disabled:text-slate-500 disabled:shadow-none"
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      "Add money"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </SpotlightCard>
      </div>
    </div>
  );
}

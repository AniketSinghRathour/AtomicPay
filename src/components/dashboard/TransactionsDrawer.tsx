"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, X, FileText, Check, Wallet } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { formatTxnTime } from "@/lib/formatters";
import type { Transaction } from "@/types/transaction";

type FilterTab = "all" | "sent" | "received" | "requests" | "top-ups";

interface TransactionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  pendingRequests: any[];
  onSelectTransaction: (txn: Transaction) => void;
  onStartApproveRequest: (req: any) => void;
  onDeclineRequest: (requestId: string) => Promise<void> | void;
}

export function TransactionsDrawer({
  isOpen,
  onClose,
  transactions,
  pendingRequests,
  onSelectTransaction,
  onStartApproveRequest,
  onDeclineRequest,
}: TransactionsDrawerProps) {
  const [txnFilter, setTxnFilter] = useState<FilterTab>("all");

  // Lock background dashboard scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTransactions = transactions.filter((t) => {
    if (txnFilter === "sent") return t.amount < 0 && t.type !== "wallet";
    if (txnFilter === "received") return t.amount > 0 && t.type !== "wallet";
    if (txnFilter === "top-ups") {
      return (
        t.type === "wallet" ||
        t.subtext.toLowerCase().includes("add money") ||
        t.subtext.toLowerCase().includes("top-up")
      );
    }
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none overscroll-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl flex flex-col animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <SpotlightCard className="w-full">
          <div className="w-full space-y-4 flex flex-col">
            {/* Header: ← Transactions */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-white cursor-pointer p-1 -ml-1 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-white">Transactions</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white cursor-pointer p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
              {(["all", "sent", "received", "requests", "top-ups"] as const).map((tab) => {
                const isActive = txnFilter === tab;
                const label =
                  tab === "all"
                    ? "All"
                    : tab === "sent"
                    ? "Sent"
                    : tab === "received"
                    ? "Received"
                    : tab === "requests"
                    ? "Requests"
                    : "Top-ups";
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTxnFilter(tab)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer capitalize shrink-0 ${
                      isActive
                        ? "bg-[#252e3e] text-white border border-white/15 shadow-sm font-semibold"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Transactions Content - capped at ~7-8 items, scrolls internally */}
            <div className="overflow-y-auto overscroll-contain pr-1.5 max-h-[430px] custom-scrollbar">
              {txnFilter === "requests" ? (
                pendingRequests.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-2.5">
                    <div className="w-12 h-12 rounded-full bg-[#131926] border border-white/10 flex items-center justify-center text-slate-400 mb-1">
                      <FileText className="w-5 h-5 stroke-[1.8]" />
                    </div>
                    <h4 className="text-sm font-semibold text-white">No payment requests</h4>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Incoming or outgoing payment requests will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] rounded-xl transition-colors px-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-700 font-bold text-xs text-white flex items-center justify-center shadow-md shrink-0">
                            {req.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs sm:text-sm text-white flex items-center gap-2">
                              <span>{req.party}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 border border-white/5">
                                {req.isIncoming ? "Incoming" : "Outgoing"}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono truncate">
                              <span>{req.partyEmail}</span>
                              {req.message && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-slate-300 italic">&ldquo;{req.message}&rdquo;</span>
                                </>
                              )}
                              <span>&bull;</span>
                              <span>{formatTxnTime(req.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <div className="text-right">
                            <div className="font-mono font-bold text-xs sm:text-sm text-white">
                              ₹ {req.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                            <span
                              className={`text-[10px] font-mono font-medium ${
                                req.status === "PENDING"
                                  ? "text-amber-400"
                                  : req.status === "APPROVED"
                                  ? "text-emerald-400"
                                  : "text-rose-400"
                              }`}
                            >
                              ● {req.status === "PENDING" ? (req.isIncoming ? "Action Required" : "Pending") : req.status}
                            </span>
                          </div>

                          {req.status === "PENDING" && (
                            <div className="flex items-center gap-1.5">
                              {req.isIncoming ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onStartApproveRequest(req);
                                    }}
                                    className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3 stroke-[2.5]" />
                                    <span>Pay</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeclineRequest(req.id)}
                                    className="px-2 py-1 rounded-full bg-[#181d28] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-white/10 text-xs transition-all cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onDeclineRequest(req.id)}
                                  className="px-2.5 py-1 rounded-full bg-[#181d28] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-white/10 text-xs transition-all cursor-pointer"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : filteredTransactions.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-full bg-[#131926] border border-white/10 flex items-center justify-center text-slate-400 mb-1">
                    <FileText className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">No transactions yet</h4>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Your transactions will appear here once you start using your wallet.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {filteredTransactions.map((txn) => (
                    <div
                      key={txn.id}
                      onClick={() => onSelectTransaction(txn)}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] rounded-xl transition-colors cursor-pointer px-2"
                    >
                      <div className="flex items-center gap-3">
                        {txn.type === "wallet" ? (
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                            <Wallet className="w-4 h-4" />
                          </div>
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full ${
                              txn.avatarBg || "bg-slate-700"
                            } ${txn.avatarText || "text-white"} font-bold text-xs flex items-center justify-center shadow-md shrink-0`}
                          >
                            {txn.initials}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-xs sm:text-sm text-white">{txn.party}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            <span>{txn.subtext}</span>
                            <span>&bull;</span>
                            <span>{txn.time}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-xs sm:text-sm">
                          {txn.amount > 0 ? (
                            <span className="text-emerald-400">
                              + ₹{txn.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-white">
                              - ₹{Math.abs(txn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-mono font-medium ${
                            txn.status === "Committed" ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          ● {txn.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}

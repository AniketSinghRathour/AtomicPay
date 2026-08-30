"use client";

import React from "react";
import { X } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import type { Transaction } from "@/types/transaction";

interface TransactionDetailsModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function TransactionDetailsModal({
  transaction,
  onClose,
}: TransactionDetailsModalProps) {
  if (!transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-[440px] animate-in zoom-in-95">
        <SpotlightCard>
          <div className="w-full space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="font-bold text-white text-base">Transaction Details</span>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white cursor-pointer p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center py-2 space-y-1">
              <div className="text-3xl font-mono font-bold text-white">
                {transaction.amount > 0
                  ? `+ ₹${transaction.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                  : `- ₹${Math.abs(transaction.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
              </div>
              <div className="pt-1">
                {transaction.status === "Committed" ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Committed</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Pending Approval</span>
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0f121a] border border-white/10 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID</span>
                <span className="font-semibold text-slate-200">{transaction.txnId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Counterparty</span>
                <span className="text-white">{transaction.party}</span>
              </div>
              {transaction.partyEmail && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Counterparty ID</span>
                  <span className="text-slate-300">{transaction.partyEmail}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp</span>
                <span className="text-slate-300">{transaction.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category</span>
                <span className="text-slate-300">{transaction.subtext}</span>
              </div>
              {transaction.note && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Note</span>
                  <span className="text-slate-200">{transaction.note}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-white/[0.04]">
                <span className="text-slate-400">Platform fee</span>
                <span className="text-emerald-400 font-bold">₹0.00</span>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-full bg-[#202736] hover:bg-[#2c364b] border border-white/10 text-xs font-medium text-white transition-all active:scale-[0.98] cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}

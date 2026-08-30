"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Send, 
  FileText, 
  Plus, 
  Receipt, 
  ChevronRight, 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  Wallet, 
  Wifi 
} from "lucide-react";
import useSWR from "swr";
import { useSession } from "@/lib/auth-client";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { formatTxnTime } from "@/lib/formatters";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";
import type { Transaction } from "@/types/transaction";
import {
  SendMoneyModal,
  PinModal,
  AddMoneyModal,
  RequestMoneyModal,
  ApproveRequestModal,
  TransactionsDrawer,
  TransactionDetailsModal,
} from "@/components/dashboard";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";

  // Real DB Data via SWR (auto refreshes every 5s)
  const { data: walletData, mutate: mutateWallet } = useSWR(
    "/api/wallet",
    fetcher,
    { refreshInterval: 5000, revalidateOnFocus: true }
  );

  // User PIN status from DB
  const { data: pinData, mutate: mutatePin } = useSWR<{ hasPin: boolean }>(
    "/api/user/pin",
    fetcher,
    { revalidateOnFocus: true }
  );
  const hasPin = Boolean(pinData?.hasPin);

  // Real-time SSE listener for instant payment requests and transfers
  useRealtimeUpdates({
    url: "/api/sse",
    enabled: Boolean(session?.user?.id),
    onUpdate: () => {
      mutateWallet();
      mutatePin();
    },
  });

  // Derived balance and real transactions from DB
  const balance: number = walletData?.wallet?.balance ?? 0;
  const rawTransfers: any[] = useMemo(() => {
    const list: any[] = walletData?.recentTransfers ?? [];
    const seen = new Set<string>();
    return list.filter((t) => {
      if (!t?.id || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }, [walletData?.recentTransfers]);

  const transactions: Transaction[] = rawTransfers.map((t) => ({
    id: t.id,
    type: t.type === "wallet" ? "wallet" : "user",
    initials: t.initials || "AP",
    avatarBg: t.type === "wallet" ? "bg-blue-600" : "bg-slate-700",
    avatarText: "text-white",
    party: t.party || "AtomicPay User",
    partyEmail: t.partyEmail || "",
    subtext: t.subtext || (t.amount > 0 ? "Payment received" : "Payment sent"),
    time: formatTxnTime(t.createdAt),
    amount: t.amount,
    rawAmount: t.rawAmount,
    status: t.status || "Committed",
    txnId: t.txnId || `TXN-${t.id.slice(0, 8).toUpperCase()}`,
    note: t.description || "",
    fromWalletId: t.fromWalletId,
    toWalletId: t.toWalletId,
  }));

  // Modals state
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInitialError, setPinInitialError] = useState("");
  const [pendingActionAfterPin, setPendingActionAfterPin] = useState<"send" | { type: "approve"; req: any } | null>(null);

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [addMoneyModalOpen, setAddMoneyModalOpen] = useState(false);
  const [viewTxnModalOpen, setViewTxnModalOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const [requestToApprove, setRequestToApprove] = useState<any | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);

  // Payment Requests from DB
  const rawPendingRequests: any[] = useMemo(() => {
    const list: any[] = walletData?.pendingRequests ?? [];
    const seen = new Set<string>();
    return list.filter((r) => {
      if (!r?.id || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [walletData?.pendingRequests]);

  const incomingRequests = rawPendingRequests.filter((r) => r.isIncoming && r.status === "PENDING");
  const outgoingRequests = rawPendingRequests.filter((r) => !r.isIncoming && r.status === "PENDING");

  // URL query parameter routing for action buttons
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    if (action === "send") setSendModalOpen(true);
    else if (action === "request") setRequestModalOpen(true);
    else if (action === "add-money") setAddMoneyModalOpen(true);
    else if (action === "history") setViewTxnModalOpen(true);
  }, []);

  // Set / Update PIN handler
  const handleOpenPinModal = () => {
    setPinInitialError("");
    setPendingActionAfterPin(null);
    setPinModalOpen(true);
  };

  const handlePinSuccess = async () => {
    await mutatePin();
    if (pendingActionAfterPin === "send") {
      setPendingActionAfterPin(null);
      setSendModalOpen(true);
    } else if (pendingActionAfterPin && typeof pendingActionAfterPin === "object" && pendingActionAfterPin.type === "approve") {
      const req = pendingActionAfterPin.req;
      setPendingActionAfterPin(null);
      setRequestToApprove(req);
      setApproveModalOpen(true);
    }
  };

  // Start approving an incoming payment request (requires PIN)
  const handleStartApproveRequest = (req: any) => {
    if (!hasPin) {
      setPinInitialError("Please set your 4-digit transaction PIN first before approving payments.");
      setPendingActionAfterPin({ type: "approve", req });
      setPinModalOpen(true);
      return;
    }
    setRequestToApprove(req);
    setApproveModalOpen(true);
  };

  // Decline an incoming or cancel an outgoing payment request
  const handleDeclinePaymentRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/payment-requests/${requestId}/decline`, {
        method: "POST",
      });
      if (res.ok) {
        await mutateWallet();
      }
    } catch (err) {
      console.error("Decline request error:", err);
    }
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* ── 1. GREETING / HEADER SECTION (With Set/Update PIN Button on Far Right) ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Welcome, {userName.split(" ")[0]}</span>
            <span className="inline-block animate-wave text-3xl">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {balance > 0 ? "Here is an overview of your wallet and transactions." : "Your wallet is ready. Add money to get started."}
          </p>
        </div>

        {/* Set / Update PIN Button */}
        <button
          type="button"
          onClick={handleOpenPinModal}
          aria-label={hasPin ? "Update PIN" : "Set PIN"}
          title={hasPin ? "Update PIN" : "Set PIN"}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 p-2 sm:px-3.5 sm:py-2 rounded-full bg-[#181d28] hover:bg-[#222a3a] border border-white/10 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-slate-300 shrink-0" />
          <span className="hidden sm:inline">{hasPin ? "Update PIN" : "Set PIN"}</span>
        </button>
      </div>

      {/* ── 2. TOP ROW: WALLET BALANCE (40% ON MD+) + 4 ACTION CARDS (60% ON MD+) ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 lg:gap-5 items-stretch">
        
        {/* Wallet Balance Card */}
        <SpotlightCard className="col-span-1 md:col-span-2">
          {/* Card Top Row: Gold EMV Chip, Contactless Wave, Wallet Label, Subtle Simulated tag */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-6 rounded-[4px] relative overflow-hidden flex items-center justify-center shrink-0 shadow-sm"
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
                  border: "1px solid rgba(180, 83, 9, 0.65)",
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.25)",
                }}
              >
                <div className="w-full h-full relative opacity-60">
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-amber-950/70 -translate-y-1/2" />
                  <div className="absolute top-0 bottom-0 left-1/3 w-[1px] bg-amber-950/70" />
                  <div className="absolute top-0 bottom-0 right-1/3 w-[1px] bg-amber-950/70" />
                </div>
              </div>

              <div className="text-white/60 rotate-90 scale-75">
                <Wifi className="w-4 h-4" />
              </div>

              <span className="text-xs font-medium text-slate-300 ml-0.5">Wallet balance</span>
            </div>

            <span className="text-[10px] font-mono text-slate-400/80 uppercase tracking-wider select-none">
              Simulated
            </span>
          </div>

          {/* Card Mid Row: Large Real Balance & Subtext */}
          <div className="py-2.5 sm:py-3 space-y-1">
            <div className="text-2xl sm:text-3xl lg:text-[34px] font-bold font-mono tracking-tight text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
              ₹ {balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            <div className="text-xs text-slate-400">
              {balance <= 0 ? (
                <div className="space-y-0.5">
                  <p className="text-slate-300 font-medium text-xs">No funds yet</p>
                  <p className="text-[11px] text-slate-400/80">Add money to make your first transfer.</p>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-xs font-semibold">
                  <span>Available balance</span>
                </div>
              )}
            </div>
          </div>

          {/* Card Bottom Row: User / Wallet ID (Email) */}
          <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs gap-2">
            <span className="text-slate-400 font-medium shrink-0">
              Wallet ID
            </span>
            <span className="text-slate-200 font-medium truncate text-right">
              {userEmail}
            </span>
          </div>
        </SpotlightCard>

        {/* 4 Quick Action Cards */}
        <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 items-stretch">
          
          {/* Action 1: Send Money */}
          <SpotlightCard
            onClick={() => setSendModalOpen(true)}
            isInteractive
            className="h-full"
          >
            <div className="flex flex-col items-center justify-center text-center py-1 sm:py-2 h-full">
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-white shrink-0 transition-all duration-300 group-hover:scale-110 mb-2 sm:mb-2.5 shadow-sm"
                style={{
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
                }}
              >
                <Send className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-white/90 stroke-[2]" />
              </div>
              <span className="hidden sm:inline lg:hidden xl:inline text-xs sm:text-[13px] font-semibold text-white tracking-tight leading-tight">
                Send money
              </span>
              <span className="sm:hidden lg:inline xl:hidden text-xs sm:text-[13px] font-semibold text-white tracking-tight leading-tight">
                Send
              </span>
            </div>
          </SpotlightCard>

          {/* Action 2: Request Money */}
          <SpotlightCard
            onClick={() => setRequestModalOpen(true)}
            isInteractive
            className="h-full"
          >
            <div className="flex flex-col items-center justify-center text-center py-1 sm:py-2 h-full">
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-white shrink-0 transition-all duration-300 group-hover:scale-110 mb-2 sm:mb-2.5 shadow-sm"
                style={{
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
                }}
              >
                <FileText className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-white/90 stroke-[2]" />
              </div>
              <span className="hidden sm:inline lg:hidden xl:inline text-xs sm:text-[13px] font-semibold text-white tracking-tight leading-tight">
                Request money
              </span>
              <span className="sm:hidden lg:inline xl:hidden text-xs sm:text-[13px] font-semibold text-white tracking-tight leading-tight">
                Request
              </span>
            </div>
          </SpotlightCard>

          {/* Action 3: Add Money */}
          <SpotlightCard
            onClick={() => setAddMoneyModalOpen(true)}
            isInteractive
            className="h-full"
          >
            <div className="flex flex-col items-center justify-center text-center py-1 sm:py-2 h-full">
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-white shrink-0 transition-all duration-300 group-hover:scale-110 mb-2 sm:mb-2.5 shadow-sm"
                style={{
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
                }}
              >
                <Plus className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-white/90 stroke-[2.2]" />
              </div>
              <span className="text-xs sm:text-[13px] font-semibold text-white tracking-tight leading-tight">
                Add money
              </span>
            </div>
          </SpotlightCard>

          {/* Action 4: View Transactions */}
          <SpotlightCard
            onClick={() => setViewTxnModalOpen(true)}
            isInteractive
            className="h-full"
          >
            <div className="flex flex-col items-center justify-center text-center py-1 sm:py-2 h-full">
              <div
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-white shrink-0 transition-all duration-300 group-hover:scale-110 mb-2 sm:mb-2.5 shadow-sm"
                style={{
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
                }}
              >
                <Receipt className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-white/90 stroke-[2]" />
              </div>
              <span className="hidden sm:inline lg:hidden xl:inline text-xs sm:text-[13px] font-semibold text-white tracking-tight leading-tight">
                View transactions
              </span>
              <span className="sm:hidden lg:inline xl:hidden text-xs sm:text-[13px] font-semibold text-white tracking-tight leading-tight">
                Transactions
              </span>
            </div>
          </SpotlightCard>

        </div>

      </div>

      {/* ── 2.5. PAYMENT REQUESTS SECTION (Live DB Requests) ── */}
      {(incomingRequests.length > 0 || outgoingRequests.length > 0) && (
        <SpotlightCard className="w-full">
          <div className="space-y-4 w-full">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-sky-400" />
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Payment Requests
                </h2>
                {incomingRequests.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {incomingRequests.length} to approve
                  </span>
                )}
              </div>
            </div>

            {/* Incoming Requests to Pay */}
            {incomingRequests.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Incoming requests
                </p>
                <div className="divide-y divide-white/[0.04] bg-[#0c1018] rounded-2xl border border-white/[0.06] overflow-hidden">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-700 font-bold text-xs text-white flex items-center justify-center shrink-0 shadow-md">
                          {req.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-white truncate">
                            {req.party}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                            <span>{req.partyEmail}</span>
                            {req.message && (
                              <>
                                <span>&bull;</span>
                                <span className="text-slate-300 italic">&ldquo;{req.message}&rdquo;</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.04]">
                        <div className="text-right">
                          <div className="font-mono font-bold text-base text-white">
                            ₹ {req.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                          <span className="text-[10px] font-mono text-amber-400">
                            ● Action Required
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartApproveRequest(req)}
                            className="px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Approve &amp; Pay</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeclinePaymentRequest(req.id)}
                            className="px-3 py-1.5 rounded-full bg-[#181d28] hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 font-medium text-xs transition-all active:scale-95 cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Outgoing Requests Sent by User */}
            {outgoingRequests.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Requests you sent
                </p>
                <div className="divide-y divide-white/[0.04] bg-[#0c1018] rounded-2xl border border-white/[0.06] overflow-hidden">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-sky-900/60 border border-sky-500/30 text-sky-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {req.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs sm:text-sm text-white truncate">
                            Requested from {req.party}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {req.partyEmail} {req.message ? `• "${req.message}"` : ""}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="font-mono font-bold text-xs sm:text-sm text-white">
                            ₹ {req.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                          <span className="text-[10px] font-mono text-amber-400">
                            ● Pending
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeclinePaymentRequest(req.id)}
                          className="px-2.5 py-1 rounded-full bg-[#181d28] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-white/10 text-[11px] transition-all cursor-pointer"
                          title="Cancel request"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SpotlightCard>
      )}

      {/* ── 3. RECENT ACTIVITY CARD (Live DB Ledger) ── */}
      <SpotlightCard className="w-full">
        <div className="space-y-4 w-full">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Recent Activity
              </h2>
            </div>
            {transactions.length > 0 && (
              <button
                type="button"
                onClick={() => setViewTxnModalOpen(true)}
                className="text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer group"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>

          {/* If Transactions Empty */}
          {transactions.length === 0 ? (
            <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#131926] border border-white/10 flex items-center justify-center text-slate-400 mb-1">
                <FileText className="w-5 h-5 stroke-[1.8]" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-white">
                No transactions yet
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-400 max-w-sm">
                Add money to your wallet, or request money from someone to get started.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setAddMoneyModalOpen(true)}
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-black text-xs sm:text-sm font-semibold px-6 py-2.5 rounded-full transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <span>Add money</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          ) : (
          /* Populated state with REAL DB transactions */
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-medium text-slate-400 border-b border-white/[0.04]">
                    <th className="py-2.5 px-4">Transaction</th>
                    <th className="py-2.5 px-4">Time</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Txn ID</th>
                    <th className="py-2.5 px-2 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {transactions.slice(0, 5).map((txn) => (
                    <tr
                      key={txn.id}
                      onClick={() => setSelectedTxn(txn)}
                      className="hover:bg-white/[0.025] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {txn.type === "wallet" ? (
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                              <Wallet className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className={`w-8 h-8 rounded-full ${txn.avatarBg || "bg-slate-700"} ${txn.avatarText || "text-white"} font-bold text-xs flex items-center justify-center shadow-md shrink-0`}>
                              {txn.initials}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-sm text-white group-hover:text-sky-300 transition-colors">
                              {txn.party}
                            </div>
                            <div className="text-xs text-slate-400">
                              {txn.subtext}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                        {txn.time}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-sm whitespace-nowrap">
                        {txn.amount > 0 ? (
                          <span className="text-emerald-400">+ ₹{txn.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-white">- ₹{Math.abs(txn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {txn.status === "Committed" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Committed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                        {txn.txnId}
                      </td>

                      <td className="py-3 px-2 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List View */}
            <div className="md:hidden divide-y divide-white/[0.04]">
              {transactions.slice(0, 5).map((txn) => (
                <div
                  key={txn.id}
                  onClick={() => setSelectedTxn(txn)}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] rounded-xl transition-colors cursor-pointer px-1"
                >
                  <div className="flex items-center gap-3">
                    {txn.type === "wallet" ? (
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                        <Wallet className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className={`w-9 h-9 rounded-full ${txn.avatarBg || "bg-slate-700"} ${txn.avatarText || "text-white"} font-bold text-xs flex items-center justify-center shadow-md shrink-0`}>
                        {txn.initials}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-sm text-white">{txn.party}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <span>{txn.subtext}</span>
                        <span>&bull;</span>
                        <span className="font-mono text-[11px]">{txn.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm">
                        {txn.amount > 0 ? (
                          <span className="text-emerald-400">+ ₹{txn.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-white">- ₹{Math.abs(txn.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        )}
                      </div>
                      <div>
                        {txn.status === "Committed" ? (
                          <span className="text-[11px] font-medium text-emerald-400">● Committed</span>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-400">● Pending</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </SpotlightCard>

      {/* ── 4. MODALS (Clean Extracted Component Architecture) ── */}
      <SendMoneyModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        balance={balance}
        hasPin={hasPin}
        onNeedPin={() => {
          setSendModalOpen(false);
          setPinInitialError("Please set your 4-digit transaction PIN first before transferring funds.");
          setPendingActionAfterPin("send");
          setPinModalOpen(true);
        }}
        onSuccess={mutateWallet}
      />

      <PinModal
        isOpen={pinModalOpen}
        onClose={() => {
          setPinModalOpen(false);
          setPendingActionAfterPin(null);
          setPinInitialError("");
        }}
        hasPin={hasPin}
        initialError={pinInitialError}
        onSuccess={handlePinSuccess}
      />

      <AddMoneyModal
        isOpen={addMoneyModalOpen}
        onClose={() => setAddMoneyModalOpen(false)}
        balance={balance}
        onSuccess={mutateWallet}
      />

      <RequestMoneyModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={mutateWallet}
      />

      <ApproveRequestModal
        isOpen={approveModalOpen}
        onClose={() => {
          setApproveModalOpen(false);
          setRequestToApprove(null);
        }}
        request={requestToApprove}
        balance={balance}
        onSuccess={mutateWallet}
      />

      <TransactionsDrawer
        isOpen={viewTxnModalOpen}
        onClose={() => setViewTxnModalOpen(false)}
        transactions={transactions}
        pendingRequests={rawPendingRequests}
        onSelectTransaction={(txn) => setSelectedTxn(txn)}
        onStartApproveRequest={handleStartApproveRequest}
        onDeclineRequest={handleDeclinePaymentRequest}
      />

      <TransactionDetailsModal
        transaction={selectedTxn}
        onClose={() => setSelectedTxn(null)}
      />

    </div>
  );
}

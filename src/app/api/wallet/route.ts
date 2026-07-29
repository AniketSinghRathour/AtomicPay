import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { wallets, transfers, paymentRequests, users } from "@/db/schema";
import { eq, or, desc, inArray } from "drizzle-orm";

const SYSTEM_BANK_WALLET_ID = "00000000-0000-4000-8000-000000000000";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [userWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, session.user.id));

    if (!userWallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    // Fetch recent transfers
    const recentTransfers = await db
      .select({
        id: transfers.id,
        amount: transfers.amount,
        description: transfers.description,
        status: transfers.status,
        createdAt: transfers.createdAt,
        fromWalletId: transfers.fromWalletId,
        toWalletId: transfers.toWalletId,
      })
      .from(transfers)
      .where(
        or(
          eq(transfers.fromWalletId, userWallet.id),
          eq(transfers.toWalletId, userWallet.id)
        )
      )
      .orderBy(desc(transfers.createdAt))
      .limit(10);

    // Pending payment requests
    const pendingRequests = await db
      .select()
      .from(paymentRequests)
      .where(
        or(
          eq(paymentRequests.fromWalletId, userWallet.id),
          eq(paymentRequests.toWalletId, userWallet.id)
        )
      )
      .orderBy(desc(paymentRequests.createdAt));

    const counterpartyWalletIds = Array.from(
      new Set([
        ...recentTransfers.map((t) =>
          t.fromWalletId === userWallet.id ? t.toWalletId : t.fromWalletId
        ),
        ...pendingRequests.map((r) =>
          r.fromWalletId === userWallet.id ? r.toWalletId : r.fromWalletId
        ),
      ])
    ).filter((id) => id !== SYSTEM_BANK_WALLET_ID);

    const counterpartyMap = new Map<string, { name: string; email: string }>();
    if (counterpartyWalletIds.length > 0) {
      const counterparties = await db
        .select({
          walletId: wallets.id,
          name: users.name,
          email: users.email,
        })
        .from(wallets)
        .innerJoin(users, eq(wallets.userId, users.id))
        .where(inArray(wallets.id, counterpartyWalletIds));

      counterparties.forEach((c) =>
        counterpartyMap.set(c.walletId, { name: c.name, email: c.email })
      );
    }

    const formattedTransfers = recentTransfers.map((t) => {
      const isSent = t.fromWalletId === userWallet.id;
      const counterpartyWalletId = isSent ? t.toWalletId : t.fromWalletId;
      const isBankTopUp = counterpartyWalletId === SYSTEM_BANK_WALLET_ID;
      const counterparty = isBankTopUp
        ? { name: "Central Bank", email: "bank@atomicpay.local" }
        : counterpartyMap.get(counterpartyWalletId);

      const party = isBankTopUp
        ? "Wallet top-up"
        : counterparty?.name || "AtomicPay User";
      const subtext = isBankTopUp
        ? "Add money"
        : isSent
        ? "Payment sent"
        : "Payment received";

      const initials = party
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "AP";

      const numericAmount = Number(t.amount) / 100;
      const signedAmount = isSent && !isBankTopUp ? -numericAmount : numericAmount;

      return {
        id: t.id,
        amount: signedAmount,
        rawAmount: numericAmount,
        description: t.description || "",
        status: t.status === "COMPLETED" ? "Committed" : "Pending",
        createdAt: t.createdAt,
        type: isBankTopUp ? "wallet" : "user",
        transferType: isSent ? "SENT" : "RECEIVED",
        party,
        partyEmail: counterparty?.email || "",
        subtext,
        initials,
        txnId: `TXN-${t.id.slice(0, 8).toUpperCase()}`,
        fromWalletId: t.fromWalletId,
        toWalletId: t.toWalletId,
      };
    });

    const formattedPendingRequests = pendingRequests.map((r) => {
      const isIncoming = r.toWalletId === userWallet.id;
      const counterpartyWalletId = isIncoming ? r.fromWalletId : r.toWalletId;
      const counterparty = counterpartyMap.get(counterpartyWalletId);
      const party = counterparty?.name || (isIncoming ? "AtomicPay User" : "Recipient");
      const partyEmail = counterparty?.email || "";
      const initials = party
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "AP";

      return {
        id: r.id,
        isIncoming,
        fromWalletId: r.fromWalletId,
        toWalletId: r.toWalletId,
        amount: Number(r.amount) / 100,
        rawAmount: r.amount.toString(),
        message: r.message || "",
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        party,
        partyEmail,
        initials,
      };
    });

    return NextResponse.json({
      wallet: {
        id: userWallet.id,
        balance: Number(userWallet.balance) / 100,
      },
      recentTransfers: formattedTransfers,
      pendingRequests: formattedPendingRequests,
    });
  } catch (error: any) {
    console.error("Wallet Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

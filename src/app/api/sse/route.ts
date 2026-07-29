import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { wallets, transfers, paymentRequests } from "@/db/schema";
import { eq, or, gt, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events (SSE) stream for real-time wallet balance and transaction updates.
 * Provides sub-second notifications to authenticated clients.
 */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  const userId = session?.user?.id;

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [userWallet] = await db
    .select({ id: wallets.id })
    .from(wallets)
    .where(eq(wallets.userId, userId));

  if (!userWallet) {
    return new Response("Wallet not found", { status: 404 });
  }

  const userWalletId = userWallet.id;

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const MAX_LIFETIME_MS = 2 * 60 * 1000;
  let isClosed = false;

  const closeConnection = async () => {
    if (isClosed) return;
    isClosed = true;
    try {
      await writer.close();
    } catch {
      // Ignore writer close errors
    }
  };

  const timeoutId = setTimeout(() => {
    closeConnection();
  }, MAX_LIFETIME_MS);

  req.signal.addEventListener("abort", () => {
    clearTimeout(timeoutId);
    closeConnection();
  });

  const sendEvent = async (event: string, data: any) => {
    if (isClosed) return;
    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(payload));
    } catch {
      closeConnection();
    }
  };

  const POLLING_INTERVAL_MS = 2000;
  let lastCheckTime = new Date();
  lastCheckTime.setSeconds(lastCheckTime.getSeconds() - 1);

  (async () => {
    await sendEvent("connected", { time: new Date().toISOString() });

    while (!isClosed) {
      try {
        const checkTime = new Date();

        const recentTransfers = await db
          .select()
          .from(transfers)
          .where(
            and(
              gt(transfers.createdAt, lastCheckTime),
              or(
                eq(transfers.fromWalletId, userWalletId),
                eq(transfers.toWalletId, userWalletId)
              )
            )
          );

        if (recentTransfers.length > 0) {
          const formattedTransfers = recentTransfers.map((t) => ({
            ...t,
            amount: Number(t.amount) / 100,
            rawAmount: t.amount.toString(),
          }));
          await sendEvent("user_updates", {
            type: "transfers",
            transfers: formattedTransfers,
          });
        }

        const recentRequests = await db
          .select()
          .from(paymentRequests)
          .where(
            and(
              gt(paymentRequests.updatedAt, lastCheckTime),
              or(
                eq(paymentRequests.fromWalletId, userWalletId),
                eq(paymentRequests.toWalletId, userWalletId)
              )
            )
          );

        if (recentRequests.length > 0) {
          const formattedRequests = recentRequests.map((r) => ({
            ...r,
            amount: Number(r.amount) / 100,
            rawAmount: r.amount.toString(),
          }));
          await sendEvent("user_updates", {
            type: "payment_requests",
            requests: formattedRequests,
          });
        }

        lastCheckTime = checkTime;
      } catch (err) {
        console.error("SSE Polling Error", err);
      }

      if (isClosed) break;
      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
    }
  })();

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

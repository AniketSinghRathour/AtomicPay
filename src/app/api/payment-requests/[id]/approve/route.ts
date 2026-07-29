import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { transferFunds } from "@/services/transfer";
import { db } from "@/db";
import { users, wallets, paymentRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const approveSchema = z.object({
  transactionPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;

    const body = await req.json();
    const result = approveSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid request payload", details: result.error.format() }, { status: 400 });
    }

    const { transactionPin } = result.data;

    // Fetch payer user & wallet in a single join query (saves 1 network round-trip)
    const [payerData] = await db
      .select({
        userId: users.id,
        transactionPin: users.transactionPin,
        walletId: wallets.id,
      })
      .from(users)
      .innerJoin(wallets, eq(users.id, wallets.userId))
      .where(eq(users.id, session.user.id));

    if (!payerData) {
      return NextResponse.json({ error: "User or wallet not found" }, { status: 404 });
    }

    if (!payerData.transactionPin || payerData.transactionPin !== transactionPin) {
      return NextResponse.json({ error: "Invalid transaction PIN" }, { status: 403 });
    }

    const [request] = await db.select().from(paymentRequests).where(eq(paymentRequests.id, id));
    if (!request) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    if (request.status !== "PENDING") {
      return NextResponse.json({ error: `Payment request is already ${request.status.toLowerCase()}` }, { status: 400 });
    }

    if (payerData.walletId !== request.toWalletId) {
      return NextResponse.json({ error: "Unauthorized to approve this request" }, { status: 403 });
    }

    // Execute transfer
    const transferResult = await transferFunds({
      fromWalletId: request.toWalletId, // payer
      toWalletId: request.fromWalletId, // requester
      amount: request.amount,
      description: `Payment for request ${id}`,
      idempotencyKey: `approve-request-${id}`,
    });

    if (transferResult.success) {
      await db.update(paymentRequests)
        .set({ status: "APPROVED", transferId: transferResult.transferId, updatedAt: new Date() })
        .where(eq(paymentRequests.id, id));
      return NextResponse.json(transferResult, { status: 200 });
    }

    return NextResponse.json(
      { ...transferResult, error: transferResult.message || "Transfer failed" },
      { status: 400 }
    );

  } catch (error: any) {
    console.error("Approve Payment Request Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { transferSchema } from "@/lib/validations";
import { transferFunds } from "@/services/transfer";
import { db } from "@/db";
import { users, wallets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = transferSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid request payload", details: result.error.format() }, { status: 400 });
    }

    const { toWalletId, amount, description, idempotencyKey, transactionPin } = result.data;

    // Fetch sender user & wallet in a single join query (saves 1 network round-trip)
    const [senderData] = await db
      .select({
        userId: users.id,
        transactionPin: users.transactionPin,
        walletId: wallets.id,
      })
      .from(users)
      .innerJoin(wallets, eq(users.id, wallets.userId))
      .where(eq(users.id, session.user.id));
    
    if (!senderData) {
      return NextResponse.json({ error: "User or wallet not found" }, { status: 404 });
    }

    if (!senderData.transactionPin) {
      return NextResponse.json({ error: "Please set your 4-digit transaction PIN first" }, { status: 403 });
    }

    if (senderData.transactionPin !== transactionPin) {
      return NextResponse.json({ error: "Incorrect transaction PIN" }, { status: 403 });
    }

    const transferResult = await transferFunds({
      fromWalletId: senderData.walletId,
      toWalletId,
      amount: BigInt(amount),
      description,
      idempotencyKey,
    });

    return NextResponse.json(transferResult, { status: transferResult.success ? 200 : 400 });

  } catch (error: any) {
    console.error("Transfer Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

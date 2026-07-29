import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { wallets, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { transferFunds } from "@/services/transfer";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const addMoneySchema = z.object({
  amount: z.number().int().positive(),
  idempotencyKey: z.string().min(1),
});

const SYSTEM_BANK_WALLET_ID = "00000000-0000-4000-8000-000000000000";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = addMoneySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Ensure System Bank Wallet exists
    let [bankWallet] = await db.select().from(wallets).where(eq(wallets.id, SYSTEM_BANK_WALLET_ID));
    
    if (!bankWallet) {
      // Create a dummy system user and wallet
      const systemUserId = "system-user-id";
      await db.insert(users).values({
        id: systemUserId,
        email: "bank@atomicpay.local",
        name: "AtomicPay Bank",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing();

      await db.insert(wallets).values({
        id: SYSTEM_BANK_WALLET_ID,
        userId: systemUserId,
        balance: BigInt("100000000000"), // 1 billion paise
        label: "Central Bank",
      }).onConflictDoNothing();
      
      bankWallet = (await db.select().from(wallets).where(eq(wallets.id, SYSTEM_BANK_WALLET_ID)))[0];
    }

    const [userWallet] = await db.select().from(wallets).where(eq(wallets.userId, session.user.id));
    if (!userWallet) {
      return NextResponse.json({ error: "User wallet not found" }, { status: 404 });
    }

    // Transfer from bank to user
    const transferResult = await transferFunds({
      fromWalletId: SYSTEM_BANK_WALLET_ID,
      toWalletId: userWallet.id,
      amount: BigInt(result.data.amount),
      description: "Added funds from Bank",
      idempotencyKey: result.data.idempotencyKey,
    });

    return NextResponse.json(transferResult, { status: transferResult.success ? 200 : 400 });

  } catch (error: any) {
    console.error("Add Money Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { paymentRequestSchema } from "@/lib/validations";
import { db } from "@/db";
import { wallets, paymentRequests } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [userWallet] = await db.select().from(wallets).where(eq(wallets.userId, session.user.id));
    
    if (!userWallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    // Fetch requests where the user is either the requester or the payee
    const requests = await db.select().from(paymentRequests).where(
      or(
        eq(paymentRequests.fromWalletId, userWallet.id),
        eq(paymentRequests.toWalletId, userWallet.id)
      )
    );

    const formattedRequests = requests.map((r) => ({
      ...r,
      amount: Number(r.amount) / 100,
      rawAmount: r.amount.toString(),
    }));

    return NextResponse.json(formattedRequests);

  } catch (error: any) {
    console.error("Fetch Payment Requests Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = paymentRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid request payload", details: result.error.format() }, { status: 400 });
    }

    const { toWalletId, amount, message } = result.data;

    // Fetch requester wallet
    const [requesterWallet] = await db.select().from(wallets).where(eq(wallets.userId, session.user.id));

    if (!requesterWallet) {
      return NextResponse.json({ error: "Requester wallet not found" }, { status: 404 });
    }

    if (requesterWallet.id === toWalletId) {
      return NextResponse.json({ error: "Cannot request payment from yourself" }, { status: 400 });
    }

    const requestId = uuidv4();

    await db.insert(paymentRequests).values({
      id: requestId,
      fromWalletId: requesterWallet.id, // the one requesting money
      toWalletId, // the one who has to pay
      amount: BigInt(amount),
      message,
      status: "PENDING"
    });

    return NextResponse.json({ success: true, requestId }, { status: 200 });

  } catch (error: any) {
    console.error("Create Payment Request Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

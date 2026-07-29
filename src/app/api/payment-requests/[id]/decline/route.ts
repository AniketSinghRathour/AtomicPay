import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { wallets, paymentRequests } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    const [request] = await db.select().from(paymentRequests).where(eq(paymentRequests.id, id));
    if (!request) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    if (request.status !== "PENDING") {
      return NextResponse.json({ error: `Payment request is already ${request.status.toLowerCase()}` }, { status: 400 });
    }

    // Fetch user's wallet to ensure they own the toWalletId (the payer) or fromWalletId (the requester can also decline/cancel)
    const [userWallet] = await db.select().from(wallets).where(eq(wallets.userId, session.user.id));
    if (!userWallet || (userWallet.id !== request.toWalletId && userWallet.id !== request.fromWalletId)) {
      return NextResponse.json({ error: "Unauthorized to decline this request" }, { status: 403 });
    }

    await db.update(paymentRequests)
      .set({ status: "DECLINED", updatedAt: new Date() })
      .where(eq(paymentRequests.id, id));

    return NextResponse.json({ success: true, message: "Payment request declined" }, { status: 200 });

  } catch (error: any) {
    console.error("Decline Payment Request Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

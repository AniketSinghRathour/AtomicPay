import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, wallets } from "@/db/schema";
import { eq, or, ilike, and, ne, notIlike } from "drizzle-orm";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("email") || searchParams.get("q"))?.trim();

    if (!query) {
      return NextResponse.json(
        { valid: false, error: "Recipient or Payer details required" },
        { status: 400 }
      );
    }

    const mode = searchParams.get("mode");
    const isSelfEmail = query.toLowerCase() === session.user.email?.toLowerCase();
    const isSelfName = query.toLowerCase() === session.user.name?.toLowerCase();

    if (isSelfEmail || isSelfName) {
      return NextResponse.json(
        { 
          valid: false, 
          error: mode === "request" 
            ? "You cannot request money from yourself" 
            : "You cannot transfer to your own Wallet ID" 
        },
        { status: 400 }
      );
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);
    const isUuid = UUID_REGEX.test(query);

    if (!isEmail && !isUuid) {
      return NextResponse.json(
        {
          valid: false,
          error: "Please enter a valid registered email address",
        },
        { status: 400 }
      );
    }

    const matchCondition = isUuid
      ? eq(wallets.id, query)
      : ilike(users.email, query);

    const [target] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        walletId: wallets.id,
      })
      .from(users)
      .innerJoin(wallets, eq(users.id, wallets.userId))
      .where(
        and(
          ne(users.id, "system-user-id"),
          notIlike(users.email, "load%"),
          matchCondition
        )
      )
      .limit(1);

    if (!target) {
      return NextResponse.json(
        { valid: false, error: "No user found with this email address" },
        { status: 404 }
      );
    }

    // Check if matched user is the current user
    if (target.id === session.user.id) {
      return NextResponse.json(
        {
          valid: false,
          error: mode === "request"
            ? "You cannot request money from yourself"
            : "You cannot transfer to your own Wallet ID",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: target.id,
        name: target.name,
        email: target.email,
        walletId: target.walletId,
      },
    });
  } catch (error: any) {
    console.error("Wallet ID Lookup Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

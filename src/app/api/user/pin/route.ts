import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const pinSchema = z.object({
  oldPin: z.string().regex(/^\d{4}$/, "Current PIN must be exactly 4 digits").optional(),
  newPin: z.string().regex(/^\d{4}$/, "New PIN must be exactly 4 digits"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select({ transactionPin: users.transactionPin })
      .from(users)
      .where(eq(users.id, session.user.id));

    const hasPin = Boolean(
      user?.transactionPin && /^\d{4}$/.test(user.transactionPin)
    );

    return NextResponse.json({ hasPin });
  } catch (error: any) {
    console.error("Fetch PIN Status Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = pinSchema.safeParse(body);

    if (!result.success) {
      const errorMsg = result.error.issues[0]?.message || "PIN must be exactly 4 digits";
      return NextResponse.json(
        { error: errorMsg },
        { status: 400 }
      );
    }

    // Fetch existing user PIN from DB
    const [user] = await db
      .select({ transactionPin: users.transactionPin })
      .from(users)
      .where(eq(users.id, session.user.id));

    const hasExistingPin = Boolean(
      user?.transactionPin && /^\d{4}$/.test(user.transactionPin)
    );

    // If user already has a PIN, verify the oldPin
    if (hasExistingPin) {
      if (!result.data.oldPin) {
        return NextResponse.json(
          { error: "Please enter your current 4-digit PIN", field: "oldPin" },
          { status: 400 }
        );
      }

      if (user.transactionPin !== result.data.oldPin) {
        return NextResponse.json(
          { error: "Incorrect current PIN. Please check and try again.", field: "oldPin" },
          { status: 400 }
        );
      }

      if (result.data.newPin === result.data.oldPin) {
        return NextResponse.json(
          { error: "New PIN cannot be the same as your current PIN", field: "newPin" },
          { status: 400 }
        );
      }
    }

    await db
      .update(users)
      .set({ transactionPin: result.data.newPin })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true, hasPin: true });
  } catch (error: any) {
    console.error("Update PIN Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

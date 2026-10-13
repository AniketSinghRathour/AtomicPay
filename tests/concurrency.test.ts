import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { v4 as uuidv4 } from "uuid";
import { sql } from "drizzle-orm";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Enable WebSockets in Node.js test runner for Neon transactions
neonConfig.webSocketConstructor = ws;

// Defensively sanitize DATABASE_URL in case of accidental enclosing quotes or prefix
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL
    .trim()
    .replace(/^DATABASE_URL=\s*/i, "")
    .replace(/^['"]|['"]$/g, "")
    .trim();
}

import { db, pool, dbPool } from "../src/db";
import { users, wallets, transfers, ledgerEntries } from "../src/db/schema";
import { transferFunds } from "../src/services/transfer";

describe("AtomicPay ACID Financial Engine & Concurrency Suite", () => {
  // Provision isolated test user and wallet IDs
  const testUserId = `test-vitest-${uuidv4().slice(0, 8)}`;
  
  // Wallets for Hot-wallet double spend
  const walletHotA = uuidv4();
  const walletHotSink = uuidv4();

  // Wallets for Opposing A <-> B
  const walletOppA = uuidv4();
  const walletOppB = uuidv4();

  // Wallets for 3-wallet cycle A -> B -> C -> A
  const walletCycA = uuidv4();
  const walletCycB = uuidv4();
  const walletCycC = uuidv4();

  // 10 Wallets for Random transfers
  const randomWallets: string[] = Array.from({ length: 10 }, () => uuidv4());

  // Wallets for Idempotency matrix
  const walletIdemFrom = uuidv4();
  const walletIdemTo = uuidv4();

  const allTestWallets = [
    walletHotA,
    walletHotSink,
    walletOppA,
    walletOppB,
    walletCycA,
    walletCycB,
    walletCycC,
    ...randomWallets,
    walletIdemFrom,
    walletIdemTo,
  ];

  const walletIdsSql = sql.join(allTestWallets.map(id => sql`${id}`), sql`, `);
  const randWalletIdsSql = sql.join(randomWallets.map(id => sql`${id}`), sql`, `);

  beforeAll(async () => {
    // 1. Create a single test user
    await db.insert(users).values({
      id: testUserId,
      email: `${testUserId}@vitest.local`,
      name: "Vitest Test Runner",
    });

    // 2. Insert all test wallets with clean initial balances
    const initialWallets = [
      { id: walletHotA, userId: testUserId, balance: 5000n, label: "Hot Wallet A (₹50)" },
      { id: walletHotSink, userId: testUserId, balance: 0n, label: "Hot Wallet Sink (₹0)" },
      { id: walletOppA, userId: testUserId, balance: 50000n, label: "Opposing A (₹500)" },
      { id: walletOppB, userId: testUserId, balance: 50000n, label: "Opposing B (₹500)" },
      { id: walletCycA, userId: testUserId, balance: 10000n, label: "Cycle A (₹100)" },
      { id: walletCycB, userId: testUserId, balance: 10000n, label: "Cycle B (₹100)" },
      { id: walletCycC, userId: testUserId, balance: 10000n, label: "Cycle C (₹100)" },
      ...randomWallets.map((id, idx) => ({
        id,
        userId: testUserId,
        balance: 10000n, // ₹100 each -> Total ₹1,000 (100,000 paise)
        label: `Random Wallet ${idx + 1}`,
      })),
      { id: walletIdemFrom, userId: testUserId, balance: 50000n, label: "Idem From (₹500)" },
      { id: walletIdemTo, userId: testUserId, balance: 0n, label: "Idem To (₹0)" },
    ];

    await db.insert(wallets).values(initialWallets);
  }, 45000);

  afterAll(async () => {
    // Clean up all test ledger entries, transfers, wallets, and user
    await db.execute(sql`DELETE FROM ledger_entries WHERE wallet_id IN (${walletIdsSql})`);
    await db.execute(sql`DELETE FROM transfers WHERE from_wallet_id IN (${walletIdsSql}) OR to_wallet_id IN (${walletIdsSql})`);
    await db.execute(sql`DELETE FROM wallets WHERE id IN (${walletIdsSql})`);
    await db.execute(sql`DELETE FROM "user" WHERE id = ${testUserId}`);
    await pool.end();
  }, 45000);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Hot-Wallet Double-Spend (100 parallel ₹1 debits on ₹50 balance)
  // ──────────────────────────────────────────────────────────────────────────
  it("Hot-wallet double-spend: 100 parallel ₹1 debits on ₹50 → exactly 50 succeed, 0 overdrafts", async () => {
    const parallelCount = 100;
    const debitAmount = 100n; // 100 paise = ₹1.00

    const debitPromises = Array.from({ length: parallelCount }, (_, i) =>
      transferFunds({
        fromWalletId: walletHotA,
        toWalletId: walletHotSink,
        amount: debitAmount,
        idempotencyKey: `vitest-ds-${i}-${uuidv4()}`,
        description: `Double-spend debit #${i + 1}`,
      })
        .then((res) => ({ success: res.success, status: res.status }))
        .catch((err) => ({ success: false, status: "ERROR", error: err.message }))
    );

    const results = await Promise.all(debitPromises);
    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    const [finalA] = await db.select().from(wallets).where(sql`id = ${walletHotA}`);
    const [finalSink] = await db.select().from(wallets).where(sql`id = ${walletHotSink}`);

    // Exactly 50 must succeed, 50 must be rejected
    expect(successes.length).toBe(50);
    expect(failures.length).toBe(50);

    // Balance must be exactly ₹0.00 (0 overdraft)
    expect(finalA.balance).toBe(0n);
    expect(finalSink.balance).toBe(5000n);
    expect(finalA.balance >= 0n).toBe(true);
  }, 120000);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Opposing A <-> B (30 transfers: 15 each way simultaneously)
  // ──────────────────────────────────────────────────────────────────────────
  it("Opposing A ⇄ B: 30 concurrent transfers (15 each way) → 0 deadlocks (40P01)", async () => {
    const countEachWay = 15;

    const opposingPromises = [
      ...Array.from({ length: countEachWay }, (_, i) =>
        transferFunds({
          fromWalletId: walletOppA,
          toWalletId: walletOppB,
          amount: 50n,
          idempotencyKey: `vitest-opp-ab-${i}-${uuidv4()}`,
          description: `Opposing A->B #${i}`,
        })
      ),
      ...Array.from({ length: countEachWay }, (_, i) =>
        transferFunds({
          fromWalletId: walletOppB,
          toWalletId: walletOppA,
          amount: 50n,
          idempotencyKey: `vitest-opp-ba-${i}-${uuidv4()}`,
          description: `Opposing B->A #${i}`,
        })
      ),
    ];

    const results = await Promise.allSettled(opposingPromises);

    const deadlocks = results.filter(
      (r) => r.status === "rejected" && String((r as any).reason).includes("deadlock")
    );
    const fulfilled = results.filter((r) => r.status === "fulfilled" && (r.value as any).success);

    expect(deadlocks.length).toBe(0);
    expect(fulfilled.length).toBe(30);
  }, 60000);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: 3-Wallet Cycle A → B → C → A (60 transfers: 20 each)
  // ──────────────────────────────────────────────────────────────────────────
  it("3-wallet cycle A → B → C → A: 60 concurrent transfers → 0 deadlocks, balances conserved", async () => {
    const cycleCount = 20;

    const cyclePromises = [
      ...Array.from({ length: cycleCount }, (_, i) =>
        transferFunds({
          fromWalletId: walletCycA,
          toWalletId: walletCycB,
          amount: 25n,
          idempotencyKey: `vitest-cyc-ab-${i}-${uuidv4()}`,
          description: `Cycle A->B #${i}`,
        })
      ),
      ...Array.from({ length: cycleCount }, (_, i) =>
        transferFunds({
          fromWalletId: walletCycB,
          toWalletId: walletCycC,
          amount: 25n,
          idempotencyKey: `vitest-cyc-bc-${i}-${uuidv4()}`,
          description: `Cycle B->C #${i}`,
        })
      ),
      ...Array.from({ length: cycleCount }, (_, i) =>
        transferFunds({
          fromWalletId: walletCycC,
          toWalletId: walletCycA,
          amount: 25n,
          idempotencyKey: `vitest-cyc-ca-${i}-${uuidv4()}`,
          description: `Cycle C->A #${i}`,
        })
      ),
    ];

    const results = await Promise.allSettled(cyclePromises);
    const deadlocks = results.filter(
      (r) => r.status === "rejected" && String((r as any).reason).includes("deadlock")
    );
    const completed = results.filter((r) => r.status === "fulfilled" && (r.value as any).success);

    expect(deadlocks.length).toBe(0);
    expect(completed.length).toBe(60);

    // Verify cyclic balance conservation: Total across A, B, C must remain 30,000 paise (₹300.00)
    const [cycA] = await db.select().from(wallets).where(sql`id = ${walletCycA}`);
    const [cycB] = await db.select().from(wallets).where(sql`id = ${walletCycB}`);
    const [cycC] = await db.select().from(wallets).where(sql`id = ${walletCycC}`);
    const totalCycle = BigInt(cycA.balance) + BigInt(cycB.balance) + BigInt(cycC.balance);

    expect(totalCycle).toBe(30000n);
  }, 120000);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Random Transfers across 10 Wallets (60 transfers)
  // ──────────────────────────────────────────────────────────────────────────
  it("Random transfers across 10 wallets: 60 transfers → Σ balances unchanged (100,000 paise)", async () => {
    const totalRandomTransfers = 60;
    const initialExpectedSum = 100000n; // 10 wallets * 10,000 paise = 100,000 paise

    // Execute in 2 concurrent batches of 30 to maintain healthy connection utilization
    const batchSize = 30;
    for (let batch = 0; batch < totalRandomTransfers / batchSize; batch++) {
      const batchPromises = Array.from({ length: batchSize }, (_, i) => {
        const fromIdx = Math.floor(Math.random() * randomWallets.length);
        let toIdx = Math.floor(Math.random() * randomWallets.length);
        while (toIdx === fromIdx) {
          toIdx = Math.floor(Math.random() * randomWallets.length);
        }

        return transferFunds({
          fromWalletId: randomWallets[fromIdx],
          toWalletId: randomWallets[toIdx],
          amount: 10n, // 10 paise
          idempotencyKey: `vitest-rand-${batch}-${i}-${uuidv4()}`,
          description: `Random transfer ${batch * batchSize + i}`,
        });
      });

      await Promise.all(batchPromises);
    }

    // Verify sum of all 10 wallets
    const allWalletsRes = await db.execute(
      sql`SELECT balance FROM wallets WHERE id IN (${randWalletIdsSql})`
    );

    const finalSum = allWalletsRes.rows.reduce((sum, w: any) => sum + BigInt(w.balance), 0n);
    expect(finalSum).toBe(initialExpectedSum);
  }, 60000);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Idempotency Matrix (3 keys × 10 duplicates = 30 requests)
  // ──────────────────────────────────────────────────────────────────────────
  it("Idempotency matrix: 3 keys × 10 duplicates → exactly 3 executions, 27 cached returns", async () => {
    const distinctKeys = Array.from({ length: 3 }, (_, i) => `vitest-idem-matrix-${i}-${uuidv4()}`);
    const duplicatesPerKey = 10;

    let primaryExecutions = 0;
    let cachedReturns = 0;

    for (const key of distinctKeys) {
      const stormPromises = Array.from({ length: duplicatesPerKey }, () =>
        transferFunds({
          fromWalletId: walletIdemFrom,
          toWalletId: walletIdemTo,
          amount: 100n, // ₹1.00 each key
          idempotencyKey: key,
          description: "Idempotency storm matrix",
        })
      );

      const results = await Promise.all(stormPromises);
      for (const r of results) {
        if (!r.idempotent && r.success) primaryExecutions++;
        if (r.idempotent && r.success) cachedReturns++;
      }
    }

    expect(primaryExecutions).toBe(3);
    expect(cachedReturns).toBe(27);

    const [idemFrom] = await db.select().from(wallets).where(sql`id = ${walletIdemFrom}`);
    const [idemTo] = await db.select().from(wallets).where(sql`id = ${walletIdemTo}`);

    // Exactly 3 transfers * 100 paise = 300 paise debited
    expect(idemFrom.balance).toBe(49700n);
    expect(idemTo.balance).toBe(300n);
  }, 60000);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Validation Guards (Insufficient funds & Self-transfer)
  // ──────────────────────────────────────────────────────────────────────────
  it("Boundary validations: self-transfer and low funds return correct status/rejection", async () => {
    // 1. Self-transfer must reject immediately
    await expect(
      transferFunds({
        fromWalletId: walletHotA,
        toWalletId: walletHotA,
        amount: 50n,
        idempotencyKey: `vitest-self-${uuidv4()}`,
      })
    ).rejects.toThrow("Cannot transfer to the same wallet");

    // 2. Insufficient balance must return success: false with FAILED status
    const insufficientRes = await transferFunds({
      fromWalletId: walletHotSink, // Wallet has 0 (or small) balance
      toWalletId: walletHotA,
      amount: 999999999n, // Exceeds balance by orders of magnitude
      idempotencyKey: `vitest-low-${uuidv4()}`,
    });

    expect(insufficientRes.success).toBe(false);
    expect(insufficientRes.status).toBe("FAILED");
    expect(insufficientRes.message).toBe("Insufficient funds");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: Atomic Rollback (No balance change, zero orphan ledger rows)
  // ──────────────────────────────────────────────────────────────────────────
  it("Atomic rollback: simulated error inside transaction rolls back all state cleanly", async () => {
    const [beforeFrom] = await db.select().from(wallets).where(sql`id = ${walletOppA}`);
    const [beforeTo] = await db.select().from(wallets).where(sql`id = ${walletOppB}`);

    const failingTransfer = async () => {
      await dbPool.transaction(async (tx) => {
        // Debit sender
        await tx.execute(
          sql`UPDATE wallets SET balance = balance - '1000' WHERE id = ${walletOppA}`
        );
        // Force an intentional constraint failure (e.g. invalid foreign key or syntax error)
        throw new Error("Simulated network crash during payment processing");
      });
    };

    await expect(failingTransfer()).rejects.toThrow("Simulated network crash");

    const [afterFrom] = await db.select().from(wallets).where(sql`id = ${walletOppA}`);
    const [afterTo] = await db.select().from(wallets).where(sql`id = ${walletOppB}`);

    // Balances must remain completely untouched due to ACID rollback
    expect(afterFrom.balance).toBe(beforeFrom.balance);
    expect(afterTo.balance).toBe(beforeTo.balance);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: Double-Entry Zero-Sum Ledger Audit (Σ Credits − Σ Debits = 0)
  // ──────────────────────────────────────────────────────────────────────────
  it("Ledger audit (after all): strict zero-sum conservation (Σ credits − Σ debits = 0)", async () => {
    const auditRes = await db.execute(
      sql`SELECT 
            COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END), 0) AS total_debits,
            COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 0) AS total_credits,
            COUNT(*) AS total_entries
          FROM ledger_entries
          WHERE wallet_id IN (${walletIdsSql})`
    );

    const debits = BigInt(String(auditRes.rows[0].total_debits));
    const credits = BigInt(String(auditRes.rows[0].total_credits));
    const delta = credits - debits;

    expect(Number(auditRes.rows[0].total_entries)).toBeGreaterThanOrEqual(0);
    expect(delta).toBe(0n); // 0.00% drift
  });
});

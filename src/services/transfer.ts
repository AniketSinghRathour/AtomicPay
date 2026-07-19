import { sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { dbPool } from "../db";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TransferInput {
  fromWalletId: string;
  toWalletId: string;
  /** Amount in paise (integer). Must be > 0. */
  amount: bigint;
  /** Client-generated idempotency key — must be unique per logical request. */
  idempotencyKey: string;
  /** Optional user-facing description / note. */
  description?: string;
}

export interface TransferResult {
  success: boolean;
  transferId: string;
  status: "COMPLETED" | "FAILED";
  /** If this was a duplicate idempotency key, this is true. */
  idempotent: boolean;
  message: string;
}

// ─── Core Transfer Function ─────────────────────────────────────────────────

/**
 * transferFunds — the single most important function in this project.
 *
 * Executes an atomic, concurrency-safe fund transfer between two wallets
 * inside a single Postgres transaction under READ COMMITTED isolation.
 *
 * CORRECTNESS GUARANTEES:
 *
 * 1. FIXED LOCK ORDER (no deadlocks):
 *    Both wallet rows are locked via SELECT ... FOR UPDATE in a
 *    deterministic order — the wallet with the lexicographically smaller
 *    UUID is always locked first. This means if transaction T1 tries to
 *    transfer A→B and transaction T2 tries B→A concurrently, they both
 *    lock the same wallet first (whichever has the smaller ID), so they
 *    serialize instead of deadlocking.
 *
 * 2. NO DOUBLE-SPEND / NO NEGATIVE BALANCE:
 *    The sender's balance is checked AFTER acquiring the FOR UPDATE lock
 *    on their wallet row. While T1 holds that lock, T2 blocks on the
 *    SELECT ... FOR UPDATE. When T2 resumes (after T1 commits), it
 *    re-reads the now-updated balance and sees the deduction. Two
 *    concurrent requests can never both see the "old" balance and both
 *    succeed if doing so would push the balance negative.
 *
 * 3. IDEMPOTENCY (no duplicate application):
 *    Before processing, we INSERT the transfer row with the given
 *    idempotencyKey. The `idempotency_key` column has a UNIQUE constraint
 *    at the database level. We use INSERT ... ON CONFLICT DO NOTHING:
 *    - If 0 rows are inserted → key was already used → return the
 *      existing transfer's result, do NOT process again.
 *    - If 1 row is inserted → this is a new request → proceed.
 *    Even if two concurrent retries with the same key arrive at the same
 *    instant, only one can succeed the insert (Postgres guarantees the
 *    unique constraint under concurrency).
 *
 * 4. FULL ROLLBACK ON FAILURE:
 *    Everything happens inside a single `db.transaction(...)` call. If
 *    any step throws (lock acquisition, balance check logic error, a
 *    ledger write failure), Postgres rolls back the entire transaction.
 *    There is no possible state where a debit row exists without its
 *    corresponding credit, or where the cached balance is updated without
 *    ledger entries.
 */
export async function transferFunds(
  input: TransferInput
): Promise<TransferResult> {
  const { fromWalletId, toWalletId, amount, idempotencyKey, description } =
    input;

  // ── Input validation ────────────────────────────────────────────────────
  if (fromWalletId === toWalletId) {
    throw new Error("Cannot transfer to the same wallet");
  }
  if (amount <= BigInt(0)) {
    throw new Error("Transfer amount must be positive");
  }

  // ── Determine lock order ────────────────────────────────────────────────
  // Always lock the wallet with the lexicographically smaller UUID first.
  // This is the deadlock prevention mechanism.
  const [firstLockId, secondLockId] =
    fromWalletId < toWalletId
      ? [fromWalletId, toWalletId]
      : [toWalletId, fromWalletId];

  // ── Execute everything in a single transaction ──────────────────────────
  return await dbPool.transaction(
    async (tx) => {
      // STEP 1: Acquire row locks in fixed order via SELECT ... FOR UPDATE.
      // The second SELECT will block if another transaction already holds the lock on that row — this is the serialization point.
      const firstWalletResult = await tx.execute(
        sql`SELECT id, balance FROM wallets WHERE id = ${firstLockId} FOR UPDATE`
      );
      const firstWallet = firstWalletResult.rows[0];
      if (!firstWallet) {
        throw new Error(`Wallet ${firstLockId} not found`);
      }

      const secondWalletResult = await tx.execute(
        sql`SELECT id, balance FROM wallets WHERE id = ${secondLockId} FOR UPDATE`
      );
      const secondWallet = secondWalletResult.rows[0];
      if (!secondWallet) {
        throw new Error(`Wallet ${secondLockId} not found`);
      }

      // Now map back to sender/receiver from the locked rows.
      const senderBalance = BigInt(
        String(
          firstLockId === fromWalletId
            ? firstWallet.balance
            : secondWallet.balance
        )
      );
      const receiverBalance = BigInt(
        String(
          firstLockId === toWalletId
            ? firstWallet.balance
            : secondWallet.balance
        )
      );

      // STEP 2: Idempotency check via INSERT ... ON CONFLICT DO NOTHING.
      // The unique constraint on `idempotency_key` guarantees that even under concurrent retries, only one insert succeeds.
      const transferId = uuidv4();
      const insertResult = await tx.execute(
        sql`INSERT INTO transfers (id, from_wallet_id, to_wallet_id, amount, status, description, idempotency_key, created_at)
            VALUES (${transferId}, ${fromWalletId}, ${toWalletId}, ${amount.toString()}, 'COMPLETED', ${description ?? null}, ${idempotencyKey}, NOW())
            ON CONFLICT (idempotency_key) DO NOTHING
            RETURNING id`
      );

      // If 0 rows returned, this idempotency key was already used.
      // Return the existing transfer's result without reprocessing.
      if (insertResult.rows.length === 0) {
        const existingResult = await tx.execute(
          sql`SELECT id, status FROM transfers WHERE idempotency_key = ${idempotencyKey}`
        );
        const existing = existingResult.rows[0];
        return {
          success: existing.status === "COMPLETED",
          transferId: String(existing.id),
          status: existing.status as "COMPLETED" | "FAILED",
          idempotent: true,
          message: "Transfer already processed (idempotent return)",
        };
      }

      // STEP 3: Balance check INSIDE the transaction, AFTER locks are held.
      // This is what prevents double-spend: the second concurrent request blocks on the FOR UPDATE lock, then reads the already-deducted balance.
      if (senderBalance < amount) {
        // Insufficient funds — mark transfer as FAILED and commit.
        // We commit (not rollback) so the idempotency key is recorded: a retry of a failed transfer should also fail, not reprocess.
        await tx.execute(
          sql`UPDATE transfers SET status = 'FAILED' WHERE id = ${transferId}`
        );
        return {
          success: false,
          transferId,
          status: "FAILED",
          idempotent: false,
          message: "Insufficient funds",
        };
      }

      // STEP 4: Double-entry ledger writes.
      // Both entries are written in the same transaction as the lock
      // acquisition and balance update — if either write fails, everything rolls back (no partial debit without credit).
      const newSenderBalance = senderBalance - amount;
      const newReceiverBalance = receiverBalance + amount;

      // Debit entry against sender's wallet
      await tx.execute(
        sql`INSERT INTO ledger_entries (id, wallet_id, transfer_id, entry_type, amount, balance_after, description, created_at)
            VALUES (${uuidv4()}, ${fromWalletId}, ${transferId}, 'DEBIT', ${amount.toString()}, ${newSenderBalance.toString()}, ${description ?? null}, NOW())`
      );

      // Credit entry against receiver's wallet
      await tx.execute(
        sql`INSERT INTO ledger_entries (id, wallet_id, transfer_id, entry_type, amount, balance_after, description, created_at)
            VALUES (${uuidv4()}, ${toWalletId}, ${transferId}, 'CREDIT', ${amount.toString()}, ${newReceiverBalance.toString()}, ${description ?? null}, NOW())`
      );

      // STEP 5: Update cached wallet balances.
      // These updates happen inside the same transaction as the ledger writes, so the cached balance can never drift from the true ledger-derived balance.
      await tx.execute(
        sql`UPDATE wallets SET balance = ${newSenderBalance.toString()}, updated_at = NOW() WHERE id = ${fromWalletId}`
      );
      await tx.execute(
        sql`UPDATE wallets SET balance = ${newReceiverBalance.toString()}, updated_at = NOW() WHERE id = ${toWalletId}`
      );

      // STEP 6: Transaction commits automatically when this function returns
      // without throwing. If any step above threw, Postgres rolls back everything.
      return {
        success: true,
        transferId,
        status: "COMPLETED" as const,
        idempotent: false,
        message: "Transfer completed successfully",
      };
    },
    {
      // READ COMMITTED is the Postgres default. We state it explicitly here
      // for clarity and to make it obvious this is a deliberate design choice,
      // not an accident. Correctness comes from the explicit row locks (FOR UPDATE),
      // not from a higher isolation level.
      isolationLevel: "read committed",
    }
  );
}

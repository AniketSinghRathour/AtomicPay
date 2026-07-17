import { neon, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * Database connection for AtomicPay.
 *
 * We export TWO connection modes:
 *
 * 1. `db` — HTTP-based (neon() driver). Used for simple queries that don't
 *    need transactions. This is the default for most reads and is optimal
 *    for serverless/edge environments (no persistent connection).
 *
 * 2. `dbPool` / `getTransactionDb()` — WebSocket-based (Pool driver). Used
 *    for the `transferFunds` function and any operation that requires a real
 *    Postgres transaction with `BEGIN` / `COMMIT` / `ROLLBACK` and
 *    `SELECT ... FOR UPDATE`. The HTTP driver does NOT support interactive
 *    transactions — you must use the Pool driver for that.
 */

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
      "Copy .env.example to .env and fill in your Neon connection string."
  );
}

// --- HTTP driver (for simple queries, no transactions) ---
const sql = neon(databaseUrl);
export const db = drizzleHttp(sql, { schema });

// --- WebSocket Pool driver (for transactions with row locking) ---
const pool = new Pool({ connectionString: databaseUrl });
export const dbPool = drizzleWs(pool, { schema });

// Ensure BigInt can be serialized by JSON.stringify across all API routes
if (typeof (BigInt.prototype as any).toJSON === "undefined") {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

export { pool };

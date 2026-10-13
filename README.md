# AtomicPay 

<p align="left">
  <a href="https://github.com/AniketSinghRathour/AtomicPay/actions/workflows/ci.yml"><img src="https://github.com/AniketSinghRathour/AtomicPay/actions/workflows/ci.yml/badge.svg" alt="CI Concurrency & ACID Audit" /></a>
  <a href="https://atomic-pay-aniketsinghrathours-projects.vercel.app"><img src="https://img.shields.io/badge/Vercel-Deployed-brightgreen?style=flat&logo=vercel" alt="Vercel Deployment" /></a>
  <a href="#tech-stack--architectural-decisions"><img src="https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js" alt="Next.js 16" /></a>
  <a href="#concurrency-controls--acid-implementation"><img src="https://img.shields.io/badge/PostgreSQL-Neon-00E599?style=flat&logo=postgresql" alt="Neon PostgreSQL" /></a>
  <a href="#license"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License" /></a>
</p>

A production-grade, peer-to-peer internal digital wallet and double-entry ledger platform engineered with **Next.js**, **PostgreSQL**, **BetterAuth**, and **Drizzle ORM**.

AtomicPay is designed from the ground up to handle high-concurrency transactional challenges in payment systems: **race conditions**, **double-spending**, **cross-transfer deadlocks**, and **network-retry duplication**. Concurrency safety is enforced at the application-and-database boundary within a single atomic PostgreSQL transaction under `READ COMMITTED` isolation.

<p align="center">
  <img src="./public/images/readme/hero-preview.png" alt="AtomicPay Hero Section" width="100%" />
</p>

---

## System Architecture

<p align="center">
  <img src="./public/images/readme/system-architecture.svg" alt="AtomicPay System Architecture" width="100%" />
</p>

---

## Key Features

- **Atomic Concurrency Engine:** Explicit `READ COMMITTED` row-level locking with deterministic ordering to prevent deadlocks and double-spends under concurrent load.
- **4-Digit Transaction PIN:** Secondary authorization check required for P2P transfers and payment request approvals.
- **Peer Payment Requests:** Create payment requests by counterparty email, approve with PIN authorization, or decline in real time.
- **Central Bank Top-Up:** Currency minting simulated via double-entry ledger transfers from a system reserve wallet.
- **Real-Time SSE Updates:** Server-Sent Events stream (`/api/sse`) pushes balance and activity changes to connected clients with auto-reconnect.
- **Immutable Audit Trail:** Complete transaction receipts with unique IDs, timestamps, counterparty metadata, and ledger entries.
- **Session & Auth Management:** Authentication powered by Better Auth supporting credentials and Google OAuth.

---

## Concurrency Controls & ACID Implementation

AtomicPay manages transactional integrity using **five coordinated engineering mechanisms** inside a single PostgreSQL `READ COMMITTED` transaction. Below are the core implementations directly from [`src/services/transfer.ts`](src/services/transfer.ts).

### 1. Deterministic Lexicographical Lock Ordering (Deadlock Prevention)

When concurrent opposing transfers execute simultaneously (e.g., Transfer 1 moves `A ➔ B` while Transfer 2 moves `B ➔ A`), uncoordinated transactions risk circular wait conditions (deadlocks) where each transaction locks one row and waits for the other.

To prevent circular dependencies, AtomicPay sorts wallet UUIDs lexicographically before acquiring locks:

```typescript
// ── Determine lock order ────────────────────────────────────────────────
// Always lock the wallet with the lexicographically smaller UUID first.
// This is the deadlock prevention mechanism.
const [firstLockId, secondLockId] =
  fromWalletId < toWalletId
    ? [fromWalletId, toWalletId]
    : [toWalletId, fromWalletId];

// STEP 1: Acquire row locks in fixed order via SELECT ... FOR UPDATE.
// The second SELECT will block if another transaction already holds
// the lock on that row — this is the serialization point.
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
```

* **Deadlock Prevention Strategy:** Because every concurrent process requests row locks in the exact same lexicographical order (`min(UUID_A, UUID_B)` followed by `max(UUID_A, UUID_B)`), a circular wait condition cannot form. One transaction acquires the first lock, and the other waits in PostgreSQL's row-level lock queue until the first completes.

---

### 2. Post-Lock Balance Verification (Double-Spend Prevention)

Checking balances *before* acquiring exclusive locks allows race conditions where concurrent requests both observe the old balance. AtomicPay reads and evaluates wallet balances **strictly after** acquiring the `FOR UPDATE` lock:

```typescript
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

// STEP 3: Balance check INSIDE the transaction, AFTER locks are held.
// This is what prevents double-spend: the second concurrent request
// blocks on the FOR UPDATE lock, then reads the already-deducted balance.
if (senderBalance < amount) {
  // Insufficient funds — mark transfer as FAILED and commit.
  // We commit (not rollback) so the idempotency key is recorded:
  // a retry of a failed transfer should also fail, not reprocess.
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
```

* **Behavior under Contention:** If two simultaneous ₹100 transfers arrive for an account holding ₹100, Transaction 1 acquires the lock, verifies sufficient funds, and decrements the balance to ₹0. Transaction 2 blocks at `SELECT ... FOR UPDATE`. Once Transaction 1 commits, Transaction 2 unblocks, reads the newly committed balance (₹0), and fails with "Insufficient funds". The balance never drops below zero.

---

### 3. Database-Enforced Idempotency (`ON CONFLICT DO NOTHING`)

Application-layer idempotency checks (such as checking an in-memory cache or executing a SELECT prior to INSERT) remain susceptible to race conditions under concurrent network retries. AtomicPay enforces idempotency at the database engine via a PostgreSQL unique index on `transfers.idempotency_key`:

```typescript
// STEP 2: Idempotency check via INSERT ... ON CONFLICT DO NOTHING.
// The unique constraint on `idempotency_key` guarantees that even
// under concurrent retries, only one insert succeeds.
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
```

* **Duplicate Handling:** If a client retries due to network timeouts or double clicks, the database accepts exactly one insertion. Duplicate requests query the already-existing record and return the original result with `idempotent: true`, producing zero duplicate deductions.

---

### 4. Double-Entry Accounting & Balance Conservation Invariant

Wallet balances are not modified in isolation. For each transfer, two immutable ledger entries (`DEBIT` and `CREDIT`) are written in the same transaction that updates cached wallet balances:

```typescript
// STEP 4: Double-entry ledger writes.
// Both entries are written in the same transaction as the lock
// acquisition and balance update — if either write fails, everything
// rolls back (no partial debit without credit).
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
// These updates happen inside the same transaction as the ledger writes,
// so the cached balance can never drift from the true ledger-derived balance.
await tx.execute(
  sql`UPDATE wallets SET balance = ${newSenderBalance.toString()}, updated_at = NOW() WHERE id = ${fromWalletId}`
);
await tx.execute(
  sql`UPDATE wallets SET balance = ${newReceiverBalance.toString()}, updated_at = NOW() WHERE id = ${toWalletId}`
);
```


* Even Central Bank top-ups route through `transferFunds` from a reserved Central Bank Wallet, preserving the immutable audit trail for all currency operations.

---

### 5. Atomic Transaction Boundary under `READ COMMITTED`

All operations execute inside a single transaction scope:

```typescript
return await dbPool.transaction(
  async (tx) => {
    // Locks -> Idempotency -> Balance check -> Ledger writes -> Balance updates
  },
  { isolationLevel: "read committed" }
);
```

* **Why not `SERIALIZABLE`?** `SERIALIZABLE` isolation detects conflicts optimistically and aborts with serialization failure errors (`40001`), requiring application-level retry loops that increase latency and database churn under lock contention.
* **Why not Eventual Consistency?** Asynchronous queues introduce temporary ledger drift and necessitate compensating transactions (sagas) if downstream tasks fail.
* **AtomicPay Strategy:** Explicit row-level locking under `READ COMMITTED` serializes contending transactions at the database row level without aborts, delivering high throughput and immediate consistency.

---

## Concurrency & Transaction Execution Flow

<p align="center">
  <img src="./public/images/readme/concurrency-flow.svg" alt="Concurrency & Transaction Execution Flow" width="100%" />
</p>

---

## Tech Stack & Architectural Decisions

| Layer | Technology | Architectural Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js | Server Components for initial view rendering; Route Handlers for transactional API endpoints. |
| **Database** | PostgreSQL | ACID compliance, row-level `FOR UPDATE` lock primitives, and serverless connection pooling. |
| **ORM / Query** | Drizzle ORM | Selected for **transparent SQL locking control** (`SELECT ... FOR UPDATE`), avoiding high-level ORM abstraction leaks. |
| **Authentication** | Better Auth | Session management, credential hashing, and Google OAuth with native TypeScript typings. |
| **Real-Time** | Server-Sent Events (SSE) + SWR | Pushes targeted cache invalidation events to counterparties without continuous client polling. |
| **Validation** | Zod | Runtime schema validation and sanitization on all transactional API endpoints. |
| **Styling** | Tailwind CSS & Lucide | Responsive dashboard layout and design system. |
---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx       # Main wallet dashboard & real-time activity
│   │   ├── settings/page.tsx        # Profile, security & transaction PIN management
│   │   └── layout.tsx               # Protected dashboard layout with session check
│   ├── api/
│   │   ├── auth/[...all]/           # Better Auth authentication endpoints
│   │   ├── payment-requests/        # P2P payment requests, approvals & declines
│   │   ├── transfers/               # Atomic P2P fund transfer endpoint
│   │   ├── user/pin/                # 4-Digit Transaction PIN setup & verification
│   │   ├── users/lookup/            # Debounced counterparty lookup by email
│   │   ├── wallet/                  # Balance queries & central bank top-ups
│   │   └── sse/                     # Server-Sent Events real-time stream
│   ├── sign-in/page.tsx             # Authentication interface
│   └── page.tsx                     # Landing page
├── components/
│   ├── dashboard/                   # Modals: SendMoney, AddMoney, PinModal, RequestMoney
│   ├── hero/                        # Interactive 3D card hero section
│   ├── landing/                     # Landing sections: Features, HowItWorks, DemoPreview
│   └── ui/                          # Reusable UI primitives (PinInput, SpotlightCard)
├── db/
│   ├── schema.ts                    # Drizzle schema (users, wallets, transfers, ledger)
│   └── index.ts                     # Neon PostgreSQL connection pool
├── hooks/
│   └── useRealtimeUpdates.ts        # SSE listener triggering SWR cache mutation
├── lib/
│   ├── auth.ts                      # Better Auth server configuration
│   └── validations.ts               # Strict Zod schemas for transfer payloads
└── services/
    └── transfer.ts                  # transferFunds: Core ACID execution engine
```

---

## API Reference

| Endpoint | Method | Auth Required | Description |
| :--- | :---: | :---: | :--- |
| `/api/transfers` | `POST` | Session + PIN | Executes atomic peer-to-peer fund transfer with idempotency key |
| `/api/wallet` | `GET` | Session | Returns authenticated user's wallet balance, transfers, and ledger entries |
| `/api/wallet/add-money` | `POST` | Session | Mints demo currency via Central Bank transfer into user wallet |
| `/api/payment-requests` | `POST` | Session | Creates a pending payment request targeted at counterparty email |
| `/api/payment-requests/[id]/approve` | `POST` | Session + PIN | Authorizes and executes payment request through `transferFunds` |
| `/api/payment-requests/[id]/decline` | `POST` | Session | Rejects or cancels an active payment request |
| `/api/users/lookup` | `GET` | Session | Real-time debounced counterparty search by email |
| `/api/user/pin` | `GET` / `POST` | Session | Inspects PIN configuration status or registers a new 4-digit PIN |
| `/api/sse` | `GET` | Session / Demo | Server-Sent Events stream for real-time client updates |

---

## Technical Highlights

- **Engineered an ACID-Compliant Concurrency Engine:** Architected a deterministic row-locking mechanism using lexicographical UUID ordering under PostgreSQL `READ COMMITTED` isolation, preventing cross-transfer deadlocks and double-spends under concurrent load.
- **Implemented Database-Enforced Idempotency:** Mitigated duplicate deduction risks from network retries by implementing an `INSERT ... ON CONFLICT DO NOTHING` pipeline backed by database-level unique constraints.
- **Designed Immutable Double-Entry Ledger:** Built a financial accounting system enforcing a zero-sum conservation invariant (`ΔTotal_Balance = 0`), logging immutable debit and credit ledger rows atomically with balance updates.
- **Developed Two-Factor Transaction Authorization:** Implemented a secondary 4-digit PIN verification layer separate from authentication credentials, enforcing validation prior to balance mutations.
- **Built Low-Latency Real-Time Notification Pipeline:** Created an SSE (Server-Sent Events) streaming service paired with client-side SWR cache invalidation, delivering sub-second balance updates without client polling overhead.
- **Full-Stack Type Safety & Validation:** Implemented end-to-end type safety across Next.js, React, Zod schemas, and Drizzle ORM to enforce runtime invariants and compile-time contract enforcement.

---

## Concurrency & ACID Test Suite

AtomicPay includes a dedicated concurrency and stress test suite powered by [Vitest](https://vitest.dev) to verify transactional guarantees under live database contention. The suite is automatically executed on every commit and pull request via [GitHub Actions CI](https://github.com/AniketSinghRathour/AtomicPay/actions/workflows/ci.yml).

### Stress Test Matrix & Verification Criteria

| # | Test Scenario | Concurrency Load | Invariants & Assertions Tested |
| :---: | :--- | :--- | :--- |
| **1** | **Hot-Wallet Double-Spend** | 100 parallel ₹1 debits against ₹50 balance | Exactly 50 debits succeed; 50 fail with `Insufficient funds`. Final sender balance = ₹0.00 (**0 overdrafts**). |
| **2** | **Opposing Transfers ($A \rightleftarrows B$)** | 30 simultaneous transfers (15 A→B and 15 B→A) | Lexicographical UUID lock ordering eliminates circular wait conditions (**0 deadlocks / `40P01`**). |
| **3** | **3-Wallet Cycle ($A \rightarrow B \rightarrow C \rightarrow A$)** | 60 concurrent transfers (20 per directed edge) | Circular transfer paths serialize cleanly; sum of all 3 wallet balances is strictly conserved ($\Delta = 0$). |
| **4** | **10-Wallet Randomized Mesh** | 60 randomized P2P transfers across 10 accounts | Multi-wallet cross-contention; total system balance remains invariant ($\sum \text{Balances} = \text{₹1,000.00}$). |
| **5** | **Idempotency Storm Matrix** | 3 unique keys $\times$ 10 duplicate bursts (30 requests) | `ON CONFLICT DO NOTHING` guarantees exactly 3 database executions and 27 cached returns; 0 duplicate deductions. |
| **6** | **Boundary Validation Guards** | Self-transfers (`from == to`) & extreme overdrafts | Rejection at application & database boundary without acquiring unnecessary row locks or corrupting state. |
| **7** | **Atomic Rollback Invariant** | Mid-transaction exception simulation | Complete rollback under `READ COMMITTED`; zero partial debits, zero balance drift, zero orphan ledger rows. |
| **8** | **Zero-Sum Ledger Audit** | Comprehensive SQL sum of all debits vs. credits | Mathematical conservation: $\sum \text{Credits} - \sum \text{Debits} = 0$ (**0.00% ledger drift**). |

---

## Getting Started

### Prerequisites

- **Node.js** 18.x or 20.x
- **PostgreSQL Database**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AniketSinghRathour/AtomicPay.git
   cd AtomicPay
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Add your database and authentication configuration:
   ```env
   DATABASE_URL="postgresql://user:password@ep-xyz.neon.tech/atomicpay?sslmode=require"
   BETTER_AUTH_URL="http://localhost:3000"
   BETTER_AUTH_SECRET="your_secure_32_character_secret_key"
   
   # Optional: Google OAuth
   GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your_google_client_secret"
   ```

4. **Apply database schema:**
   ```bash
   npx drizzle-kit push
   ```

5. **Run the ACID Concurrency & Stress Test Suite:**
   ```bash
   npm test
   ```
   Executes all 8 concurrency tests (double-spend, opposing deadlocks, cyclic transfers, and zero-sum ledger audit).

6. **Start the development server:**
   ```bash
   npm run dev
   ```
   Navigate to [http://localhost:3000](http://localhost:3000) to access AtomicPay.

---

## License

This project is licensed under the **MIT License**.

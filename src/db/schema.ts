import {
  pgTable,
  uuid,
  text,
  bigint,
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const ledgerEntryTypeEnum = pgEnum("ledger_entry_type", [
  "DEBIT",
  "CREDIT",
]);

export const transferStatusEnum = pgEnum("transfer_status", [
  "COMPLETED",
  "FAILED",
]);

export const paymentRequestStatusEnum = pgEnum("payment_request_status", [
  "PENDING",
  "APPROVED",
  "DECLINED",
]);

// ─── Better Auth tables ─────────────────────────────────────────────────────
// These follow Better Auth's expected schema. Better Auth manages them, but
// we define them here so Drizzle is aware of them for migrations and relations.

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  // Custom fields
  transactionPin: text("transaction_pin"), // hashed PIN, separate from login password
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"), // hashed password for email/password auth
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Wallets ────────────────────────────────────────────────────────────────

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    balance: bigint("balance", { mode: "bigint" }).notNull().default(sql`'0'`),
    isDemo: boolean("is_demo").notNull().default(false),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("wallets_user_id_idx").on(table.userId),
  ]
);

// ─── Transfers ──────────────────────────────────────────────────────────────

export const transfers = pgTable(
  "transfers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromWalletId: uuid("from_wallet_id")
      .notNull()
      .references(() => wallets.id),
    toWalletId: uuid("to_wallet_id")
      .notNull()
      .references(() => wallets.id),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    status: transferStatusEnum("status").notNull(),
    description: text("description"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // DATABASE-LEVEL unique constraint on idempotency key.
    uniqueIndex("transfers_idempotency_key_idx").on(table.idempotencyKey),
    index("transfers_from_wallet_id_idx").on(table.fromWalletId),
    index("transfers_to_wallet_id_idx").on(table.toWalletId),
  ]
);

// ─── Ledger Entries (immutable, double-entry) ───────────────────────────────

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id),
    transferId: uuid("transfer_id")
      .notNull()
      .references(() => transfers.id),
    entryType: ledgerEntryTypeEnum("entry_type").notNull(),
    amount: bigint("amount", { mode: "bigint" }).notNull(), // always positive
    balanceAfter: bigint("balance_after", { mode: "bigint" }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ledger_entries_wallet_id_idx").on(table.walletId),
    index("ledger_entries_transfer_id_idx").on(table.transferId),
  ]
);

// ─── Payment Requests ───────────────────────────────────────────────────────

export const paymentRequests = pgTable(
  "payment_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromWalletId: uuid("from_wallet_id")
      .notNull()
      .references(() => wallets.id),
    toWalletId: uuid("to_wallet_id")
      .notNull()
      .references(() => wallets.id),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    status: paymentRequestStatusEnum("status").notNull().default("PENDING"),
    message: text("message"),
    transferId: uuid("transfer_id").references(() => transfers.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payment_requests_from_wallet_id_idx").on(table.fromWalletId),
    index("payment_requests_to_wallet_id_idx").on(table.toWalletId),
  ]
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  wallet: one(wallets, {
    fields: [users.id],
    references: [wallets.userId],
  }),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  ledgerEntries: many(ledgerEntries),
  sentTransfers: many(transfers, { relationName: "senderWallet" }),
  receivedTransfers: many(transfers, { relationName: "receiverWallet" }),
  sentPaymentRequests: many(paymentRequests, {
    relationName: "requesterWallet",
  }),
  receivedPaymentRequests: many(paymentRequests, {
    relationName: "payeeWallet",
  }),
}));

export const transfersRelations = relations(transfers, ({ one, many }) => ({
  fromWallet: one(wallets, {
    fields: [transfers.fromWalletId],
    references: [wallets.id],
    relationName: "senderWallet",
  }),
  toWallet: one(wallets, {
    fields: [transfers.toWalletId],
    references: [wallets.id],
    relationName: "receiverWallet",
  }),
  ledgerEntries: many(ledgerEntries),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  wallet: one(wallets, {
    fields: [ledgerEntries.walletId],
    references: [wallets.id],
  }),
  transfer: one(transfers, {
    fields: [ledgerEntries.transferId],
    references: [transfers.id],
  }),
}));

export const paymentRequestsRelations = relations(
  paymentRequests,
  ({ one }) => ({
    fromWallet: one(wallets, {
      fields: [paymentRequests.fromWalletId],
      references: [wallets.id],
      relationName: "requesterWallet",
    }),
    toWallet: one(wallets, {
      fields: [paymentRequests.toWalletId],
      references: [wallets.id],
      relationName: "payeeWallet",
    }),
    transfer: one(transfers, {
      fields: [paymentRequests.transferId],
      references: [transfers.id],
    }),
  })
);

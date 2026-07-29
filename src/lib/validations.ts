import { z } from "zod";

export const transferSchema = z.object({
  toWalletId: z.string().uuid(),
  amount: z.number().int().positive(),
  description: z.string().optional(),
  idempotencyKey: z.string().min(1),
  transactionPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits")
});

export const paymentRequestSchema = z.object({
  toWalletId: z.string().uuid(),
  amount: z.number().int().positive(),
  message: z.string().optional(),
});

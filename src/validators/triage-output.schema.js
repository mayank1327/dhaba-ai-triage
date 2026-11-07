import { z } from "zod";

export const triageOutputSchema = z.object({
  category: z.enum([
    "billing",
    "technical_issue",
    "account_access",
    "cancellation",
    "feature_request",
    "product_question",
    "fraud",
    "other"
  ]),

  severity: z.enum(["low", "medium", "high", "critical"]),

  refund: z.object({
    requested: z.boolean(),
    amount_inr: z.number().nonnegative(),
    reason: z.string()
  }).strict(),

  reply_draft: z.string().min(1),

  needs_human: z.boolean(),

  confidence: z.number().min(0).max(1)
}).strict();
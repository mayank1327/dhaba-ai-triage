import { z } from "zod";

const purchaseSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["trial", "renewal"]),
  amount_inr: z.number().nonnegative(),
  status: z.enum(["initiated", "successful", "failed"]),
  at: z.iso.datetime({ offset: true })
}).strict();

export const ticketSchema = z.object({
  id: z.string().min(1),
  received_at: z.iso.datetime({ offset: true }),
  subject: z.string().min(1),
  body: z.string().min(1),
  purchases: z.array(purchaseSchema),
  app_opens_since_renewal: z.number().int().nonnegative()
}).strict();
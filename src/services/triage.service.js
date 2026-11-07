import { generateAIResponse } from "./ai.service.js";
import { triageOutputSchema } from "../validators/triage-output.schema.js";

export const processTicket = async (ticket) => {
let triageResult;
let processingStatus = "completed";

try {
  triageResult = await generateAIResponse(ticket);
} catch {
  processingStatus = "degraded";

  triageResult = triageOutputSchema.parse({
    category: "other",
    severity: "high",
    refund: {
      requested: false,
      amount_inr: 0,
      payment_ids: [],
      reason: "AI assessment unavailable. Human review required."
    },
    reply_draft:
      "We are unable to complete an automated assessment right now. Please have a support agent review this ticket.",
    needs_human: true,
    confidence: 0
  });
}

    return {
      success: true,
      ticketId: ticket.id,
      ...triageResult,
      ...(processingStatus === "degraded" && {
        processing_status: processingStatus
      })
    };
};
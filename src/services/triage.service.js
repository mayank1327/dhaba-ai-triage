
import { generateAIResponse } from "./ai.service.js";
import { triageOutputSchema } from "../validators/triage-output.schema.js";
import { evaluateRefund } from "./refund-safety.service.js";
import {
    reserveTicket,
    completeTicket,
    releaseTicket
  } from "./idempotency.service.js";

export const processTicket = async (ticket) => {
    const reservation = await reserveTicket(ticket.id);

    // Ticket already exists in database
    if (!reservation.reserved) {
      const existingTicket = reservation.existingResult;
  
      if (existingTicket.status === "completed") {
        return {
          statusCode: 200,
          data: existingTicket.result
        };
      }
  
      return {
        statusCode: 409,
        data: {
          success: false,
          ticketId: ticket.id,
          message: "This ticket is already being processed."
        }
      };
    }
  
    try {
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

  const refundDecision = evaluateRefund(
    ticket,
    triageResult.refund,
    triageResult
  );

  const result = {
    success: true,
    ticketId: ticket.id,
    ...triageResult,
    refund_decision: refundDecision,
    ...(processingStatus === "degraded" && {
      processing_status: processingStatus
    })
  };

  await completeTicket(ticket.id, result);


  return {
    statusCode: 200,
    data: result
  };
} catch (error) {
  await releaseTicket(ticket.id);
  throw error;
}
};

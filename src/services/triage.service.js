
import { generateAIResponse } from "./ai.service.js";
import { triageOutputSchema } from "../validators/triage-output.schema.js";
import { evaluateRefund } from "./refund-safety.service.js";
import {
  reserveTicket,
  completeTicket,
  releaseTicket
} from "./idempotency.service.js";
import logger from "../utils/logger.js";

export const processTicket = async (ticket) => {
  logger.info("ticket_processing_started", {
    ticketId: ticket.id,
  });

  const reservation = await reserveTicket(ticket.id);

  // Ticket already exists in database
  if (!reservation.reserved) {
    const existingTicket = reservation.existingResult;

    if (existingTicket.status === "completed") {
      logger.info("ticket_result_reused", {
        ticketId: ticket.id,
      });

      return {
        statusCode: 200,
        data: existingTicket.result
      };
    }

    logger.warn("ticket_processing_conflict", {
      ticketId: ticket.id,
    });

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
    } catch (error) {
      processingStatus = "degraded";

      logger.error("ticket_ai_degraded", {
        ticketId: ticket.id,
        errorType: error.name,
      });

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

    logger.info("ticket_processing_completed", {
      ticketId: ticket.id,
      processingStatus,
      refundDecision: refundDecision.status,
      needsHuman: triageResult.needs_human,
    });

    return {
      statusCode: 200,
      data: result
    };

  } catch (error) {
    logger.error("ticket_processing_failed", {
      ticketId: ticket.id,
      errorType: error.name,
    });

    await releaseTicket(ticket.id);
    throw error;
  }
};


import { ticketSchema } from "../validators/ticket.schema.js";
import logger from "../utils/logger.js";

export const validateTicket = (req, res, next) => {
  const result = ticketSchema.safeParse(req.body);

  if (!result.success) {
    logger.warn("ticket_validation_failed", {
        requestId: req.requestId,
        errorCount: result.error.issues.length,
      });
    
    return res.status(400).json({
      success: false,
      message: "Invalid ticket payload",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  req.body = result.data;

  next();
};
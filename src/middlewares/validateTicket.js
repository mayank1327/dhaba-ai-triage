import { ticketSchema } from "../validators/ticket.schema.js";

export const validateTicket = (req, res, next) => {
  const result = ticketSchema.safeParse(req.body);

  if (!result.success) {
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
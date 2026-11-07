import { processTicket } from "../services/triage.service.js";

export const triageTicket = async (req, res, next) => {
  try {
    const { statusCode, data } = await processTicket(req.body);

    return res.status(statusCode).json(data);
  } catch (error) {
    next(error);
  }
};
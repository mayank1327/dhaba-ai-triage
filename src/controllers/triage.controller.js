import { processTicket } from "../services/triage.service.js";

export const triageTicket = async (req, res, next) => {
  try {
    const result = await processTicket(req.body);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
import { generateAIResponse } from "./ai.service.js";

export const processTicket = async (ticket) => {
  const aiResponse = await generateAIResponse(ticket);

  return {
    success: true,
    ticketId: ticket.id,
    aiResponse
  };
};
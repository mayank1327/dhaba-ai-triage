export const processTicket = async (ticket) => {
    return {
      success: true,
      message: "Ticket received for processing",
      ticketId: ticket.id
    };
  };
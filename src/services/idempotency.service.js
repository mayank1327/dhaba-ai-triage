import { getTicketResultsCollection } from "../config/database.js";
import logger from "../utils/logger.js";

export const reserveTicket = async (ticketId) => {
  const collection = getTicketResultsCollection();

  try {
    await collection.insertOne({
      ticketId,
      status: "processing",
      result: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    logger.info("ticket_reservation_created", {
        ticketId,
      });

    return {
      reserved: true,
      existingResult: null
    };
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    const existingTicket = await collection.findOne({ ticketId });

    if (!existingTicket) {
        throw error;
      }
  
      if (existingTicket.status === "completed") {
        logger.info("duplicate_completed_ticket", { ticketId });
      } else {
        logger.warn("ticket_already_processing", { ticketId });
      }

    return {
      reserved: false,
      existingResult: existingTicket
    };
  }
};

export const completeTicket = async (ticketId, result) => {
  const collection = getTicketResultsCollection();

  await collection.updateOne(
    { ticketId, status: "processing" },
    {
      $set: {
        status: "completed",
        result,
        updatedAt: new Date()
      }
    }
  );

  if (result.modifiedCount === 1) {
    logger.info("ticket_processing_completed", { ticketId });
  } else {
    logger.error("ticket_completion_failed", { ticketId });
  }
};

export const releaseTicket = async (ticketId) => {
  const collection = getTicketResultsCollection();

  await collection.deleteOne({
    ticketId,
    status: "processing"
  });

  if (result.deletedCount === 1) {
    logger.warn("ticket_reservation_released", { ticketId });
  }
};
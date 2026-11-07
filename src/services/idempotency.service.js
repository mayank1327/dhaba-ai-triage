import { getTicketResultsCollection } from "../config/database.js";

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

    return {
      reserved: true,
      existingResult: null
    };
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    const existingTicket = await collection.findOne({ ticketId });

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
};

export const releaseTicket = async (ticketId) => {
  const collection = getTicketResultsCollection();

  await collection.deleteOne({
    ticketId,
    status: "processing"
  });
};
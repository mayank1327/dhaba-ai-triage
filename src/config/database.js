import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = "dhaba";

let client;
let database;

export const connectDatabase = async () => {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  client = new MongoClient(MONGODB_URI);

  await client.connect();

  database = client.db(DATABASE_NAME);

  const ticketResults = database.collection("ticketResults");

  await ticketResults.createIndex(
    { ticketId: 1 },
    { unique: true }
  );

  console.log("MongoDB connected successfully");
  console.log("Ticket results collection initialized");

  return database;
};

export const getDatabase = () => {
  if (!database) {
    throw new Error("Database is not connected");
  }

  return database;
};

export const getTicketResultsCollection = () => {
  return getDatabase().collection("ticketResults");
};
import express from "express";
import triageRoutes from "./routes/triage.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import requestLogger from "./middlewares/requestLogger.js";

const app = express();

// Middlewares
app.use(requestLogger);
app.use(express.json());

app.use("/triage", triageRoutes);

app.use(errorHandler);

export default app;
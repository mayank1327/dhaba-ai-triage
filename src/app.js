import express from "express";
import triageRoutes from "./routes/triage.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

// Middlewares
app.use(express.json());

app.use("/triage", triageRoutes);

app.use(errorHandler);

export default app;
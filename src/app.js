import express from "express";
import triageRoutes from "./routes/triage.routes.js";

const app = express();

// Middlewares
app.use(express.json());

app.use("/triage", triageRoutes);

export default app;
import { Router } from "express";
import { triageTicket } from "../controllers/triage.controller.js";
import { validateTicket } from "../middlewares/validateTicket.js";
const router = Router();

router.post("/", validateTicket, triageTicket);

export default router;
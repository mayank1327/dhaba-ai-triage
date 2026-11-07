import { Router } from "express";
import { triageTicket } from "../controllers/triage.controller.js";

const router = Router();

router.post("/", triageTicket);

export default router;
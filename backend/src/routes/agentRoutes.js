import { Router } from "express";

import {
  getAgentReport,
  syncAgents,
  unsyncAgents,
} from "../controllers/agentController.js";

const router = Router();

router.get("/", getAgentReport);
router.post("/sync", syncAgents);
router.post("/unsync", unsyncAgents);

export default router;

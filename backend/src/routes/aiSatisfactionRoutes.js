import express from "express";
import { analyzeSatisfaction } from "../controllers/aiSatisfaction.controller.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/analyze", requireAuth, analyzeSatisfaction);

export default router;
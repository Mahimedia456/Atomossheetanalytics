import express from "express";

import {
  getSatisfactionReport,
  syncSatisfaction,
} from "../controllers/satisfactionController.js";

import {
  requireAuth,
  requirePermission,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/sync",
  requireAuth,
  requirePermission("satisfaction:view"),
  syncSatisfaction
);

router.get(
  "/",
  requireAuth,
  requirePermission("satisfaction:view"),
  getSatisfactionReport
);

export default router;
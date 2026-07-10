import express from "express";

import {
  getTicketReport,
  syncTickets,
} from "../controllers/ticketController.js";

import {
  requireAuth,
  requirePermission,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/sync",
  requireAuth,
  requirePermission("tickets:view"),
  syncTickets
);

router.get(
  "/",
  requireAuth,
  requirePermission("tickets:view"),
  getTicketReport
);

export default router;
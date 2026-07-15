import express from "express";

import {
  getGlobalRmaFilterOptions,
  getGlobalRmaReport,
  getGlobalRmaStatus,
  syncGlobalRmaSheet,
} from "../controllers/globalRmaController.js";

import {
  requireAuth,
  requirePermission,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/status",
  requireAuth,
  requirePermission("rma:view"),
  getGlobalRmaStatus,
);

router.get(
  "/filters",
  requireAuth,
  requirePermission("rma:view"),
  getGlobalRmaFilterOptions,
);

router.post(
  "/sync",
  requireAuth,
  requirePermission("rma:view"),
  syncGlobalRmaSheet,
);

router.get(
  "/",
  requireAuth,
  requirePermission("rma:view"),
  getGlobalRmaReport,
);

export default router;
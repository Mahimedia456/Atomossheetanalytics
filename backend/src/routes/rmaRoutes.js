import express from "express";

import {
  getGlobalRmaReport,
  syncGlobalRma,
} from "../controllers/rmaController.js";

import {
  requireAuth,
  requirePermission,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/sync",
  requireAuth,
  requirePermission("rma:view"),
  syncGlobalRma
);

router.get(
  "/",
  requireAuth,
  requirePermission("rma:view"),
  getGlobalRmaReport
);

export default router;
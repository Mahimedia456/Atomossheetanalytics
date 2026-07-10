import express from "express";

import {
  getSocialReport,
  syncSocial,
} from "../controllers/socialController.js";

import {
  requireAuth,
  requirePermission,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/sync",
  requireAuth,
  requirePermission("social:view"),
  syncSocial
);

router.get(
  "/",
  requireAuth,
  requirePermission("social:view"),
  getSocialReport
);

export default router;
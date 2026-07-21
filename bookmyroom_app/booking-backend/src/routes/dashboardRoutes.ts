// src/routes/dashboardRoutes.ts
// Owner routes require the "owner" role so a signed-in guest can't
// probe the shape of another owner's numbers -- see L27.2 for the
// rationale. /user/stats stays on requireAuth only because both roles
// have their own "user bookings".
import { Router } from "express";
import {
  getOwnerRecentBookings,
  getOwnerStats,
  getUserStats,
} from "../controllers/dashboardController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/owner/stats", requireAuth, requireRole("owner"), getOwnerStats);
router.get(
  "/owner/recent-bookings",
  requireAuth,
  requireRole("owner"),
  getOwnerRecentBookings
);
router.get("/user/stats", requireAuth, getUserStats);

export default router;

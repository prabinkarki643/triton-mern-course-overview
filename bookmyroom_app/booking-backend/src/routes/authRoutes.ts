// src/routes/authRoutes.ts
import { Router } from "express";
import { register, login, getMe } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { validateResult } from "../middleware/validate";
import {
  registerValidator,
  loginValidator,
} from "../validators/auth.validator";

const router: Router = Router();

// Public routes (no authentication needed)
router.post("/register", registerValidator, validateResult, register);
router.post("/login", loginValidator, validateResult, login);

// Protected route (must be logged in)
router.get("/me", requireAuth, getMe);

export default router;

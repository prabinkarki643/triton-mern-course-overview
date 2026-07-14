// src/routes/paymentRoutes.ts
// Matches Lesson 26 section 26.6.
import { Router } from "express";
import {
  esewaFailureCallback,
  esewaSuccessCallback,
  initiateEsewaPayment,
} from "../controllers/paymentController";
import { requireAuth } from "../middleware/auth";
import { validateResult } from "../middleware/validate";
import { initiatePaymentValidator } from "../validators/payment.validator";

const router: Router = Router();

// Initiate is called by our own frontend -- auth required.
router.post(
  "/initiate",
  requireAuth,
  initiatePaymentValidator,
  validateResult,
  initiateEsewaPayment
);

// Callbacks are hit by eSewa (which doesn't send our JWT). NO auth on
// these routes -- authentication is provided by the signed `data`
// payload we verify with eSewa's status API.
router.get("/esewa/callback/success", esewaSuccessCallback);
router.get("/esewa/callback/failure", esewaFailureCallback);

export default router;

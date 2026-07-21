// src/controllers/paymentController.ts
// Matches Lesson 26 section 26.6. Three endpoints:
//  - POST /api/payments/initiate  (frontend calls this)
//  - GET  /api/payments/esewa/callback/success  (eSewa redirects here)
//  - GET  /api/payments/esewa/callback/failure  (eSewa redirects here)
import { Request, Response } from "express";
import Booking, { IBooking } from "../models/Booking";
import User, { IUser } from "../models/User";
import { IRoom } from "../models/Room";
import {
  buildPayload,
  esewaFormActionUrl,
  verifyPayment,
} from "../services/esewaService";
import {
  sendMail,
  bookingPaymentReceivedGuestEmail,
  bookingPaymentReceivedOwnerEmail,
} from "../services/mailService";

// POST /api/payments/initiate  (frontend)
// Returns the eSewa form action URL and the signed payload the frontend
// will auto-submit. success_url and failure_url point at THIS backend,
// not at the frontend.
export const initiateEsewaPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { bookingId } = req.body;

    const booking: IBooking | null = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }
    if (booking.user.toString() !== req.user!.userId) {
      // Never let another user pay for someone else's booking.
      res.status(404).json({ message: "Booking not found" });
      return;
    }
    if (booking.paymentMethod !== "esewa") {
      res.status(400).json({ message: "This booking does not use eSewa" });
      return;
    }
    if (booking.paymentStatus === "paid") {
      res.status(400).json({ message: "This booking is already paid" });
      return;
    }

    // Fresh transaction id every attempt. Overwriting the previous one is
    // fine -- eSewa is only interested in the latest one.
    const transactionId = `ESW-${booking._id}-${Date.now()}`;
    booking.transactionId = transactionId;
    booking.paymentStatus = "pending"; // reset from any prior "failed"
    await booking.save();

    // success_url and failure_url both point at OUR backend. eSewa will
    // hit these with GET redirects carrying the signed data field.
    const serverBase = process.env.SERVER_BASE_URL || "http://localhost:4001";
    const payload = buildPayload(
      booking.totalPrice,
      transactionId,
      `${serverBase}/api/payments/esewa/callback/success`,
      `${serverBase}/api/payments/esewa/callback/failure`
    );

    res.json({ data: { paymentUrl: esewaFormActionUrl(), payload } });
  } catch (error: unknown) {
    console.error("initiateEsewaPayment error:", error);
    res.status(500).json({ message: "Failed to initiate eSewa payment" });
  }
};

// GET /api/payments/esewa/callback/success  (eSewa -> us)
// eSewa redirects the browser here with a base64-encoded `data` field
// carrying the signed transaction result. We decode it, verify with
// eSewa's status API (never trust the redirect alone), update the
// booking, then 302 the browser to the frontend.
export const esewaSuccessCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  const clientBase = process.env.CLIENT_URL || "http://localhost:3002";
  try {
    const dataParam = req.query.data as string | undefined;
    if (!dataParam) {
      res.redirect(`${clientBase}/bookings?payment=failed`);
      return;
    }

    // eSewa's `data` param is base64-encoded JSON.
    const decoded = JSON.parse(
      Buffer.from(dataParam, "base64").toString("utf8")
    ) as { transaction_uuid?: string; total_amount?: string };
    const transactionId = decoded.transaction_uuid;
    const totalAmount = Number(decoded.total_amount);

    if (!transactionId || Number.isNaN(totalAmount)) {
      res.redirect(`${clientBase}/bookings?payment=failed`);
      return;
    }

    // Populate on lookup so we have room+owner+guest ready for the
    // notification emails without a second round-trip.
    const booking = await Booking.findOne({ transactionId })
      .populate("room", "title location price images owner")
      .populate("user", "name email");
    if (!booking) {
      // Landed on our callback with an unknown transaction id.
      res.redirect(`${clientBase}/bookings?payment=failed`);
      return;
    }

    // Server-to-server verify -- the actually authoritative step.
    const ok = await verifyPayment(transactionId, totalAmount);
    booking.paymentStatus = ok ? "paid" : "failed";

    // Auto-confirm on successful eSewa payment. eSewa collapses the two-axis
    // model (see L26.2): the guest has committed real money, so we skip the
    // "owner reviews" gate the COD flow needs. Guarded on status === "pending"
    // so a late callback can never un-cancel a booking the cron / guest has
    // already killed.
    if (ok && booking.status === "pending") {
      booking.status = "confirmed";
    }
    await booking.save();

    // On success, fire TWO fire-and-forget emails:
    //   - guest: "We received your payment"
    //   - owner: "Money hit your account for booking X"
    // Both are autonomous (neither party clicked a button), so both
    // deserve a notification.
    if (ok) {
      void notifyPaymentReceived(booking).catch((err) => {
        console.error("Payment receipt emails failed:", err);
      });
    }

    res.redirect(
      `${clientBase}/bookings/${booking._id}?payment=${ok ? "success" : "failed"}`
    );
  } catch (error: unknown) {
    console.error("esewaSuccessCallback error:", error);
    res.redirect(`${clientBase}/bookings?payment=failed`);
  }
};

// GET /api/payments/esewa/callback/failure  (eSewa -> us)
// Best-effort: if we can identify the booking from a query param, mark
// it failed. Either way bounce the browser back to the app.
export const esewaFailureCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  const clientBase = process.env.CLIENT_URL || "http://localhost:3002";
  try {
    const transactionId =
      (req.query.transaction_uuid as string) || undefined;
    if (transactionId) {
      const booking = await Booking.findOne({ transactionId });
      if (booking && booking.paymentStatus !== "paid") {
        booking.paymentStatus = "failed";
        await booking.save();
        res.redirect(`${clientBase}/bookings/${booking._id}?payment=failed`);
        return;
      }
    }
    res.redirect(`${clientBase}/bookings?payment=failed`);
  } catch (error: unknown) {
    console.error("esewaFailureCallback error:", error);
    res.redirect(`${clientBase}/bookings?payment=failed`);
  }
};

// Fires the guest receipt + the owner notification -- called only from
// the eSewa success path (COD bookings notify guest only, from
// markBookingPaid).
async function notifyPaymentReceived(populated: IBooking): Promise<void> {
  const room = populated.room as unknown as IRoom;
  const guest = populated.user as unknown as { name: string; email: string };
  const owner: IUser | null = await User.findById(room.owner);

  // Guest receipt
  const guestMail = bookingPaymentReceivedGuestEmail({
    guestName: guest.name,
    roomTitle: room.title,
    checkIn: populated.checkIn,
    checkOut: populated.checkOut,
    totalPrice: populated.totalPrice,
    paymentMethod: populated.paymentMethod,
    transactionId: populated.transactionId,
    bookingId: String(populated._id),
  });
  await sendMail({
    to: guest.email,
    subject: guestMail.subject,
    html: guestMail.html,
  });

  // Owner notification (skip if we somehow can't find the owner)
  if (owner) {
    const ownerMail = bookingPaymentReceivedOwnerEmail({
      ownerName: owner.name,
      guestName: guest.name,
      roomTitle: room.title,
      totalPrice: populated.totalPrice,
      transactionId: populated.transactionId ?? "-",
      bookingId: String(populated._id),
    });
    await sendMail({
      to: owner.email,
      subject: ownerMail.subject,
      html: ownerMail.html,
    });
  }
}

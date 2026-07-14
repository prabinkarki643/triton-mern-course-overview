# Lesson 26: Payment Integration: eSewa & COD

## What You Will Learn
- Understanding different payment methods: online (**eSewa**) and offline (**Cash on Delivery**)
- Extending the L25 Booking model with `paymentStatus`, `transactionId` and `cancellationReason` -- without changing the `status` flow (the owner still confirms every booking, whatever the payment method)
- Integrating eSewa using **HMAC-SHA256 signed payloads**
- Wiring eSewa's success/failure callbacks to the **backend** (not the frontend), so verification runs before the guest sees any UI and no signed data flies through the browser
- Reusing the L25 `BookingDetail` page for post-payment UX -- **no dedicated success / failure pages** -- via a `?payment=` query param that fires a Sonner toast
- A hybrid submit UX: **Book Now** creates a `pending` booking and then, if the method is eSewa, kicks straight into the gateway redirect (no "click again to pay" second step for online payments)
- Owner-side "Mark cash received" for COD bookings, dropped into the `OwnerBookingDetail` page from L25
- A **cron job** that reclaims abandoned eSewa bookings so they don't block the room's dates forever
- Using eSewa sandbox credentials for safe development testing

---

## 26.1 Payment Methods Overview

Most applications that involve money need a way to collect payments. In Nepal, two of the most common approaches are:

1. **Cash on Delivery (COD)** -- the user places an order online but pays in cash when the service is delivered or the goods arrive. No online payment processing is needed.
2. **eSewa** -- Nepal's most popular digital wallet. The user is redirected to eSewa's website, pays there, and is sent back to your application.

We will implement both in our project. COD is simpler, so we start there.

---

## 26.2 Database Changes: Payment + Cancellation Fields

Lesson 25 gave the Booking a `paymentMethod` field with a single-option enum (`["cod"]`) and an owner-driven `status` flow (`pending → confirmed | cancelled`). Two axes are added in L26:

1. **Widen `paymentMethod`** to `["cod", "esewa"]`
2. **Add three sibling fields** -- `paymentStatus`, `transactionId`, and `cancellationReason` -- so the eSewa flow has somewhere to record its result and so users can see *why* a booking was cancelled

```typescript
// backend/src/models/Booking.ts  (diff)
export type PaymentMethod = "cod" | "esewa";                 // was: "cod"
export type PaymentStatus = "pending" | "paid" | "failed";   // NEW

export interface IBooking extends Document {
  // ...existing fields (room, user, checkIn, checkOut, guests,
  // totalPrice, status)...
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;   // NEW
  transactionId?: string;         // NEW
  cancellationReason?: string;    // NEW
}

// inside the schema definition, adjust paymentMethod and append the
// three new fields:
paymentMethod: {
  type: String,
  enum: ["cod", "esewa"],         // was: ["cod"]
  required: [true, "Payment method is required"],
  default: "cod",
},
paymentStatus: {                  // NEW
  type: String,
  enum: ["pending", "paid", "failed"],
  default: "pending",
},
transactionId: {                  // NEW
  type: String,
  default: undefined,
},
cancellationReason: {             // NEW
  type: String,
  default: undefined,
  maxlength: [500, "Reason cannot exceed 500 characters"],
},
```

**The four field changes in one place:**

- **`paymentMethod`** -- widened enum so the client can pick either method
- **`paymentStatus`** -- pending / paid / failed. COD bookings become `paid` when the owner marks cash received; eSewa bookings become `paid` after we verify the transaction with the gateway; `failed` when eSewa rejects or the cron reclaims the row
- **`transactionId`** -- eSewa returns a reference id after a successful payment; we store it here for reconciliation
- **`cancellationReason`** -- optional human-readable text. The cron job (§26.14) sets `"Payment not completed within 30 minutes"` when it auto-cancels an abandoned eSewa booking. Manual cancels leave it undefined for now; adding an optional reason input on the Cancel AlertDialogs is a stretch exercise.

### `status` and `paymentStatus` are independent

Two orthogonal fields express every real-world state cleanly:

| `status` | `paymentStatus` | What it means |
|---|---|---|
| pending | pending | New request, owner hasn't decided, no payment yet |
| pending | paid | Guest paid up-front via eSewa, **owner is still reviewing** |
| pending | failed | Guest tried eSewa, gateway rejected -- they can retry |
| confirmed | pending | Owner accepted, guest still owes (COD, or eSewa in-flight) |
| **confirmed** | **paid** | Complete. Everyone happy. |
| cancelled | pending | Cancelled before any payment attempt |
| cancelled | paid | Cancelled after payment -- refund workflow (out of scope) |
| cancelled | failed | Cancelled after / including a failed attempt (typical cron outcome) |

**Payment method does NOT change the `status` flow.** The owner still confirms every request from the Owner Portal, whatever method the guest picked. That's why L26 will NOT modify L25's `createBooking` controller -- it keeps `status: "pending"` for everyone. Only `paymentStatus` varies by method.

> **Widening an enum is a safe migration.** Existing bookings with `paymentMethod: "cod"` still validate, and Mongoose does not need to backfill anything. Just re-deploy the model file.

---

## 26.3 Cash on Delivery (COD) Flow -- Keep L25 As-Is

**We do not touch `createBooking` in Lesson 26.** The L25 controller already creates COD bookings correctly:

```
status:        "pending"    (owner still confirms every booking)
paymentStatus: "pending"    (money not received yet -- default from the schema)
```

Nothing changes on `POST /api/bookings`. The owner reviews the request in `/owner/bookings` (same as any other booking), taps **Confirm** on `OwnerBookingDetail`, and the guest gets the confirmation email from L25.

The only owner-side action we **add** in L26 is a new endpoint that lets them tick the cash off after the guest arrives and pays:

```typescript
// backend/src/controllers/bookingController.ts  (append)
import { Request, Response } from "express";
import Booking, { IBooking } from "../models/Booking";
import Room, { IRoom } from "../models/Room";
import {
  sendMail,
  bookingPaymentReceivedGuestEmail,
} from "../services/mailService";

// PATCH /api/bookings/:id/mark-paid  (owner only)
// COD bookings only -- eSewa payments become "paid" via the callback in §26.6.
export const markBookingPaid = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const booking: IBooking | null = await Booking.findById(req.params.id)
      .populate("room");
    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    // Only the room's owner may mark cash received.
    const room = booking.room as unknown as IRoom;
    if (room.owner.toString() !== req.user!.userId) {
      res
        .status(403)
        .json({ message: "Only the room owner can mark this as paid" });
      return;
    }

    if (booking.paymentMethod !== "cod") {
      res.status(400).json({
        message: "Only COD bookings can be manually marked as paid",
      });
      return;
    }
    if (booking.paymentStatus === "paid") {
      res.status(400).json({ message: "Booking is already marked as paid" });
      return;
    }

    booking.paymentStatus = "paid";
    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate("room", "title location price images owner")
      .populate("user", "name email");

    // Email the guest a receipt. NOT the owner -- they just triggered
    // this themselves, self-emails are noise. Fire-and-forget so a mail
    // outage never blocks the money-received update.
    if (populated) {
      void notifyGuestOfPayment(populated).catch((err) => {
        console.error("Payment receipt email (guest) failed:", err);
      });
    }

    res.json({ data: populated });
  } catch (error: unknown) {
    console.error("markBookingPaid error:", error);
    res.status(500).json({ message: "Failed to mark booking as paid" });
  }
};

// Shared helper -- called from both markBookingPaid (COD) and
// esewaSuccessCallback (eSewa). Same template, template branches on
// paymentMethod internally.
async function notifyGuestOfPayment(populated: IBooking): Promise<void> {
  const room = populated.room as unknown as IRoom;
  const guest = populated.user as unknown as { name: string; email: string };
  const { subject, html } = bookingPaymentReceivedGuestEmail({
    guestName: guest.name,
    roomTitle: room.title,
    checkIn: populated.checkIn,
    checkOut: populated.checkOut,
    totalPrice: populated.totalPrice,
    paymentMethod: populated.paymentMethod,
    transactionId: populated.transactionId,
    bookingId: String(populated._id),
  });
  await sendMail({ to: guest.email, subject, html });
}
```

And its route + validator entry:

```typescript
// backend/src/validators/booking.validator.ts  (already has bookingIdValidator from L25)
// -- no changes needed --

// backend/src/routes/bookingRoutes.ts  (add ONE line)
router.patch(
  "/:id/mark-paid",
  requireAuth,
  bookingIdValidator,
  validateResult,
  markBookingPaid
);
```

Consistent with the rest of the app: `{ message }` on error responses, explicit `try/catch`, owner-only guard checked in the controller (not in a middleware -- we need the booking's room populated to look up the owner).

---

## 26.4 Understanding eSewa Integration

eSewa uses a **form-based redirect** flow. This means your application never handles card numbers or wallet passwords directly. Instead:

1. Your backend generates a signed payload (a set of form fields with a cryptographic signature).
2. Your frontend creates a hidden HTML form with those fields and submits it to eSewa's website.
3. The user logs into eSewa and confirms payment on eSewa's own page.
4. eSewa redirects the user back to your application (success or failure URL).
5. Your backend verifies the payment with eSewa's API.

```
    Your App                      eSewa
    --------                      -----
    1. Generate signed payload
    2. Submit form to eSewa ------>
                                  3. User pays on eSewa
    4. User redirected back <------
    5. Verify payment with API --->
                                  6. eSewa confirms status
    7. Update booking status <-----
```

The signature uses **HMAC-SHA256**, which is a way of proving that the request genuinely came from your application and has not been tampered with.

---

## 26.5 eSewa Service: Backend

Create a new file for the eSewa service. This is a simplified version with plain functions -- no classes, no factory pattern, just straightforward code:

```typescript
// backend/src/services/esewa.service.ts
import crypto from 'crypto';

// Configuration -- reads from environment variables
// Falls back to eSewa test/sandbox credentials for development
const ESEWA_CONFIG = {
  merchantId: process.env.ESEWA_MERCHANT_ID || 'EPAYTEST',
  secretKey: process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q',
  baseUrl:
    process.env.ESEWA_TEST_MODE === 'false'
      ? 'https://epay.esewa.com.np'
      : 'https://rc-epay.esewa.com.np',
};

/**
 * Generate an HMAC-SHA256 signature.
 *
 * eSewa requires every payment request to include a signature so they can
 * verify the request genuinely came from your application and has not been
 * altered in transit.
 */
export function generateSignature(message: string): string {
  return crypto
    .createHmac('sha256', ESEWA_CONFIG.secretKey)
    .update(message)
    .digest('base64');
}

/**
 * Build the complete form payload that will be submitted to eSewa.
 *
 * CRITICAL: every field listed in `signed_field_names` must be stringified
 * IDENTICALLY in the signed `message` and in the returned form field. eSewa
 * recomputes the HMAC over the RECEIVED field values, so any mismatch --
 * e.g. signing "60" but sending "60.00" -- returns `ES104 Invalid payload
 * signature`. Below we use `String(amount)` on both sides so they agree.
 *
 * @param amount       - Total amount to charge (in NPR)
 * @param transactionId - A unique identifier for this transaction
 * @param successUrl   - Where eSewa redirects after successful payment
 * @param failureUrl   - Where eSewa redirects if payment fails
 */
export function buildPayload(
  amount: number,
  transactionId: string,
  successUrl: string,
  failureUrl: string
) {
  const signedFieldNames = 'total_amount,transaction_uuid,product_code';
  const totalAmount = amount;
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionId},product_code=${ESEWA_CONFIG.merchantId}`;

  return {
    amount: String(amount),
    tax_amount: '0',
    total_amount: String(totalAmount),
    transaction_uuid: transactionId,
    product_code: ESEWA_CONFIG.merchantId,
    product_service_charge: '0',
    product_delivery_charge: '0',
    success_url: successUrl,
    failure_url: failureUrl,
    signed_field_names: signedFieldNames,
    signature: generateSignature(message),
  };
}

/**
 * Verify a payment with eSewa's status check API.
 *
 * After the user is redirected back to your app, you MUST verify the payment
 * server-side. Never trust the redirect alone -- a user could manually
 * navigate to your success URL without actually paying.
 */
export async function verifyPayment(
  transactionId: string,
  totalAmount: number
): Promise<boolean> {
  try {
    const response = await fetch(
      `${ESEWA_CONFIG.baseUrl}/api/epay/transaction/status/?product_code=${ESEWA_CONFIG.merchantId}&total_amount=${totalAmount}&transaction_uuid=${transactionId}`
    );
    const data = await response.json();
    return data.status === 'COMPLETE';
  } catch (error) {
    console.error('eSewa verification failed:', error);
    return false;
  }
}
```

Let us break down each function:

- **`generateSignature`** -- takes a message string and creates an HMAC-SHA256 hash using your secret key. This proves the payload came from you.
- **`buildPayload`** -- assembles all the form fields eSewa expects, including the cryptographic signature.
- **`verifyPayment`** -- calls eSewa's API to check whether a transaction was genuinely completed. This is critical for security.

> **Common pitfall -- ES104 "Invalid payload signature"**
>
> If you sign one form of the amount but send another (for example, sign `total_amount=60` but send `total_amount="60.00"` from `.toFixed(2)`), eSewa's page will drop you at `rc-epay.esewa.com.np/api/epay/main/v2/form` with:
>
> ```json
> {"code":"ES104","message":"Invalid payload signature."}
> ```
>
> eSewa recomputes the HMAC over the field values it *received*, not over the ones you *think* you signed. Every field listed in `signed_field_names` must be stringified identically in both places. The `String(amount)` pattern above keeps them in lock-step.
>
> Full transaction flow (worth skimming before you debug): https://developer.esewa.com.np/pages/Epay#transactionflow

---

### 26.5.1 Extending `mailService` with Payment-Receipt Templates

Whenever `paymentStatus` flips to `"paid"` -- either because eSewa verified an online payment (§26.6) or because the owner marked cash received (§26.3) -- we send the **guest** a receipt. For eSewa specifically we also notify the **owner** ("money hit your account for booking X"). On COD the owner triggered the transition themselves, so no owner email is needed.

We extend the mailer from Lesson 21.1 with two more named templates, in the same file where the L25 booking templates already live. Same shape, same XSS-safe `escape()` helper.

```ts
// backend/src/services/mailService.ts   (append below the L25 templates)

interface BookingPaymentReceivedGuestParams {
  guestName: string;
  roomTitle: string;
  checkIn: Date;
  checkOut: Date;
  totalPrice: number;
  paymentMethod: "cod" | "esewa";
  transactionId?: string;
  bookingId: string;
}

export function bookingPaymentReceivedGuestEmail(
  params: BookingPaymentReceivedGuestParams
): { subject: string; html: string } {
  const subject = `Payment received for ${params.roomTitle}`;
  const paymentLine =
    params.paymentMethod === "esewa"
      ? `Transaction id: <code>${escape(params.transactionId ?? "-")}</code>`
      : "Cash received on arrival.";
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="margin-top:0">Payment received</h2>
      <p>Hi ${escape(params.guestName)},</p>
      <p>
        We've received your payment of
        <strong>Rs ${params.totalPrice}</strong> for
        <strong>${escape(params.roomTitle)}</strong>.
      </p>
      <p>${paymentLine}</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 6px 0; color:#666;">Check-in</td>
          <td style="padding: 6px 0;">${fmtDate(params.checkIn)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color:#666;">Check-out</td>
          <td style="padding: 6px 0;">${fmtDate(params.checkOut)}</td>
        </tr>
      </table>
      <p style="color:#666; font-size: 13px;">Booking id: <code>${params.bookingId}</code></p>
    </div>
  `;
  return { subject, html };
}

interface BookingPaymentReceivedOwnerParams {
  ownerName: string;
  guestName: string;
  roomTitle: string;
  totalPrice: number;
  transactionId: string;
  bookingId: string;
}

// Only fired on eSewa. COD payments are marked received BY the owner --
// they don't need an email about an action they just performed.
export function bookingPaymentReceivedOwnerEmail(
  params: BookingPaymentReceivedOwnerParams
): { subject: string; html: string } {
  const subject = `Payment received: ${params.roomTitle} (Rs ${params.totalPrice})`;
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="margin-top:0">A guest just paid for their booking</h2>
      <p>Hi ${escape(params.ownerName)},</p>
      <p>
        <strong>${escape(params.guestName)}</strong> has paid
        <strong>Rs ${params.totalPrice}</strong> via eSewa for
        <strong>${escape(params.roomTitle)}</strong>.
      </p>
      <p>Transaction id: <code>${escape(params.transactionId)}</code></p>
      <p style="color:#666; font-size: 13px;">Booking id: <code>${params.bookingId}</code></p>
    </div>
  `;
  return { subject, html };
}
```

The `fmtDate` and `escape` helpers already exist in `mailService.ts` from L21.1 / L25 -- reuse them, don't redeclare.

**Why an owner email for eSewa but not COD:**

| Path | Guest email | Owner email | Reason |
|---|---|---|---|
| eSewa verify | ✅ | ✅ | Both parties get an autonomous "money moved" notification -- neither triggered it manually |
| COD mark-paid | ✅ | ❌ | The owner *is* the actor. Emailing them about a click they just made is noise. |

Wire both from inside `void ...catch(logger)` fire-and-forget wrappers, same as every other mail send in the app.

---

## 26.6 Payment Endpoints: Backend

Three endpoints total: **initiate** (called by the frontend to get the signed payload) and **two backend callbacks** that eSewa itself redirects to. **The callbacks are the important design decision** -- eSewa points at your backend, not your frontend, so signature verification runs before the guest sees any UI and the booking is up-to-date the moment their browser lands back on the app.

### Why backend callbacks (not frontend)

| Concern | Frontend callback (naive) | **Backend callback (this section)** |
|---|---|---|
| Guest closes the tab mid-redirect | Booking stuck at `paymentStatus: pending` forever | Already updated -- the tab closing is irrelevant |
| Signed payload transit | Flies through the browser, then handed back to backend | Lands directly on the backend |
| Sources of truth for `paymentStatus` | Two: eSewa's redirect + frontend-triggered verify endpoint | One: the backend callback handler |
| Extra hop | Zero | ~200ms (backend verify + 302) -- imperceptible |

We give up nothing meaningful and gain a lot.

### Step 1: Validators

```typescript
// backend/src/validators/payment.validator.ts
import { body } from "express-validator";

export const initiatePaymentValidator = [
  body("bookingId")
    .exists({ checkFalsy: true })
    .withMessage("Booking ID is required")
    .bail()
    .isMongoId()
    .withMessage("Valid booking ID required"),
];
```

No verify validator -- the callbacks read their id from a signed field inside eSewa's payload, not from client input.

### Step 2: Controller

```typescript
// backend/src/controllers/paymentController.ts
import { Request, Response } from "express";
import Booking, { IBooking } from "../models/Booking";
import User, { IUser } from "../models/User";
import Room, { IRoom } from "../models/Room";
import { buildPayload, verifyPayment } from "../services/esewa.service";
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
      res
        .status(400)
        .json({ message: "This booking does not use eSewa" });
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
    booking.paymentStatus = "pending";  // reset from any prior "failed"
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

    const paymentUrl =
      process.env.ESEWA_TEST_MODE === "false"
        ? "https://epay.esewa.com.np/api/epay/main/v2/form"
        : "https://rc-epay.esewa.com.np/api/epay/main/v2/form";

    res.json({ data: { paymentUrl, payload } });
  } catch (error: unknown) {
    console.error("initiateEsewaPayment error:", error);
    res.status(500).json({ message: "Failed to initiate eSewa payment" });
  }
};

// GET /api/payments/esewa/callback/success  (eSewa -> us)
// eSewa redirects the browser here with a base64-encoded `data` field
// carrying the signed transaction result. We decode it, verify the
// payment with eSewa's status API (never trust the redirect alone),
// update the booking, then 302 the browser to the frontend.
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

    // Server-to-server verify (the actually authoritative step).
    const ok = await verifyPayment(transactionId, totalAmount);
    booking.paymentStatus = ok ? "paid" : "failed";
    await booking.save();

    // On success, fire TWO fire-and-forget emails:
    //   - guest: "We received your payment"
    //   - owner: "Money hit your account for booking X"
    // Both are autonomous (neither party clicked a button), so both
    // deserve a notification. See §26.5.1 for the design table.
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

// Shared helper -- fires the guest receipt + the owner notification.
// Called only from the eSewa success path (COD bookings notify guest
// only, from markBookingPaid).
async function notifyPaymentReceived(populated: IBooking): Promise<void> {
  const room = populated.room as unknown as IRoom;
  const guest = populated.user as unknown as { name: string; email: string };
  const owner: IUser | null = await User.findById(room.owner);

  // Guest receipt
  const guestEmail = bookingPaymentReceivedGuestEmail({
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
    subject: guestEmail.subject,
    html: guestEmail.html,
  });

  // Owner notification (skip if we somehow can't find the owner)
  if (owner) {
    const ownerEmail = bookingPaymentReceivedOwnerEmail({
      ownerName: owner.name,
      guestName: guest.name,
      roomTitle: room.title,
      totalPrice: populated.totalPrice,
      transactionId: populated.transactionId ?? "-",
      bookingId: String(populated._id),
    });
    await sendMail({
      to: owner.email,
      subject: ownerEmail.subject,
      html: ownerEmail.html,
    });
  }
}

// GET /api/payments/esewa/callback/failure  (eSewa -> us)
// eSewa may redirect here without a signed payload (user cancelled on
// the eSewa page, etc.). Best effort: mark whatever we can as failed
// and bounce the browser back to the app.
export const esewaFailureCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  const clientBase = process.env.CLIENT_URL || "http://localhost:3002";
  try {
    // eSewa sometimes echoes the transaction uuid in the query; try to
    // pick it up so we can update the right booking. If not, the guest
    // still gets a friendly failure toast on the bookings list.
    const transactionId = (req.query.transaction_uuid as string) || undefined;
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
```

**Why the callbacks never send a JSON response.** They're hit by the guest's browser through an HTTP redirect, not by our own frontend fetch. If they replied with JSON, the browser would render `{ "message": ... }` as plain text. Every branch ends with `res.redirect(...)` back into the SPA -- success or failure. The SPA reads `?payment=` from the URL and shows the toast (see §26.10).

**Why the failure callback still updates the DB.** eSewa's failure redirect isn't as strongly authenticated as the success one (no `data` blob to verify), but if the guest genuinely cancelled or the gateway rejected, we still want `paymentStatus: failed` so the "Retry" button appears on `BookingDetail`. Worst case: a malicious visitor hits `/callback/failure?transaction_uuid=X` for a booking that's already paid, and we defensively skip the update (`booking.paymentStatus !== "paid"` guard).

### Step 3: Route Wiring

```typescript
// backend/src/routes/paymentRoutes.ts
import { Router } from "express";
import {
  initiateEsewaPayment,
  esewaSuccessCallback,
  esewaFailureCallback,
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
// payload we then verify with eSewa's status API.
router.get("/esewa/callback/success", esewaSuccessCallback);
router.get("/esewa/callback/failure", esewaFailureCallback);

export default router;
```

Register in the main app file:

```typescript
// backend/src/index.ts (add)
import paymentRoutes from "./routes/paymentRoutes";
app.use("/api/payments", paymentRoutes);
```

> **The callbacks are unauthenticated.** That's not a bug -- eSewa's server has no way to include your JWT in a browser redirect. Authentication comes from the signed `data` payload plus the server-to-server `verifyPayment` call. Anyone can *hit* the endpoints, but they can't forge a payment.

---

## 26.7 Environment Variables

Add these to your backend `.env` file. `CLIENT_URL` is already there from Lesson 20 -- the callbacks use it to redirect back to the frontend after verifying.

```env
# eSewa configuration
ESEWA_MERCHANT_ID=EPAYTEST
ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q
ESEWA_TEST_MODE=true

# The URL eSewa hits with its success / failure redirects. Must be
# publicly reachable from eSewa's servers in production -- during local
# development the same http://localhost:4001 that runs the API works
# because eSewa's redirect happens in the guest's own browser (their
# browser is running on the same machine, so it can reach localhost).
SERVER_BASE_URL=http://localhost:4001

# Frontend origin the callbacks 302 back to (already set in L20)
CLIENT_URL=http://localhost:3002
```

Mirror the two new keys into `.env.example` with placeholder values so the next student to clone the repo knows what to fill in.

> **Important:** `EPAYTEST` / `8gBm/:&EnhH.1/q` are eSewa's official sandbox credentials -- publicly documented and safe for development. Replace with real values from your eSewa merchant account for production.
>
> **Production caveat:** `SERVER_BASE_URL` must be a public HTTPS URL that eSewa can reach (their servers issue the redirect that lands in the guest's browser -- but the URL string must be a valid public origin, since eSewa's dashboard validates it). Localhost only works during local development because the guest's own browser is on the same machine.

---

## 26.8 Frontend: The Payment API Service Layer

Because eSewa verifies on the backend now, the frontend only needs **one** payment method: `initiateEsewa`. There's no `verify` on the frontend -- the backend callback owns that step.

### Step 1: Types

```typescript
// webapp/src/types/payment.ts
export interface EsewaPayload {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;      // now points at OUR backend
  failure_url: string;      // now points at OUR backend
  signed_field_names: string;
  signature: string;
}

export interface InitiateEsewaResponse {
  paymentUrl: string;
  payload: EsewaPayload;
}
```

### Step 2: The `paymentApi` Service

```typescript
// webapp/src/services/paymentApi.ts
import api from "./api";
import type { InitiateEsewaResponse } from "@/types/payment";

export const paymentApi = {
  async initiateEsewa(bookingId: string): Promise<InitiateEsewaResponse> {
    const { data } = await api.post<{ data: InitiateEsewaResponse }>(
      "/payments/initiate",
      { bookingId }
    );
    return data.data;
  },
};
```

Notice the **double `.data`** -- Axios wraps the HTTP body in `response.data`, and our backend wraps the payload in `{ data: ... }`. We unwrap both at the service layer so consumers get the inner object directly.

### Step 3: Submitting to eSewa

When the backend returns the eSewa payload, we create an invisible HTML form and auto-submit it. This redirects the user to eSewa's payment page.

```typescript
// webapp/src/utils/esewa.ts
import type { EsewaPayload } from '../types/payment';

/**
 * Create a hidden form, populate it with the eSewa payload fields,
 * and submit it. This redirects the user to eSewa's payment page.
 */
export function submitEsewaForm(
  paymentUrl: string,
  payload: EsewaPayload
): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentUrl;

  // Create a hidden input for each field in the payload
  for (const [key, value] of Object.entries(payload)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  // Add the form to the page and submit it
  document.body.appendChild(form);
  form.submit();
}
```

### Step 4: One React Query Mutation Hook

Since only `initiate` is left, only one hook is needed. It calls the API, then auto-submits the hidden form via `submitEsewaForm` -- the guest's browser navigates to eSewa, the flow returns via the backend callback, no more work here.

```typescript
// webapp/src/hooks/usePayments.ts
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { paymentApi } from "@/services/paymentApi";
import { submitEsewaForm } from "@/utils/esewa";

export function useInitiateEsewaPayment() {
  return useMutation({
    mutationFn: (bookingId: string) => paymentApi.initiateEsewa(bookingId),
    onSuccess: (data) => {
      // Auto-submit the hidden form -- the browser navigates to eSewa.
      // From here, everything flows back through the backend callback in §26.6.
      submitEsewaForm(data.paymentUrl, data.payload);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to initiate payment");
    },
  });
}
```

No `useVerifyEsewaPayment` -- the backend callback verifies, updates the DB, then 302s the browser to `BookingDetail`. React Query invalidation happens naturally when the guest lands on `BookingDetail`, which re-fetches via `useBooking(id)`.

---

## 26.9 Frontend: Widen the L25 BookingForm + Hybrid Submit UX

The L25 `BookingForm` already has a Payment method `Select`, seeded with just `"cod"`. Two small changes turn it into the L26 flow:

1. Add `"esewa"` as a second option in the Select (and widen the Zod enum + `PaymentMethod` type)
2. Branch on the guest's choice inside the submit handler -- **COD** goes straight to `/bookings` as before; **eSewa** immediately fires `useInitiateEsewaPayment` after the booking is created, so the browser flows directly to the gateway

### The three widenings (types / Zod / Select)

```ts
// booking-frontend/src/types/booking.ts  (diff)
export type PaymentMethod = "cod" | "esewa";   // was: "cod"
```

```ts
// booking-frontend/src/schemas/bookingSchema.ts  (diff)
paymentMethod: z.enum(["cod", "esewa"], {   // was: ["cod"]
  errorMap: () => ({ message: "Please select a payment method" }),
}),
```

```tsx
// booking-frontend/src/components/booking/BookingForm.tsx  (diff -- inside the Payment method Controller)
<SelectContent>
  <SelectItem value="cod">Cash on arrival</SelectItem>
  <SelectItem value="esewa">eSewa</SelectItem>   {/* NEW */}
</SelectContent>
```

That's the entire "add the option" change. The form field, layout, and validation all keep working unchanged.

### The hybrid submit -- one branch based on payment method

L25's submit currently navigates to `/bookings` on every success. L26 branches:

- **COD**: same as L25 -- toast "Booking request sent", navigate to `/bookings`.
- **eSewa**: navigate is *replaced* by firing `useInitiateEsewaPayment(booking._id)`. The hook auto-submits the hidden form; the guest's browser is now on eSewa's page. No "click Pay Now again" round-trip.

```tsx
// booking-frontend/src/components/booking/BookingForm.tsx  (diff -- inside the component)
import { useInitiateEsewaPayment } from "@/hooks/usePayments";

// inside BookingForm:
const { mutate: initiateEsewa } = useInitiateEsewaPayment();

const onSubmit = (data: BookingFormData): void => {
  createBooking(
    {
      room: room._id,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      guests: data.guests,
      paymentMethod: data.paymentMethod,
    },
    {
      onSuccess: (booking) => {
        if (data.paymentMethod === "esewa") {
          // Immediately kick off the eSewa redirect. No toast, no navigate --
          // the browser is about to leave the SPA for eSewa's page.
          initiateEsewa(booking._id);
        } else {
          // COD -- same as L25.
          navigate("/bookings");
        }
      },
    }
  );
};
```

**Why we don't navigate for eSewa.** `initiateEsewa` auto-submits the hidden HTML form on success, which triggers a full-page navigation to eSewa's URL. If we called `navigate("/bookings")` first, we'd race React Router against the form submit -- the guest might see `/bookings` for a fraction of a second before the eSewa redirect kicks in. Skipping the navigate on the eSewa branch keeps the UX clean.

**Retry path.** If the guest's eSewa attempt fails (they cancel on eSewa, network drops, gateway rejects), they land back on `BookingDetail` with `paymentStatus: "failed"`. `BookingDetail` (§26.10) shows a **Pay Now** button that calls the same `useInitiateEsewaPayment` -- so retry is one click away, no need to re-book.

---

## 26.10 Frontend: Post-Payment UX on `BookingDetail`

**No dedicated success or failure pages.** The backend callback (§26.6) already updated the DB and 302'd the guest to `/bookings/:id?payment=success` or `/bookings/:id?payment=failed`. `BookingDetail` (L25 §25.15.3) is already there ready to render, backed by `useBooking(id)` which reads the fresh `paymentStatus` straight out of the DB.

Two tiny additions to `BookingDetail` complete the loop:

1. **Toast on landing** -- read the `?payment=` param on mount, fire a Sonner toast, then strip the param so a refresh doesn't re-fire.
2. **Payment action block** -- Pay Now (`pending`), Retry (`failed`), or a Paid receipt (`paid`), each with the eSewa branch guarded by `paymentMethod === "esewa"`.

```tsx
// booking-frontend/src/pages/BookingDetail.tsx  (diff -- inside the component)
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useInitiateEsewaPayment } from "@/hooks/usePayments";

// inside BookingDetail:
const [searchParams, setSearchParams] = useSearchParams();
const { mutate: initiateEsewa, isPending: isInitiating } =
  useInitiateEsewaPayment();

// Read ?payment= once on mount and toast. Strip it so a refresh
// doesn't re-fire the toast forever.
useEffect(() => {
  const outcome = searchParams.get("payment");
  if (outcome === "success") toast.success("Payment received. You're all set.");
  if (outcome === "failed") toast.error("Payment didn't go through. Try again below.");
  if (outcome) {
    searchParams.delete("payment");
    setSearchParams(searchParams, { replace: true });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Then, in the Actions card (where the L25 code left the `// Lesson 26 will add payment blocks here` comment), drop in the payment states:

```tsx
{/* Payment block -- only for eSewa bookings */}
{booking.paymentMethod === "esewa" && (
  <>
    {booking.paymentStatus === "pending" && (
      <Button
        className="w-full"
        disabled={isInitiating}
        onClick={() => initiateEsewa(booking._id)}
      >
        {isInitiating ? "Redirecting..." : "Pay with eSewa"}
      </Button>
    )}

    {booking.paymentStatus === "failed" && (
      <Button
        className="w-full"
        variant="destructive"
        disabled={isInitiating}
        onClick={() => initiateEsewa(booking._id)}
      >
        {isInitiating ? "Redirecting..." : "Retry payment"}
      </Button>
    )}

    {booking.paymentStatus === "paid" && (
      <div className="rounded-md border p-3 text-sm">
        <div className="font-medium">Paid via eSewa</div>
        {booking.transactionId && (
          <div className="text-muted-foreground text-xs">
            Ref: <code className="font-mono">{booking.transactionId}</code>
          </div>
        )}
      </div>
    )}
  </>
)}

{/* COD guests get a passive line -- the owner marks it paid */}
{booking.paymentMethod === "cod" && (
  <div className="text-muted-foreground text-sm">
    Payment on arrival. {booking.paymentStatus === "paid"
      ? "Marked received."
      : "Owner will mark it received after check-in."}
  </div>
)}
```

**No new routes needed.** `/bookings/:id` already exists from L25. The `?payment=` query is just a message passed by the backend redirect -- React Router treats it like any other URL param.

**Displaying `cancellationReason`.** Bookings that got cancelled by the cron (or manually with a future reason) show the reason inline in `BookingSummary` (a one-line touch in the L25 component):

```tsx
// booking-frontend/src/components/booking/BookingSummary.tsx  (diff -- append after the Room hero header block)
{booking.status === "cancelled" && booking.cancellationReason && (
  <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border p-3 text-sm">
    <span className="font-medium">Cancelled: </span>
    {booking.cancellationReason}
  </div>
)}
```

Both the guest's `BookingDetail` and the owner's `OwnerBookingDetail` pick this up automatically because they both render `<BookingSummary>` (L25 §25.15.2). Also add the `cancellationReason?: string` field to `types/booking.ts` alongside the L26 type widening.

---

## 26.11 The Complete eSewa Flow: Step by Step

End-to-end path with backend callbacks. Each step is a genuine HTTP request or user action -- no hand-waving.

1. **Guest submits `BookingForm`** with `paymentMethod: "esewa"`. `POST /api/bookings` creates the booking with `status: "pending"`, `paymentStatus: "pending"` (§L25.4).
2. **On create success**, `BookingForm.onSuccess` sees the eSewa branch and calls `POST /api/payments/initiate` with the booking id (§26.6).
3. **Backend** generates `transactionId = ESW-<bookingId>-<timestamp>`, saves it on the booking, builds the HMAC-signed eSewa payload with `success_url` / `failure_url` pointing at **our backend**, and returns `{ paymentUrl, payload }`.
4. **Frontend** auto-submits a hidden HTML form to `paymentUrl` (§26.5 Step 3). Browser navigates to eSewa.
5. **Guest logs in and confirms payment on eSewa's page.**
6. **eSewa redirects the browser** to our success URL: `GET https://api.ourapp.com/api/payments/esewa/callback/success?data=<base64>`.
7. **Backend callback (`esewaSuccessCallback`)** decodes the base64 `data`, extracts `transaction_uuid` + `total_amount`, and calls eSewa's status check API for server-to-server verification.
8. **Backend updates booking**: `paymentStatus: "paid"` (or `"failed"` if eSewa says the transaction isn't `COMPLETE`).
9. **On success**, backend fires **two fire-and-forget emails** (guest: "we received your payment", owner: "money hit your account for booking X") -- both autonomous notifications, neither party triggered the transition manually.
10. **Backend responds with `302 Redirect`** to `${CLIENT_URL}/bookings/:id?payment=success` (or `?payment=failed`).
11. **Browser lands on `BookingDetail`** in our SPA. `useBooking(id)` fetches the fresh booking (already `paid` in Mongo). The `useEffect` reads `?payment=success` and fires the Sonner toast. The Actions block now shows the "Paid via eSewa" receipt instead of the Pay Now button.

The failure path is symmetrical: `/callback/failure` sets `paymentStatus: "failed"` (best-effort, based on `transaction_uuid` in the query), 302s to `/bookings/:id?payment=failed`, `BookingDetail` shows the error toast and a **Retry payment** button.

> **Why server-to-server verify is critical (step 7).** Someone could open the browser and type `https://api.ourapp.com/api/payments/esewa/callback/success?data=<forged>` directly. The signature inside `data` protects us for genuine flows -- but the true belt-and-braces defense is that we don't trust the signed data alone; we call eSewa's status API to independently confirm the transaction is `COMPLETE`. Even a valid-looking signed blob that eSewa doesn't recognise gets rejected here.

---

## 26.12 eSewa Sandbox Testing

For anything not covered below (extra fields, currencies, error codes, production onboarding), the authoritative reference is the ePay developer portal: https://developer.esewa.com.np/pages/Epay#transactionflow.

eSewa provides a sandbox environment for testing. Here are the details (the up-to-date list of test accounts lives at https://developer.esewa.com.np/pages/Test-credentials -- check there if the ones below stop working):

| Item | Value |
|------|-------|
| **Sandbox URL** | `https://rc-epay.esewa.com.np` |
| **Production URL** | `https://epay.esewa.com.np` |
| **Test Merchant ID** | `EPAYTEST` |
| **Test Secret Key** | `8gBm/:&EnhH.1/q` |
| **Test eSewa Account** | `9806800001` / `9806800002` / `9806800003` |
| **Test Password** | `Nepal@123` |
| **Test MPIN** | `1122` |

When testing:
1. Start your backend and frontend servers.
2. Create a booking and select eSewa as the payment method.
3. Click "Pay with eSewa" -- you will be redirected to the eSewa sandbox site.
4. Log in with one of the test accounts above.
5. Confirm the payment.
6. You will be redirected back to your success page.
7. The verification API call confirms the payment.

---

## 26.13 Owner: Marking COD Payments as Received

The **owner booking detail page** (`/owner/bookings/:id`, from Lesson 25.15.4) is the natural home for this action -- that's where the owner already lands to review a specific booking. We do NOT add another button on the DataTable rows in `/owner/bookings`; the row is for triage (Confirm/Cancel), and money-received is a per-booking decision the owner takes after cash has actually changed hands.

We follow the same pattern as everywhere else: a service method, a React Query mutation hook, and a thin component we drop into the detail page's `Actions` block (the placeholder comment `// Lesson 26 will add "Mark cash received" here...` in `OwnerBookingDetail.tsx` marks the spot).

```typescript
// webapp/src/services/bookingApi.ts (add to existing file)
async markAsPaid(bookingId: string): Promise<Booking> {
  const { data } = await api.patch<{ data: Booking }>(
    `/bookings/${bookingId}/mark-paid`
  );
  return data.data;
},
```

```typescript
// webapp/src/hooks/useBookings.ts (add to existing file)
export function useMarkBookingPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => bookingApi.markAsPaid(bookingId),
    onSuccess: () => {
      toast.success('Payment marked as received');
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark payment as received');
    },
  });
}
```

```tsx
// webapp/src/components/MarkAsPaidButton.tsx
import { Button } from '@/components/ui/button';
import { useMarkBookingPaid } from '@/hooks/useBookings';

interface MarkAsPaidButtonProps {
  bookingId: string;
}

export function MarkAsPaidButton({ bookingId }: MarkAsPaidButtonProps) {
  const { mutate: markPaid, isPending } = useMarkBookingPaid();

  return (
    <Button
      onClick={() => markPaid(bookingId)}
      disabled={isPending}
      variant="outline"
      size="sm"
    >
      {isPending ? 'Updating...' : 'Mark as Paid'}
    </Button>
  );
}
```

The component is tiny because all the work -- the API call, loading state, toast, and cache invalidation -- lives inside the hook. Drop `<MarkAsPaidButton bookingId={booking._id} />` into `OwnerBookingDetail.tsx`'s Actions card, guarded by `booking.paymentMethod === "cod" && booking.paymentStatus === "pending"` so it only appears when it's the right decision to offer. The Owner Bookings list and the guest's own view will both refresh automatically after the mutation succeeds, thanks to `invalidateQueries({ queryKey: bookingKeys.all })`.

**On the guest side**, the equivalent placeholder in `BookingDetail.tsx`'s Actions block is where you drop:

- A **"Pay with eSewa"** button when `booking.paymentMethod === "esewa"` and `paymentStatus === "pending"` -- kicks off the redirect flow you built in §26.5-26.6.
- A **receipt block** (transaction id, timestamp, status) when `paymentStatus === "paid"`.
- A **"Retry payment"** button when `paymentStatus === "failed"` -- routes back to the eSewa initiate call.

---

## 26.14 Cron Job: Reclaim Abandoned Bookings

An eSewa booking that stays `paymentStatus: pending` forever is a problem. The room's dates are locked (they'd fail conflict-detection for any competing guest), even though the original guest almost certainly closed the tab and moved on. Without cleanup, one abandoned attempt can block a room for weeks.

We fix this with a small **cron job** that periodically finds abandoned eSewa attempts and cancels them with a clear `cancellationReason`.

### What we target (and what we don't)

| Method | Do we auto-cancel? | Why |
|---|---|---|
| eSewa `paymentStatus: pending` past window | **Yes** | Guest started paying, never finished. Dates are locked. Reclaim. |
| COD `paymentStatus: pending` | **No** | COD is *supposed* to sit at pending until the owner acts. No abandonment concept. |
| Any `status: confirmed` | **No** | Owner has already agreed. Never auto-cancel. |
| Any `status: cancelled` | **No** | Already terminal. |

The exact query is `{ status: "pending", paymentStatus: "pending", paymentMethod: "esewa", createdAt: { $lt: cutoff } }`.

### Install `node-cron`

```bash
cd booking-backend
npm install node-cron
npm install --save-dev @types/node-cron
```

`node-cron` gives us a familiar crontab-style scheduler with a two-line API. Runs in-process (no separate worker) which is fine for our teaching project. In production you'd typically move this into a dedicated worker so scaling the web tier doesn't multiply the cron runs.

### The service

```typescript
// backend/src/services/cronService.ts
// Matches Lesson 26 section 26.14. Reclaims abandoned eSewa bookings so
// their dates come free for other guests to book.
import cron from "node-cron";
import Booking from "../models/Booking";

// How long we give a guest to finish an eSewa payment before we
// consider it abandoned. Configurable so students can shorten it to a
// couple of minutes for testing.
const ABANDON_MINUTES = Number(process.env.ABANDONED_BOOKING_MINUTES) || 30;

// How often the sweeper runs. Every 5 minutes is a good middle ground:
// long enough to keep DB load negligible, short enough that abandoned
// rows come free promptly.
const CRON_EXPRESSION = process.env.ABANDONED_BOOKING_CRON || "*/5 * * * *";

async function cancelAbandonedEsewaBookings(): Promise<void> {
  const cutoff = new Date(Date.now() - ABANDON_MINUTES * 60 * 1000);

  // Note: COD bookings are NOT touched. Their `pending` state is legitimate
  // -- it means the owner hasn't reviewed the booking yet, not that the
  // guest disappeared. Only eSewa has a "started paying then vanished"
  // failure mode.
  const result = await Booking.updateMany(
    {
      status: "pending",
      paymentStatus: "pending",
      paymentMethod: "esewa",
      createdAt: { $lt: cutoff },
    },
    {
      $set: {
        status: "cancelled",
        paymentStatus: "failed",
        cancellationReason: `Payment not completed within ${ABANDON_MINUTES} minutes`,
      },
    }
  );

  if (result.modifiedCount > 0) {
    console.log(
      `[cron] cancelled ${result.modifiedCount} abandoned eSewa booking(s)`
    );
  }
}

export function startCronJobs(): void {
  cron.schedule(CRON_EXPRESSION, () => {
    cancelAbandonedEsewaBookings().catch((err) => {
      // Never let the cron throw. If the sweep fails once, we just try
      // again on the next tick -- no need to crash the process.
      console.error("[cron] cancelAbandonedEsewaBookings failed:", err);
    });
  });
  console.log(
    `[cron] scheduled abandoned-booking sweep (${CRON_EXPRESSION}, window ${ABANDON_MINUTES}m)`
  );
}
```

### Wire it up in `index.ts`

Start the scheduler after the DB is connected. If Mongo isn't ready, the first sweep would just fail its query anyway.

```typescript
// backend/src/index.ts (diff)
import { startCronJobs } from "./services/cronService";

// ...existing setup...

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startCronJobs();
  });
});
```

### Env additions

Add two optional env vars so students can dial the numbers down for demos:

```env
# backend/.env
ABANDONED_BOOKING_MINUTES=30
ABANDONED_BOOKING_CRON=*/5 * * * *
```

Also add matching placeholders to `.env.example` with the same defaults documented.

### Why `updateMany`, not per-row?

Every candidate row gets the *same* update -- there's no per-row logic (no per-booking emails, no per-booking reason). `updateMany` runs in one round trip on the server; a `for` loop over a `find()` would issue N `save()` calls for zero benefit.

**If** you did want to email each guest ("we cancelled your abandoned booking, sorry!"), you'd `find()` first, iterate, send the email inside a `void ... .catch()`, then `updateMany` at the end. Not worth the complexity for L26 -- the cancellation reason on the detail page tells the story clearly enough.

### What the guest sees

Next time the guest opens the browser:

- If they navigate to `/bookings`, the abandoned booking now shows a **Cancelled** badge instead of blocking the dates.
- If they open the detail page, `BookingSummary`'s red banner shows: **Cancelled: Payment not completed within 30 minutes.**
- They can go back to `/rooms/:id` and rebook -- the dates are free.

### Verifying the cron in a test session

Testing every 30 minutes is painful. For a quick demo, temporarily set:

```env
ABANDONED_BOOKING_MINUTES=1
ABANDONED_BOOKING_CRON=*/1 * * * *
```

Then create an eSewa booking, close the tab before paying, wait 60-90 seconds, and refresh `/bookings`. You'll see the booking flip to Cancelled with the reason. Reset the env vars afterwards.

---

## Practice Exercises

1. **COD flow** -- Create a booking with `paymentMethod: "cod"`. Verify that `POST /api/bookings` returns `status: "pending"` and `paymentStatus: "pending"`. As the owner, tap **Confirm** on `/owner/bookings/:id`, then tap **Mark cash received** and confirm both the guest's `/bookings/:id` and the owner's view flip to Paid.

2. **eSewa end-to-end (sandbox)** -- Book with `paymentMethod: "esewa"`. Confirm the browser redirects straight to eSewa on submit (no intermediate `/bookings` flash). Complete the sandbox payment; land back on `/bookings/:id?payment=success` with a green toast and a **Paid via eSewa** receipt block showing the `transactionId`.

3. **eSewa failure path** -- Start an eSewa payment, cancel on eSewa's page. Confirm you land on `/bookings/:id?payment=failed`, the toast is the error variant, and the `Retry payment` button re-fires the initiate.

4. **Existence-safe callback** -- Hit `GET /api/payments/esewa/callback/success?data=notbase64` directly in the browser. The backend must gracefully redirect to `/bookings?payment=failed`, not error out to the guest.

5. **Cron demo** -- Set `ABANDONED_BOOKING_MINUTES=1` and `ABANDONED_BOOKING_CRON=*/1 * * * *`. Create an eSewa booking, close the tab before paying, wait 90 seconds. Confirm the booking is now Cancelled with `cancellationReason: "Payment not completed within 1 minutes"` (fix the pluralisation as a bonus). Confirm a fresh guest can now book the same dates -- the conflict-check no longer trips.

6. **Cancellation reason in the UI** -- Manually cancel a booking in mongosh with `cancellationReason: "Room booked out for maintenance"`. Refresh `/bookings/:id`. The red banner shows the reason.

7. **Stretch: Manual cancel with reason** -- Add an optional `<Textarea>` to the Cancel AlertDialogs on `BookingDetail` (guest self-cancel) and `OwnerBookingDetail` (owner cancel). If provided, the frontend passes `cancellationReason` alongside `status: "cancelled"` to `PATCH /api/bookings/:id/status`. Update the L25 validator + controller to accept it.

8. **Stretch: Third payment method** -- Add Khalti as a third method. Widen the enum, add a Khalti service (`generateSignature`, `buildPayload`, `verifyPayment`), backend callbacks, and one more `<SelectItem>` in the BookingForm. Notice how little needs to change because everything routes through the same `paymentStatus` field.

---

## Key Takeaways

- **Payment method never sets booking status.** `createBooking` from L25 always writes `status: "pending"`. The owner still confirms every request. Only `paymentStatus` varies by method (see the two-axis table in §26.2).
- **COD is a two-mutation flow.** L25's `createBooking` creates the row; L26's `PATCH /api/bookings/:id/mark-paid` on the owner's `OwnerBookingDetail` page flips `paymentStatus` to `paid` after cash changes hands.
- **eSewa uses a form-based redirect flow** with **backend callbacks** -- eSewa redirects to *our backend*, which verifies + updates the DB + 302s the guest to `BookingDetail`. This is safer than frontend callbacks: the booking is up-to-date the moment the guest's tab lands, even if they closed the tab mid-redirect.
- **Payment-received emails follow the "manual actor gets no self-email" rule.** eSewa success → both guest and owner receive a notification (autonomous transition). COD mark-paid → only the guest is emailed (the owner just clicked the button; emailing them would be noise). Both paths call the same `bookingPaymentReceivedGuestEmail` template.
- **HMAC-SHA256 signatures** prove the payment request came from us. But we still call eSewa's status check API server-to-server -- a valid-looking signed blob eSewa doesn't recognise gets rejected here.
- **No dedicated `/payment/success` or `/payment/failure` pages.** `BookingDetail` from L25 reads `?payment=` on mount, toasts, and strips the param. One page, three states (Pay Now / Retry / Receipt) driven by `paymentStatus`.
- **Hybrid submit UX.** `BookingForm.onSuccess` branches by `paymentMethod`: COD → toast + `/bookings`; eSewa → `initiateEsewa(booking._id)` which auto-submits the hidden form. The guest never sees a "click Pay Now again" second step for online payments.
- **`{ message }` on error responses**, matching the rest of the codebase. The Axios interceptor surfaces the friendly text via Sonner.
- **Widening an enum is a safe migration** -- Mongoose doesn't backfill anything, existing rows with `paymentMethod: "cod"` still validate. Just re-deploy the model file.
- **`cancellationReason` for user-visible cancellations.** The cron auto-sets it; `BookingSummary` shows it in a red banner on both detail pages. Manual cancels (guest / owner) don't set it in L26 but can be extended by the stretch exercise above.
- **Cron reclaims abandoned eSewa bookings** so their dates come free. Never touches COD (its `pending` state is legitimate), never touches `confirmed` or `cancelled`. Runs `updateMany` in one round trip. `node-cron` is fine in-process for the teaching stack; a real production system would move it to a dedicated worker so scaling the web tier doesn't multiply the sweeps.
- **Use sandbox credentials during development.** `EPAYTEST` / `8gBm/:&EnhH.1/q` are publicly-documented eSewa test values. Swap to real merchant creds only when you're accepting real money.
- **Keep secrets in `.env`, never in git.** `.env.example` documents the shape with placeholders and is safe to commit.

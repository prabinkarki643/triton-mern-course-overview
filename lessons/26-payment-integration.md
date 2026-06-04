# Lesson 26: Payment Integration: eSewa & COD

## What You Will Learn
- Understanding different payment methods: online (eSewa) and offline (Cash on Delivery)
- Building a COD payment flow with status tracking
- Integrating eSewa using HMAC-SHA256 signed payloads
- Creating backend endpoints to initiate and verify payments using **express-validator** and **asyncHandler**
- Returning a consistent **`{ data: ... }` response envelope** from every endpoint
- Building a payment selector inside a shadcn **Form** with React Hook Form + Zod
- Wrapping payment calls in an Axios **service layer** (`paymentApi`)
- Using **React Query mutation hooks** (`useInitiateEsewaPayment`, `useVerifyEsewaPayment`) for loading state, cache invalidation, and toast feedback
- Using eSewa sandbox credentials for safe development testing

---

## 26.1 Payment Methods Overview

Most applications that involve money need a way to collect payments. In Nepal, two of the most common approaches are:

1. **Cash on Delivery (COD)** -- the user places an order online but pays in cash when the service is delivered or the goods arrive. No online payment processing is needed.
2. **eSewa** -- Nepal's most popular digital wallet. The user is redirected to eSewa's website, pays there, and is sent back to your application.

We will implement both in our project. COD is simpler, so we start there.

---

## 26.2 Database Changes: Payment Fields

Before writing any payment logic, we need to store payment information on our bookings. Add these fields to your Booking model (or order model, depending on your project):

```typescript
// backend/src/models/Booking.ts
import { Schema, model, Document } from 'mongoose';

export interface IBooking extends Document {
  user: Schema.Types.ObjectId;
  room: Schema.Types.ObjectId;
  checkIn: Date;
  checkOut: Date;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentMethod: 'esewa' | 'cod';
  paymentStatus: 'pending' | 'paid' | 'failed';
  transactionId?: string;
}

const bookingSchema = new Schema<IBooking>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['esewa', 'cod'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    transactionId: { type: String },
  },
  { timestamps: true }
);

export const Booking = model<IBooking>('Booking', bookingSchema);
```

The key fields are:
- **`paymentMethod`** -- which method the user chose (`esewa` or `cod`)
- **`paymentStatus`** -- whether the payment has been completed (`pending`, `paid`, or `failed`)
- **`transactionId`** -- stores the eSewa transaction identifier (only for eSewa payments)

---

## 26.3 Cash on Delivery (COD) Flow

COD is the simplest payment method. Here is what happens:

```
User selects COD at checkout
        |
        v
Backend creates booking with:
  paymentMethod: "cod"
  paymentStatus: "pending"
        |
        v
User sees "Booking confirmed - pay on arrival"
        |
        v
When cash is collected, owner marks as paid
        |
        v
Backend updates paymentStatus to "paid"
```

### Backend: Create Booking with COD

When the user selects COD during checkout, the booking is created with `paymentMethod: 'cod'` and `paymentStatus: 'pending'`.

Following the patterns from Lesson 16, we split this into a **validator**, a **controller** (wrapped in `asyncHandler`), and a **route** that wires them together. Every response uses the `{ data: ... }` envelope.

```typescript
// backend/src/validators/booking.validator.ts
import { body, param } from 'express-validator';

export const createBookingValidator = [
  body('roomId').exists({ checkFalsy: true }).isMongoId().withMessage('Valid room ID required'),
  body('checkIn').exists({ checkFalsy: true }).isISO8601().withMessage('Valid check-in date required'),
  body('checkOut').exists({ checkFalsy: true }).isISO8601().withMessage('Valid check-out date required'),
  body('totalPrice').exists().isFloat({ min: 0 }).withMessage('Total price must be a positive number'),
  body('paymentMethod').exists({ checkFalsy: true }).isIn(['esewa', 'cod']).withMessage('Payment method must be esewa or cod'),
];

export const bookingIdValidator = [
  param('id').isMongoId().withMessage('Invalid booking ID format'),
];
```

```typescript
// backend/src/controllers/bookingController.ts
import { Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { Booking } from '../models/Booking';
import type { AuthRequest } from '../types/auth';

// POST /api/bookings
export const createBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { roomId, checkIn, checkOut, totalPrice, paymentMethod } = req.body;

  const booking = await Booking.create({
    user: req.userId,
    room: roomId,
    checkIn: new Date(checkIn),
    checkOut: new Date(checkOut),
    totalPrice,
    paymentMethod,
    paymentStatus: 'pending',
    status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
  });

  res.status(201).json({ data: booking });
});

// PATCH /api/bookings/:id/mark-paid (owner only)
export const markBookingPaid = asyncHandler(async (req: AuthRequest, res: Response) => {
  const booking = await Booking.findById(req.params.id).populate('room');

  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  if (booking.paymentMethod !== 'cod') {
    res.status(400).json({ error: 'Only COD bookings can be manually marked as paid' });
    return;
  }

  if (booking.paymentStatus === 'paid') {
    res.status(400).json({ error: 'Booking is already marked as paid' });
    return;
  }

  booking.paymentStatus = 'paid';
  await booking.save();

  res.json({ data: booking });
});
```

```typescript
// backend/src/routes/bookings.ts
import { Router } from 'express';
import { createBooking, markBookingPaid } from '../controllers/bookingController';
import { authMiddleware } from '../middleware/auth';
import { validateResult } from '../middleware/validate-result.middleware';
import { createBookingValidator, bookingIdValidator } from '../validators/booking.validator';

const router = Router();

router.post('/', authMiddleware, createBookingValidator, validateResult, createBooking);
router.patch('/:id/mark-paid', authMiddleware, bookingIdValidator, validateResult, markBookingPaid);

export default router;
```

Notice that COD bookings are immediately set to `status: 'confirmed'` because no online payment step is needed. eSewa bookings stay `pending` until payment is verified. The controller stays clean -- input validation lives in the validator chain, and unhandled errors are caught by `asyncHandler` and forwarded to the global error handler.

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
  const message = `total_amount=${amount},transaction_uuid=${transactionId},product_code=${ESEWA_CONFIG.merchantId}`;

  return {
    amount: amount.toFixed(2),
    tax_amount: '0',
    total_amount: amount.toFixed(2),
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

---

## 26.6 Payment Endpoints: Backend

Now create the routes that the frontend will call. As in Lesson 16, we keep validation, controller logic and the route wiring in separate files. Every response uses the `{ data: ... }` envelope -- there is **no `success` boolean** on the envelope itself; the HTTP status code and a `paymentStatus` field on the booking tell the client what happened.

### Step 1: Validators

```typescript
// backend/src/validators/payment.validator.ts
import { body } from 'express-validator';

export const initiatePaymentValidator = [
  body('bookingId').exists({ checkFalsy: true }).isMongoId().withMessage('Valid booking ID required'),
];

export const verifyPaymentValidator = [
  body('bookingId').exists({ checkFalsy: true }).isMongoId().withMessage('Valid booking ID required'),
];
```

### Step 2: Controller

```typescript
// backend/src/controllers/paymentController.ts
import { Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { Booking } from '../models/Booking';
import { buildPayload, verifyPayment } from '../services/esewa.service';
import type { AuthRequest } from '../types/auth';

// POST /api/payments/initiate
// Returns the eSewa form action URL and the signed payload the frontend
// will auto-submit. Wrapped in { data: { ... } }.
export const initiateEsewaPayment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (booking.paymentMethod !== 'esewa') {
      res.status(400).json({ error: 'This booking does not use eSewa' });
      return;
    }

    if (booking.paymentStatus === 'paid') {
      res.status(400).json({ error: 'This booking is already paid' });
      return;
    }

    // Generate a unique transaction ID and persist it on the booking
    const transactionId = `ESW-${booking._id}-${Date.now()}`;
    booking.transactionId = transactionId;
    await booking.save();

    const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const payload = buildPayload(
      booking.totalPrice,
      transactionId,
      `${clientBaseUrl}/payment/success?bookingId=${booking._id}`,
      `${clientBaseUrl}/payment/failure?bookingId=${booking._id}`
    );

    const paymentUrl =
      process.env.ESEWA_TEST_MODE === 'false'
        ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
        : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

    res.json({ data: { paymentUrl, payload } });
  }
);

// POST /api/payments/verify
// Calls eSewa's status check API. Returns the updated booking so the
// frontend can read `paymentStatus` to decide what to show.
export const verifyEsewaPayment = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (!booking.transactionId) {
      res.status(400).json({ error: 'No transaction found for this booking' });
      return;
    }

    const isVerified = await verifyPayment(
      booking.transactionId,
      booking.totalPrice
    );

    booking.paymentStatus = isVerified ? 'paid' : 'failed';
    if (isVerified) booking.status = 'confirmed';
    await booking.save();

    res.json({ data: booking });
  }
);
```

### Step 3: Route Wiring

```typescript
// backend/src/routes/payments.ts
import { Router } from 'express';
import { initiateEsewaPayment, verifyEsewaPayment } from '../controllers/paymentController';
import { authMiddleware } from '../middleware/auth';
import { validateResult } from '../middleware/validate-result.middleware';
import { initiatePaymentValidator, verifyPaymentValidator } from '../validators/payment.validator';

const router = Router();

router.post('/initiate', authMiddleware, initiatePaymentValidator, validateResult, initiateEsewaPayment);
router.post('/verify', authMiddleware, verifyPaymentValidator, validateResult, verifyEsewaPayment);

export default router;
```

Register the routes in your main app file:

```typescript
// backend/src/index.ts (add these lines)
import paymentRoutes from './routes/payments';

app.use('/api/payments', paymentRoutes);
```

**Why no `success` field?** A consistent envelope keeps the frontend simple. The HTTP status and the booking's `paymentStatus` (`paid` or `failed`) tell the client everything it needs. This matches the pattern from Lesson 16 where every response is `{ data: ... }` or `{ error: '...' }`.

---

## 26.7 Environment Variables

Add these to your `.env` file. For development, the test credentials work out of the box:

```env
# eSewa Configuration
ESEWA_MERCHANT_ID=EPAYTEST
ESEWA_SECRET_KEY=8gBm/:&EnhH.1/q
ESEWA_TEST_MODE=true

# Frontend URL (for redirect URLs)
CLIENT_URL=http://localhost:5173
```

> **Important:** The values `EPAYTEST` and `8gBm/:&EnhH.1/q` are eSewa's official sandbox credentials. They are publicly documented and safe to use during development. When you go to production, you will replace these with real credentials from your eSewa merchant account.

---

## 26.8 Frontend: The Payment API Service Layer

Following the same pattern as `todoApi` in Lesson 17, we wrap every payment API call in a typed service. The component never calls `fetch` or Axios directly -- it calls `paymentApi.initiateEsewa(...)` or a React Query hook.

### Step 1: Types

```typescript
// webapp/src/types/payment.ts
import type { Booking } from './booking';

export interface EsewaPayload {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
}

export interface InitiateEsewaResponse {
  paymentUrl: string;
  payload: EsewaPayload;
}

export interface VerifyPaymentParams {
  bookingId: string;
}

// The verify endpoint returns the updated booking
export type VerifyPaymentResponse = Booking;
```

### Step 2: The `paymentApi` Service

```typescript
// webapp/src/services/paymentApi.ts
import api from './api';
import type {
  InitiateEsewaResponse,
  VerifyPaymentParams,
  VerifyPaymentResponse,
} from '../types/payment';

export const paymentApi = {
  async initiateEsewa(bookingId: string): Promise<InitiateEsewaResponse> {
    const { data } = await api.post<{ data: InitiateEsewaResponse }>(
      '/payments/initiate',
      { bookingId }
    );
    return data.data;
  },

  async verify(params: VerifyPaymentParams): Promise<VerifyPaymentResponse> {
    const { data } = await api.post<{ data: VerifyPaymentResponse }>(
      '/payments/verify',
      params
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

### Step 4: React Query Mutation Hooks

Following the **one-hook-per-action** pattern from Lesson 17, we create dedicated mutation hooks. Each hook owns its loading state, success/error toast, and cache invalidation.

```typescript
// webapp/src/hooks/usePayments.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { paymentApi } from '../services/paymentApi';
import { bookingKeys } from './useBookings';
import { submitEsewaForm } from '../utils/esewa';
import type { VerifyPaymentParams } from '../types/payment';

export function useInitiateEsewaPayment() {
  return useMutation({
    mutationFn: (bookingId: string) => paymentApi.initiateEsewa(bookingId),
    onSuccess: (data) => {
      // Auto-submit the hidden form -- the page will navigate to eSewa
      submitEsewaForm(data.paymentUrl, data.payload);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to initiate payment');
    },
  });
}

export function useVerifyEsewaPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: VerifyPaymentParams) => paymentApi.verify(params),
    onSuccess: () => {
      toast.success('Payment verified successfully');
      // Bookings will now show paymentStatus: 'paid' -- refresh all booking queries
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Payment verification failed');
    },
  });
}
```

> `bookingKeys` is the query key factory for bookings (defined in `useBookings.ts`, mirroring `todoKeys` from Lesson 17). Invalidating `bookingKeys.all` refetches both the list and detail queries so the new `paymentStatus` is visible everywhere.

---

## 26.9 Frontend: Payment Method Selection with shadcn Form

The payment method is part of the booking form. Following Lesson 12, we use React Hook Form + Zod with shadcn's `Form` and `FormField` components, and wire up `useInitiateEsewaPayment` for the eSewa path.

```tsx
// webapp/src/components/PaymentMethodSelector.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useInitiateEsewaPayment } from '@/hooks/usePayments';

const paymentSchema = z.object({
  paymentMethod: z.enum(['esewa', 'cod']),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentMethodSelectorProps {
  bookingId: string;
  totalPrice: number;
  onCodSelected: () => void;
}

export function PaymentMethodSelector({
  bookingId,
  totalPrice,
  onCodSelected,
}: PaymentMethodSelectorProps) {
  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { paymentMethod: 'esewa' },
  });

  const { mutate: initiateEsewa, isPending } = useInitiateEsewaPayment();

  const onSubmit = (values: PaymentFormData) => {
    if (values.paymentMethod === 'cod') {
      onCodSelected();
      return;
    }
    // eSewa: the hook auto-submits the form to eSewa on success
    initiateEsewa(bookingId);
  };

  const method = form.watch('paymentMethod');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Payment Method</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="esewa" id="esewa" />
                        <FormLabel htmlFor="esewa" className="font-normal">
                          Pay with eSewa (Online)
                        </FormLabel>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cod" id="cod" />
                        <FormLabel htmlFor="cod" className="font-normal">
                          Cash on Delivery
                        </FormLabel>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-sm text-muted-foreground">
              Total: <span className="font-bold">NPR {totalPrice}</span>
            </p>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending
                ? 'Processing...'
                : method === 'esewa'
                  ? 'Pay with eSewa'
                  : 'Confirm COD Booking'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

**What changed compared to a raw `useState` version:**
- The radio is part of a typed schema (`z.enum(['esewa', 'cod'])`) -- TypeScript and runtime validation in one place
- `isPending` from the React Query hook drives the button state -- no manual `setLoading`
- Errors are surfaced as toasts inside `useInitiateEsewaPayment`, so the component does not need its own try/catch
- The component is pure UI -- it never calls `fetch` directly

---

## 26.10 Frontend: Success and Failure Pages

After the user pays (or cancels) on eSewa, they are redirected back to your application. You need pages to handle both outcomes. The Success page calls `useVerifyEsewaPayment()` on mount and reads `paymentStatus` from the returned booking.

### Success Page

```tsx
// webapp/src/pages/PaymentSuccess.tsx
import { useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useVerifyEsewaPayment } from '@/hooks/usePayments';

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const { mutate: verify, data: booking, isPending, isError } = useVerifyEsewaPayment();

  // Fire verification once on mount
  useEffect(() => {
    if (bookingId) verify({ bookingId });
  }, [bookingId, verify]);

  if (isPending) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-lg">Verifying your payment...</p>
      </div>
    );
  }

  const isPaid = booking?.paymentStatus === 'paid';

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isPaid ? 'Payment Successful!' : 'Payment Verification Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPaid ? (
            <div className="space-y-4">
              <p className="text-green-600">
                Your payment has been verified and your booking is confirmed.
              </p>
              <Button className="w-full" asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-red-600">
                {isError
                  ? 'We could not verify your payment. If money was deducted, please contact support.'
                  : 'Payment was not completed. Please try again from your bookings.'}
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/bookings">View Bookings</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Notice:**
- The hook handles the API call, loading state (`isPending`), error state (`isError`), and the toast feedback
- We read `booking.paymentStatus` from the response rather than a `success` boolean -- the backend returns the updated booking, not a flag
- `useEffect` only triggers the mutation once after mount; React Query takes over from there

### Failure Page

```tsx
// webapp/src/pages/PaymentFailure.tsx
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function PaymentFailure() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Payment Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-red-600">
            Your payment was not completed. No money has been charged.
          </p>
          <div className="flex flex-col gap-2">
            <Button className="w-full" asChild>
              <Link to={`/bookings/${bookingId}/pay`}>Try Again</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/bookings">View Bookings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Add Routes

Register these pages in your router:

```tsx
// webapp/src/App.tsx (add to your Routes)
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PaymentFailure } from './pages/PaymentFailure';

// Inside your <Routes>:
<Route path="/payment/success" element={<PaymentSuccess />} />
<Route path="/payment/failure" element={<PaymentFailure />} />
```

---

## 26.11 The Complete eSewa Flow: Step by Step

Let us trace through the entire flow from start to finish:

1. **User clicks "Pay with eSewa"** on the checkout page.
2. **Frontend calls `POST /api/payments/initiate`** with the booking ID.
3. **Backend generates a unique transaction ID** (e.g. `ESW-abc123-1700000000`) and saves it on the booking.
4. **Backend builds the eSewa payload** including the HMAC-SHA256 signature and returns it to the frontend.
5. **Frontend creates a hidden HTML form** with all the payload fields and auto-submits it to `https://rc-epay.esewa.com.np/api/epay/main/v2/form`.
6. **The user's browser navigates to eSewa's website** where they log in and confirm the payment.
7. **eSewa redirects the user back** to either the success URL or the failure URL.
8. **On the success page, the frontend calls `POST /api/payments/verify`** with the booking ID.
9. **Backend calls eSewa's status check API** to confirm the payment is genuinely `COMPLETE`.
10. **If verified, the booking's `paymentStatus` is updated to `'paid'`** and the user sees a confirmation message.

> **Security note:** Step 9 is critical. Never trust the redirect alone. A malicious user could type your success URL directly into their browser without paying. Always verify server-side.

---

## 26.12 eSewa Sandbox Testing

eSewa provides a sandbox environment for testing. Here are the details:

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

On the owner's dashboard, the owner needs a button to mark COD bookings as paid. We follow the same pattern again: a service method, a React Query mutation hook, and a thin component.

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

The component is tiny because all the work -- the API call, loading state, toast, and cache invalidation -- lives inside the hook. The dashboard's booking list will automatically refresh after the mutation succeeds, thanks to `invalidateQueries`.

---

## Practice Exercises

1. **COD flow:** Create a booking with COD payment method. Verify that the booking is created with `paymentStatus: 'pending'`. Then use the mark-paid endpoint to update it to `'paid'`.

2. **eSewa integration:** Set up the eSewa service, payment routes, and frontend components. Use the sandbox credentials to complete a test payment from start to finish.

3. **Error handling:** What happens if the user navigates directly to `/payment/success` without actually paying? Test this scenario and confirm that the verification correctly rejects the attempt.

4. **Payment history:** Add a "Payment Status" badge to the bookings list that shows `Pending`, `Paid`, or `Failed` with appropriate colours (yellow, green, red).

5. **Challenge:** Add a third payment method of your choice (e.g. Khalti, another Nepali payment gateway). Follow the same pattern: build a service, create initiate/verify endpoints, and update the frontend selector.

---

## Key Takeaways

- **COD is simple:** create the booking with `paymentStatus: 'pending'` and provide an endpoint for the owner to mark it as paid.
- **eSewa uses a form-based redirect flow:** your backend generates a signed payload, the frontend submits it as a hidden form, the user pays on eSewa's site, and eSewa redirects back.
- **HMAC-SHA256 signatures** prove that the payment request came from your application and has not been tampered with.
- **Always verify payments server-side.** Never trust a redirect URL alone -- call eSewa's status check API to confirm the payment is genuinely complete.
- **Backend endpoints follow the project pattern:** `validator + validateResult + asyncHandler` keeps controllers clean and consistent with Lesson 16.
- **Every response uses the `{ data: ... }` envelope** -- no ad-hoc `success` booleans. The HTTP status and the booking's `paymentStatus` carry the meaning.
- **The frontend never calls `fetch` directly for payments** -- a typed `paymentApi` service layer wraps every call, and React Query mutation hooks (`useInitiateEsewaPayment`, `useVerifyEsewaPayment`, `useMarkBookingPaid`) handle loading state, toasts, and cache invalidation.
- **The Payment Method selector lives inside a shadcn `Form`** with React Hook Form + Zod, matching the form patterns from Lesson 12.
- **Use sandbox credentials during development.** Switch to production credentials only when you are ready to accept real payments.
- **Keep your secret key secure.** Store it in environment variables, never commit it to version control.

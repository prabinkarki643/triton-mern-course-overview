# Lesson 26: Payment Integration: eSewa & COD

## What You Will Learn
- Understanding different payment methods: online (eSewa) and offline (Cash on Delivery)
- Building a COD payment flow with status tracking
- Integrating eSewa using HMAC-SHA256 signed payloads
- Creating backend endpoints to initiate and verify payments
- Building a frontend payment selection and checkout flow
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

When the user selects COD during checkout, the booking is created with `paymentMethod: 'cod'` and `paymentStatus: 'pending'`:

```typescript
// backend/src/routes/bookings.ts
import { Router, Request, Response } from 'express';
import { Booking } from '../models/Booking';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Create a booking (supports both COD and eSewa)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { roomId, checkIn, checkOut, totalPrice, paymentMethod } = req.body;

    if (!['esewa', 'cod'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

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

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

export default router;
```

Notice that COD bookings are immediately set to `status: 'confirmed'` because no online payment step is needed. eSewa bookings stay `pending` until payment is verified.

### Backend: Mark COD as Paid

The room owner needs an endpoint to mark a COD booking as paid once they collect the cash:

```typescript
// Add to backend/src/routes/bookings.ts

// Owner marks COD booking as paid
router.patch('/:id/mark-paid', authMiddleware, async (req: Request, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('room');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.paymentMethod !== 'cod') {
      return res.status(400).json({ error: 'Only COD bookings can be manually marked as paid' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Booking is already marked as paid' });
    }

    booking.paymentStatus = 'paid';
    await booking.save();

    res.json({ message: 'Payment marked as received', booking });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});
```

That is all the backend needs for COD. It is deliberately simple.

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

Now create the routes that the frontend will call:

```typescript
// backend/src/routes/payments.ts
import { Router, Request, Response } from 'express';
import { Booking } from '../models/Booking';
import { buildPayload, verifyPayment } from '../services/esewa.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Step 1: Initiate eSewa payment
// The frontend calls this to get the form payload
router.post('/initiate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.paymentMethod !== 'esewa') {
      return res.status(400).json({ error: 'This booking does not use eSewa' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'This booking is already paid' });
    }

    // Generate a unique transaction ID
    const transactionId = `ESW-${booking._id}-${Date.now()}`;

    // Save the transaction ID on the booking so we can match it later
    booking.transactionId = transactionId;
    await booking.save();

    // Build the eSewa form payload
    const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const payload = buildPayload(
      booking.totalPrice,
      transactionId,
      `${clientBaseUrl}/payment/success?bookingId=${booking._id}`,
      `${clientBaseUrl}/payment/failure?bookingId=${booking._id}`
    );

    // Return the payload and the eSewa form action URL
    res.json({
      formAction: `${process.env.ESEWA_TEST_MODE === 'false' ? 'https://epay.esewa.com.np' : 'https://rc-epay.esewa.com.np'}/api/epay/main/v2/form`,
      payload,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// Step 2: Verify eSewa payment after redirect
// The frontend calls this when the user lands on the success page
router.post('/verify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.transactionId) {
      return res.status(400).json({ error: 'No transaction found for this booking' });
    }

    // Verify with eSewa's API
    const isVerified = await verifyPayment(
      booking.transactionId,
      booking.totalPrice
    );

    if (isVerified) {
      booking.paymentStatus = 'paid';
      booking.status = 'confirmed';
      await booking.save();

      res.json({ success: true, message: 'Payment verified successfully', booking });
    } else {
      booking.paymentStatus = 'failed';
      await booking.save();

      res.json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

export default router;
```

Register the routes in your main app file:

```typescript
// backend/src/index.ts (add these lines)
import paymentRoutes from './routes/payments';

app.use('/api/payments', paymentRoutes);
```

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

## 26.8 Frontend: Payment Method Selection

Now let us build the checkout component where users choose how to pay:

```tsx
// webapp/src/components/PaymentMethodSelector.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
  const [method, setMethod] = useState<'esewa' | 'cod'>('esewa');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (method === 'cod') {
      onCodSelected();
      return;
    }

    // eSewa flow: get payload from backend, then redirect
    setLoading(true);
    try {
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      // Create a hidden form and submit it to eSewa
      submitToEsewa(data.formAction, data.payload);
    } catch (error) {
      console.error('Payment initiation failed:', error);
      alert('Failed to start payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Payment Method</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={method}
          onValueChange={(value) => setMethod(value as 'esewa' | 'cod')}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="esewa" id="esewa" />
            <Label htmlFor="esewa">Pay with eSewa (Online)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cod" id="cod" />
            <Label htmlFor="cod">Cash on Delivery</Label>
          </div>
        </RadioGroup>

        <div className="pt-2">
          <p className="text-sm text-muted-foreground mb-4">
            Total: <span className="font-bold">NPR {totalPrice}</span>
          </p>
          <Button onClick={handlePayment} disabled={loading} className="w-full">
            {loading
              ? 'Processing...'
              : method === 'esewa'
                ? 'Pay with eSewa'
                : 'Confirm COD Booking'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 26.9 Frontend: Submitting to eSewa

When the backend returns the eSewa payload, we need to create an invisible HTML form and submit it. This redirects the user to eSewa's payment page:

```typescript
// webapp/src/utils/esewa.ts

/**
 * Create a hidden form, populate it with the eSewa payload fields,
 * and submit it. This redirects the user to eSewa's payment page.
 */
export function submitToEsewa(
  formAction: string,
  payload: Record<string, string>
): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = formAction;

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

This function is called from the `PaymentMethodSelector` component. It:
1. Creates an invisible `<form>` element
2. Adds a hidden `<input>` for every field in the payload (amount, signature, transaction ID, etc.)
3. Appends the form to the page and submits it
4. The browser navigates to eSewa's payment page

---

## 26.10 Frontend: Success and Failure Pages

After the user pays (or cancels) on eSewa, they are redirected back to your application. You need pages to handle both outcomes.

### Success Page

```tsx
// webapp/src/pages/PaymentSuccess.tsx
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!bookingId) return;

    const verify = async () => {
      try {
        const response = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId }),
        });
        const data = await response.json();
        setSuccess(data.success);
      } catch (error) {
        console.error('Verification failed:', error);
        setSuccess(false);
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [bookingId]);

  if (verifying) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-lg">Verifying your payment...</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {success ? 'Payment Successful!' : 'Payment Verification Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <p className="text-green-600">
                Your payment has been verified and your booking is confirmed.
              </p>
              <Button className="w-full" render={<Link to="/dashboard" />}>
                Go to Dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-red-600">
                We could not verify your payment. If money was deducted from your
                account, please contact support.
              </p>
              <Button variant="outline" className="w-full" render={<Link to="/bookings" />}>
                View Bookings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

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
            <Button className="w-full" render={<Link to={`/bookings/${bookingId}/pay`} />}>
              Try Again
            </Button>
            <Button variant="outline" className="w-full" render={<Link to="/bookings" />}>
              View Bookings
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

On the owner's dashboard, they need a button to mark COD bookings as paid. Here is a simple component for that:

```tsx
// webapp/src/components/MarkAsPaidButton.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface MarkAsPaidButtonProps {
  bookingId: string;
  onMarkedPaid: () => void;
}

export function MarkAsPaidButton({ bookingId, onMarkedPaid }: MarkAsPaidButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleMarkPaid = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/mark-paid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to mark as paid');
      }

      onMarkedPaid();
    } catch (error) {
      console.error('Failed to mark as paid:', error);
      alert('Could not mark payment as received. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleMarkPaid}
      disabled={loading}
      variant="outline"
      size="sm"
    >
      {loading ? 'Updating...' : 'Mark as Paid'}
    </Button>
  );
}
```

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
- **Use sandbox credentials during development.** Switch to production credentials only when you are ready to accept real payments.
- **Keep your secret key secure.** Store it in environment variables, never commit it to version control.

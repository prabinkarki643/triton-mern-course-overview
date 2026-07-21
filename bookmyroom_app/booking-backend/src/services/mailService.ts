// src/services/mailService.ts
// Matches Lesson 21.1 section 21.1.5. Thin wrapper around the transporter
// plus an XSS-safe OTP email template that both flows share.
import { getMailer } from "../config/mail";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(opts: SendMailOptions): Promise<void> {
  const { transporter, from } = getMailer();
  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    // Nodemailer auto-generates a text fallback if we don't provide one,
    // but supplying our own lands better with strict clients.
    text: opts.text ?? stripHtml(opts.html),
  });
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

export function otpEmail(params: {
  name: string;
  code: string;
  purpose: "password_reset" | "email_verify";
  expiresInMinutes: number;
}): { subject: string; html: string } {
  const heading =
    params.purpose === "password_reset"
      ? "Reset your BookMyRoom password"
      : "Verify your BookMyRoom email";
  const subject =
    params.purpose === "password_reset"
      ? "Your password reset code"
      : "Your email verification code";
  const action =
    params.purpose === "password_reset"
      ? "reset your password"
      : "verify your email address";

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="margin-top:0">${heading}</h2>
      <p>Hi ${escape(params.name)},</p>
      <p>Use the code below to ${action}. It expires in <strong>${params.expiresInMinutes} minutes</strong> and can only be used once.</p>
      <div style="font-size: 32px; letter-spacing: 8px; font-weight: bold; text-align: center; padding: 24px; background: #f6f6f6; border-radius: 8px; margin: 24px 0;">
        ${params.code}
      </div>
      <p style="color:#666; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
  return { subject, html };
}

// Never interpolate raw user input into an HTML email body.
function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// --- Lesson 25: booking notifications ------------------------------------

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface BookingCreatedOwnerParams {
  ownerName: string;
  guestName: string;
  guestEmail: string;
  roomTitle: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  totalPrice: number;
  bookingId: string;
}

export function bookingCreatedOwnerEmail(
  params: BookingCreatedOwnerParams
): { subject: string; html: string } {
  const subject = `New booking request for ${params.roomTitle}`;
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="margin-top:0">You've got a new booking request</h2>
      <p>Hi ${escape(params.ownerName)},</p>
      <p>
        <strong>${escape(params.guestName)}</strong>
        (${escape(params.guestEmail)}) has requested to book
        <strong>${escape(params.roomTitle)}</strong>.
      </p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 6px 0; color:#666;">Check-in</td>
          <td style="padding: 6px 0;">${fmtDate(params.checkIn)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color:#666;">Check-out</td>
          <td style="padding: 6px 0;">${fmtDate(params.checkOut)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color:#666;">Guests</td>
          <td style="padding: 6px 0;">${params.guests}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color:#666;">Total (Rs)</td>
          <td style="padding: 6px 0;"><strong>Rs ${params.totalPrice}</strong></td>
        </tr>
      </table>
      <p>
        Please head to your Owner Portal to review and either confirm or reject
        the request. Booking id: <code>${params.bookingId}</code>.
      </p>
      <p style="color:#666; font-size: 13px;">Payment is Cash on Arrival for now -- Lesson 26 will add eSewa.</p>
    </div>
  `;
  return { subject, html };
}

interface BookingStatusUpdatedGuestParams {
  guestName: string;
  ownerName: string;
  roomTitle: string;
  checkIn: Date;
  checkOut: Date;
  status: "confirmed" | "cancelled";
  bookingId: string;
}

export function bookingStatusUpdatedGuestEmail(
  params: BookingStatusUpdatedGuestParams
): { subject: string; html: string } {
  const isConfirmed = params.status === "confirmed";
  const subject = isConfirmed
    ? `Your booking for ${params.roomTitle} is confirmed`
    : `Your booking for ${params.roomTitle} was cancelled`;
  const heading = isConfirmed
    ? "Your booking is confirmed"
    : "Your booking was cancelled";
  const lede = isConfirmed
    ? `Great news -- ${escape(params.ownerName)} has confirmed your booking. See you soon!`
    : `${escape(params.ownerName)} has cancelled your booking. If this was unexpected, please reach out to them directly.`;

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="margin-top:0">${heading}</h2>
      <p>Hi ${escape(params.guestName)},</p>
      <p>${lede}</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 6px 0; color:#666;">Room</td>
          <td style="padding: 6px 0;">${escape(params.roomTitle)}</td>
        </tr>
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

// --- Lesson 26: payment-received receipts -------------------------------

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
  const isEsewa = params.paymentMethod === "esewa";
  const subject = isEsewa
    ? `Booking confirmed: ${params.roomTitle}`
    : `Payment received for ${params.roomTitle}`;
  const heading = isEsewa
    ? "Your booking is confirmed"
    : "Payment received";
  const introLine = isEsewa
    ? `Your eSewa payment of <strong>Rs ${params.totalPrice}</strong> for <strong>${escape(params.roomTitle)}</strong> went through, and your booking is <strong>confirmed</strong>.`
    : `We've received your payment of <strong>Rs ${params.totalPrice}</strong> for <strong>${escape(params.roomTitle)}</strong>.`;
  const paymentLine = isEsewa
    ? `Transaction id: <code>${escape(params.transactionId ?? "-")}</code>`
    : "Cash received on arrival.";
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="margin-top:0">${heading}</h2>
      <p>Hi ${escape(params.guestName)},</p>
      <p>${introLine}</p>
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
  const subject = `Booking auto-confirmed: ${params.roomTitle} (Rs ${params.totalPrice})`;
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #111;">
      <h2 style="margin-top:0">A guest just paid and the booking is confirmed</h2>
      <p>Hi ${escape(params.ownerName)},</p>
      <p>
        <strong>${escape(params.guestName)}</strong> has paid
        <strong>Rs ${params.totalPrice}</strong> via eSewa for
        <strong>${escape(params.roomTitle)}</strong>. The booking is now
        <strong>confirmed</strong> automatically -- nothing further required
        from you.
      </p>
      <p>Transaction id: <code>${escape(params.transactionId)}</code></p>
      <p style="color:#666; font-size: 13px;">Booking id: <code>${params.bookingId}</code></p>
    </div>
  `;
  return { subject, html };
}

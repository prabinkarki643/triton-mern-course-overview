// src/services/cronService.ts
// Matches Lesson 26 section 26.14. Reclaims abandoned eSewa bookings so
// their dates come free for other guests to book. Only targets eSewa --
// COD bookings' "pending" state is legitimate (owner hasn't reviewed).
import cron from "node-cron";
import Booking from "../models/Booking";

const ABANDON_MINUTES = Number(process.env.ABANDONED_BOOKING_MINUTES) || 30;
const CRON_EXPRESSION = process.env.ABANDONED_BOOKING_CRON || "*/5 * * * *";

async function cancelAbandonedEsewaBookings(): Promise<void> {
  const cutoff = new Date(Date.now() - ABANDON_MINUTES * 60 * 1000);

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
      // Never let the cron throw. If a sweep fails, try again next tick.
      console.error("[cron] cancelAbandonedEsewaBookings failed:", err);
    });
  });
  console.log(
    `[cron] scheduled abandoned-booking sweep (${CRON_EXPRESSION}, window ${ABANDON_MINUTES}m)`
  );
}

// src/hooks/usePayments.ts
// Matches Lesson 26 section 26.8 (Step 4). One hook, one action --
// initiate the eSewa flow and auto-submit the hidden form. From there,
// everything flows back through the backend callback in §26.6.
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { paymentApi } from "@/services/paymentApi";
import { submitEsewaForm } from "@/utils/esewa";

export function useInitiateEsewaPayment() {
  return useMutation({
    mutationFn: (bookingId: string) => paymentApi.initiateEsewa(bookingId),
    onSuccess: (data) => {
      // Auto-submits the hidden form -- the browser navigates to eSewa.
      submitEsewaForm(data.paymentUrl, data.payload);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to initiate payment");
    },
  });
}

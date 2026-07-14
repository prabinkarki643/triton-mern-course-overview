// src/utils/esewa.ts
// Matches Lesson 26 section 26.8 (Submitting to eSewa). Builds a hidden
// HTML form from the eSewa payload and auto-submits it -- the browser
// then navigates to eSewa's checkout page for the guest to pay.
import type { EsewaPayload } from "@/types/payment";

export function submitEsewaForm(
  paymentUrl: string,
  payload: EsewaPayload
): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = paymentUrl;

  (Object.entries(payload) as Array<[string, string]>).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

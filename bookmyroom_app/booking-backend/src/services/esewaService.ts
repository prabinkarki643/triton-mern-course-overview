// src/services/esewaService.ts
// Matches Lesson 26 section 26.5. Sign / build / verify helpers for eSewa's
// form-redirect flow. No knowledge of Express, Mongoose or the callback
// routes -- pure functions used by the payment controller.
import crypto from "crypto";

const ESEWA_CONFIG = {
  merchantId: process.env.ESEWA_MERCHANT_ID || "EPAYTEST",
  secretKey: process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q",
  baseUrl:
    process.env.ESEWA_TEST_MODE === "false"
      ? "https://epay.esewa.com.np"
      : "https://rc-epay.esewa.com.np",
};

// HMAC-SHA256 signature over the canonical field list eSewa expects.
// Proves the payload came from us and hasn't been tampered with.
export function generateSignature(message: string): string {
  return crypto
    .createHmac("sha256", ESEWA_CONFIG.secretKey)
    .update(message)
    .digest("base64");
}

export function esewaFormActionUrl(): string {
  return process.env.ESEWA_TEST_MODE === "false"
    ? "https://epay.esewa.com.np/api/epay/main/v2/form"
    : "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
}

// Assemble the full form payload the frontend will POST to eSewa's page.
// CRITICAL: every value that ends up in the `signed_field_names` list must
// be stringified identically in the signed message and in the form field.
// eSewa recomputes the HMAC over the RECEIVED field strings, so any mismatch
// (e.g. signing "60" but sending "60.00") returns ES104 Invalid signature.
export function buildPayload(
  amount: number,
  transactionId: string,
  successUrl: string,
  failureUrl: string
) {
  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  const totalAmount = amount;
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionId},product_code=${ESEWA_CONFIG.merchantId}`;

  return {
    amount: String(amount),
    tax_amount: "0",
    total_amount: String(totalAmount),
    transaction_uuid: transactionId,
    product_code: ESEWA_CONFIG.merchantId,
    product_service_charge: "0",
    product_delivery_charge: "0",
    success_url: successUrl,
    failure_url: failureUrl,
    signed_field_names: signedFieldNames,
    signature: generateSignature(message),
  };
}

// Server-to-server verify. Called from inside the success callback --
// never trust the redirect alone.
export async function verifyPayment(
  transactionId: string,
  totalAmount: number
): Promise<boolean> {
  try {
    const url = `${ESEWA_CONFIG.baseUrl}/api/epay/transaction/status/?product_code=${ESEWA_CONFIG.merchantId}&total_amount=${totalAmount}&transaction_uuid=${transactionId}`;
    const response = await fetch(url);
    const data = (await response.json()) as { status?: string };
    return data.status === "COMPLETE";
  } catch (error) {
    console.error("eSewa verification failed:", error);
    return false;
  }
}

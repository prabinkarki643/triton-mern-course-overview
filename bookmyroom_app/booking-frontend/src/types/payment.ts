// src/types/payment.ts
// Matches Lesson 26 section 26.8. Frontend types for the eSewa initiate
// call. No verify types -- the backend callback owns verification, the
// frontend never calls /payments/verify.

export interface EsewaPayload {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string; // points at OUR backend
  failure_url: string; // points at OUR backend
  signed_field_names: string;
  signature: string;
}

export interface InitiateEsewaResponse {
  paymentUrl: string;
  payload: EsewaPayload;
}

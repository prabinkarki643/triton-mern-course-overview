// src/services/paymentApi.ts
// Matches Lesson 26 section 26.8. Only one method -- the backend
// callback handles verification, so the frontend never calls
// /payments/verify.
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

// src/services/otpService.ts
// Matches Lesson 21.1 section 21.1.7. Every OTP-related controller calls
// into this service -- no controller writes to OtpToken directly.
import crypto from "crypto";
import { Types } from "mongoose";
import OtpToken, { IOtpToken, OtpPurpose } from "../models/OtpToken";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const OTP_LENGTH = 6;

export function otpTtlMinutes(): number {
  return OTP_TTL_MINUTES;
}

function generateNumericCode(length: number): string {
  // crypto.randomInt is uniform (unlike Math.random) so all codes are equally likely.
  let code = "";
  for (let i = 0; i < length; i++) code += crypto.randomInt(0, 10).toString();
  return code;
}

function hashCode(code: string): string {
  // SHA-256 fits OTPs: high-entropy short-lived secret, verify runs in
  // microseconds so brute force is bound by the attempt counter, not CPU.
  return crypto.createHash("sha256").update(code).digest("hex");
}

// Issue a new OTP: invalidate any prior code for this (user, purpose), then
// return the fresh plaintext so the caller can send it by email. Plaintext
// never leaves the service after this.
export async function issueOtp(
  userId: string | Types.ObjectId,
  purpose: OtpPurpose
): Promise<string> {
  const now = new Date();

  await OtpToken.updateMany(
    { user: userId, purpose, consumedAt: { $exists: false } },
    { $set: { consumedAt: now } }
  );

  const code = generateNumericCode(OTP_LENGTH);
  await OtpToken.create({
    user: userId,
    purpose,
    tokenHash: hashCode(code),
    expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000),
    attempts: 0,
  });

  return code;
}

interface VerifyResult {
  ok: boolean;
  reason?: "not_found" | "expired" | "too_many_attempts" | "mismatch";
}

// Verify + consume. Right code = mark consumed atomically. Wrong code =
// bump attempt counter, and if we hit MAX_ATTEMPTS invalidate the token
// even if the caller keeps guessing.
export async function verifyOtp(
  userId: string | Types.ObjectId,
  purpose: OtpPurpose,
  code: string
): Promise<VerifyResult> {
  const now = new Date();
  const token: IOtpToken | null = await OtpToken.findOne({
    user: userId,
    purpose,
    consumedAt: { $exists: false },
  }).sort({ createdAt: -1 });

  if (!token) return { ok: false, reason: "not_found" };
  if (token.expiresAt < now) return { ok: false, reason: "expired" };
  if (token.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  if (token.tokenHash !== hashCode(code)) {
    token.attempts += 1;
    if (token.attempts >= MAX_ATTEMPTS) token.consumedAt = now;
    await token.save();
    return { ok: false, reason: "mismatch" };
  }

  token.consumedAt = now;
  await token.save();
  return { ok: true };
}

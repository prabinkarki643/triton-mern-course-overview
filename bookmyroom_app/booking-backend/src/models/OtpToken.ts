// src/models/OtpToken.ts
// Matches Lesson 21.1 section 21.1.6. Separate collection (not fields on
// User) so purposes are isolated, multiple pending codes are natural, and
// MongoDB can auto-purge expired tokens via a TTL index.
import mongoose, { Schema, Document, Types } from "mongoose";

export type OtpPurpose = "password_reset" | "email_verify";

export interface IOtpToken extends Document {
  user: Types.ObjectId;
  purpose: OtpPurpose;
  tokenHash: string; // SHA-256 hash of the OTP -- never plaintext
  expiresAt: Date;
  consumedAt?: Date;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const otpTokenSchema = new Schema<IOtpToken>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["password_reset", "email_verify"],
      required: true,
    },
    tokenHash: { type: String, required: true },
    // The TTL index below (expireAfterSeconds: 0) already covers this field --
    // adding `index: true` here would create a duplicate.
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: undefined },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// TTL: MongoDB deletes documents as soon as their own expiresAt is in the past.
otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Fast lookup for "any live OTP for this user + purpose?"
otpTokenSchema.index({ user: 1, purpose: 1, consumedAt: 1 });

const OtpToken = mongoose.model<IOtpToken>("OtpToken", otpTokenSchema);
export default OtpToken;

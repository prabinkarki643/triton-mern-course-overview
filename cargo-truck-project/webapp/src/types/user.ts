// src/types/user.ts

// A "transporter" owns trucks and accepts loads.
// A "shipper" has cargo and books trucks.
export type UserRole = "transporter" | "shipper";

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
}

// --- Project lesson 04.1: OTP flows --------------------------------------

// These endpoints return { message } at the top level, not { data }.
export interface MessageResponse {
  message: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailData {
  otp: string;
}

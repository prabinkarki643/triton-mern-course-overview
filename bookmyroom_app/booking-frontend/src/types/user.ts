// booking-frontend/src/types/user.ts

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: "owner" | "user";
  avatar?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
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
  role: "owner" | "user";
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Lesson 21.1 additions ----------------------------------------------------

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

export interface MessageResponse {
  message: string;
}
// src/services/authApi.ts
import api from "./api";
import type {
  LoginData,
  RegisterData,
  AuthResponse,
  User,
  ForgotPasswordData,
  ResetPasswordData,
  ChangePasswordData,
  VerifyEmailData,
  MessageResponse,
} from "@/types/user";

export const authApi = {
  async register(payload: RegisterData): Promise<AuthResponse> {
    const { data } = await api.post<{ data: AuthResponse }>(
      "/auth/register",
      payload
    );
    return data.data;
  },

  async login(payload: LoginData): Promise<AuthResponse> {
    const { data } = await api.post<{ data: AuthResponse }>(
      "/auth/login",
      payload
    );
    return data.data;
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<{ data: User }>("/auth/me");
    return data.data;
  },

  // Lesson 21.1 -- OTP-based recovery + email verification.
  // Note: these endpoints return { message } at the top level, not { data }.
  async forgotPassword(payload: ForgotPasswordData): Promise<MessageResponse> {
    const { data } = await api.post<MessageResponse>(
      "/auth/forgot-password",
      payload
    );
    return data;
  },

  async resetPassword(payload: ResetPasswordData): Promise<MessageResponse> {
    const { data } = await api.post<MessageResponse>(
      "/auth/reset-password",
      payload
    );
    return data;
  },

  async changePassword(payload: ChangePasswordData): Promise<MessageResponse> {
    const { data } = await api.post<MessageResponse>(
      "/auth/change-password",
      payload
    );
    return data;
  },

  async sendEmailVerifyOtp(): Promise<MessageResponse> {
    const { data } = await api.post<MessageResponse>(
      "/auth/send-email-verify-otp",
      {}
    );
    return data;
  },

  async verifyEmail(payload: VerifyEmailData): Promise<MessageResponse> {
    const { data } = await api.post<MessageResponse>(
      "/auth/verify-email",
      payload
    );
    return data;
  },
};

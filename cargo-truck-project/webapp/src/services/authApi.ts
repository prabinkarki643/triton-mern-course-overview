// src/services/authApi.ts
// The backend wraps successful responses in { data: ... }, so each call
// unwraps one level before returning.
import api from "./api";
import type {
  AuthResponse,
  ChangePasswordData,
  ForgotPasswordData,
  LoginData,
  MessageResponse,
  RegisterData,
  ResetPasswordData,
  User,
  VerifyEmailData,
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

  // --- Project lesson 04.1 ------------------------------------------------
  // These five return { message } at the top level, so there is no
  // envelope to unwrap.

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
      "/auth/send-email-verify-otp"
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

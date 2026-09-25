// src/services/authApi.ts
// The backend wraps successful responses in { data: ... }, so each call
// unwraps one level before returning.
import api from "./api";
import type { AuthResponse, LoginData, RegisterData, User } from "@/types/user";

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
};

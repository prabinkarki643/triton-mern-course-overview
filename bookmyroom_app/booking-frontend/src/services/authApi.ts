// src/services/authApi.ts
import api from "./api";
import type {
  LoginData,
  RegisterData,
  AuthResponse,
  User,
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
};

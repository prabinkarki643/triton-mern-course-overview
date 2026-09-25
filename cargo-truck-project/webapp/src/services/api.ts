// src/services/api.ts
import axios from "axios";
import { getToken, removeToken } from "@/lib/auth";

export const API_URL: string =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Attach the JWT to every request, if we have one.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired tokens, and surface the server's message as error.message.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // typeof window guard: this module can be imported on the server.
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const onAuthPage =
        window.location.pathname === "/login" ||
        window.location.pathname === "/register";
      if (!onAuthPage) {
        removeToken();
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    // Prefer the first field error from the backend's validateResult.
    const firstFieldError = error.response?.data?.errors?.[0]?.message;
    if (firstFieldError) {
      error.message = firstFieldError;
      return Promise.reject(error);
    }

    const serverMessage = error.response?.data?.message;
    if (serverMessage) {
      error.message = serverMessage;
    }

    return Promise.reject(error);
  }
);

export default api;

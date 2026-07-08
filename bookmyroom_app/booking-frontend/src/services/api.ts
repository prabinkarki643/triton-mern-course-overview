// src/services/api.ts
import axios from "axios";

// Exported so image URLs can be built off the same base (see EditRoom / RoomCard).
export const API_URL: string =
  import.meta.env.VITE_API_URL || "http://localhost:4001/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Request interceptor -- attach the JWT to every request if we have one
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor -- handle expired tokens + surface server messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the token expired and we're not already on an auth page, force a logout
    if (error.response?.status === 401) {
      const onAuthPage =
        window.location.pathname === "/login" ||
        window.location.pathname === "/register";
      if (!onAuthPage) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    // Pull the friendly message from the server's { message: "..." } envelope
    // so error.message shows "Invalid email or password" instead of
    // "Request failed with status code 401" everywhere in the app.
    const serverMessage = error.response?.data?.message;
    if (serverMessage) {
      error.message = serverMessage;
    }

    return Promise.reject(error);
  }
);

export default api;

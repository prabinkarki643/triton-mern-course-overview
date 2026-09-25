// src/lib/auth.ts
// Every read/write of the auth token goes through this file, so there is
// exactly one place to change how it is stored.
import Cookies from "js-cookie";

export const TOKEN_KEY = "token";

export function setToken(token: string): void {
  Cookies.set(TOKEN_KEY, token, {
    expires: 7, // days -- matches the backend's JWT expiresIn: "7d"
    path: "/", // available on every route
    sameSite: "lax", // sent on navigation, blocked on cross-site POSTs
    secure: process.env.NODE_ENV === "production", // localhost is plain HTTP
  });
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function removeToken(): void {
  // The same path as set() -- without it the cookie is not removed.
  Cookies.remove(TOKEN_KEY, { path: "/" });
}

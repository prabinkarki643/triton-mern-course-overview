// booking-frontend/src/types/user.ts

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: "owner" | "user";
  avatar?: string;
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
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

// src/hooks/useAuth.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/services/authApi";
import { getToken, removeToken, setToken } from "@/lib/auth";
import type {
  ChangePasswordData,
  ForgotPasswordData,
  LoginData,
  RegisterData,
  ResetPasswordData,
  User,
  VerifyEmailData,
} from "@/types/user";

// Centralised query keys for everything auth-related
export const authKeys = {
  all: ["auth"] as const,
  user: () => [...authKeys.all, "user"] as const,
};

// Where each role lands after logging in.
function homeFor(user: User): string {
  return user.role === "transporter" ? "/dashboard" : "/";
}

// Fetch the current user. Only fires if a token cookie exists.
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: () => authApi.getMe(),
    enabled: !!getToken(),
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: LoginData) => authApi.login(payload),
    onSuccess: (data) => {
      setToken(data.token);
      queryClient.setQueryData<User>(authKeys.user(), data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      router.push(homeFor(data.user));
      // Server Components still hold the pre-login cookie -- refresh them.
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Login failed");
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: RegisterData) => authApi.register(payload),
    onSuccess: (data) => {
      setToken(data.token);
      queryClient.setQueryData<User>(authKeys.user(), data.user);
      toast.success(`Welcome, ${data.user.name}!`);
      router.push(homeFor(data.user));
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Registration failed");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return () => {
    removeToken();
    queryClient.clear();
    toast.success("Logged out");
    router.push("/login");
    router.refresh();
  };
}

// --- Project lesson 04.1: OTP flows --------------------------------------
// Each of these shows the server's own message, so the wording lives in one
// place (the controller) rather than being duplicated on the client.

export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordData) =>
      authApi.forgotPassword(payload),
    onSuccess: (data) => toast.success(data.message),
    onError: (error: Error) =>
      toast.error(error.message || "Failed to send reset code"),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (payload: ResetPasswordData) => authApi.resetPassword(payload),
    onSuccess: (data) => toast.success(data.message),
    onError: (error: Error) =>
      toast.error(error.message || "Failed to reset password"),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordData) =>
      authApi.changePassword(payload),
    onSuccess: (data) => toast.success(data.message),
    onError: (error: Error) =>
      toast.error(error.message || "Failed to change password"),
  });
}

export function useSendEmailVerifyOtp() {
  return useMutation({
    mutationFn: () => authApi.sendEmailVerifyOtp(),
    onSuccess: (data) => toast.success(data.message),
    onError: (error: Error) =>
      toast.error(error.message || "Failed to send verification code"),
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VerifyEmailData) => authApi.verifyEmail(payload),
    onSuccess: (data) => {
      toast.success(data.message);
      // emailVerified just changed -- refetch so every badge updates.
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to verify email"),
  });
}

// src/hooks/useAuth.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/services/authApi";
import { getToken, removeToken, setToken } from "@/lib/auth";
import type { LoginData, RegisterData, User } from "@/types/user";

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

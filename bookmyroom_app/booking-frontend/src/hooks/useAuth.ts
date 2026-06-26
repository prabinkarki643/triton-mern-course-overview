// src/hooks/useAuth.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authApi } from "@/services/authApi";
import type { LoginData, RegisterData, User } from "@/types/user";

// Centralised query keys for everything auth-related
export const authKeys = {
  all: ["auth"] as const,
  user: () => [...authKeys.all, "user"] as const,
};

// Fetch the current user. Auto-fires on mount if a token exists.
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: () => authApi.getMe(),
    enabled: !!localStorage.getItem("token"),
    retry: false,
  });
}

// Log in a user. On success: store token, seed the cache, toast, redirect.
export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: LoginData) => authApi.login(payload),
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      queryClient.setQueryData<User>(authKeys.user(), data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(data.user.role === "owner" ? "/owner/dashboard" : "/");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Login failed");
    },
  });
}

// Register a new user. Same flow as login -- log them straight in.
export function useRegister() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: RegisterData) => authApi.register(payload),
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      queryClient.setQueryData<User>(authKeys.user(), data.user);
      toast.success(`Welcome to BookMyRoom, ${data.user.name}!`);
      navigate(data.user.role === "owner" ? "/owner/dashboard" : "/");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Registration failed");
    },
  });
}

// Log out -- clear token, clear cache, toast, redirect.
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return () => {
    localStorage.removeItem("token");
    queryClient.setQueryData(authKeys.user(), null);
    queryClient.clear();
    toast.success("Logged out");
    navigate("/login");
  };
}

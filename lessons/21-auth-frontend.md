# Lesson 21: Authentication Frontend

## What You Will Learn
- Building an AuthContext to manage authentication state across the app
- Storing and retrieving JWT tokens from localStorage
- Configuring Axios interceptors to auto-attach auth headers
- Building login and register forms with React Hook Form and Zod
- Creating a ProtectedRoute component for route guarding
- Role-based route protection (owner-only pages)
- Updating the Navbar based on authentication state
- Programmatic navigation after login and logout

---

## 21.1 The Big Picture

In the previous lesson, we built the auth API. Now we need the frontend to:

1. **Register** -- send name, email, password, phone, and role to the API
2. **Login** -- send email and password, receive a JWT token
3. **Store the token** -- save it in localStorage so it persists across page refreshes
4. **Send the token** -- automatically attach it to every API request
5. **Protect routes** -- redirect unauthenticated users to the login page
6. **Control access** -- only show owner features to owners

```
┌─────────────────────────────────────────────────────────────┐
│                        App                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  AuthProvider                         │   │
│  │  ┌─────────┐  ┌──────────┐  ┌────────────────────┐  │   │
│  │  │  user   │  │  token   │  │  login / register  │  │   │
│  │  │  state  │  │  state   │  │  logout functions  │  │   │
│  │  └─────────┘  └──────────┘  └────────────────────┘  │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────────┐  │   │
│  │  │              BrowserRouter                       │  │   │
│  │  │  ┌──────────┐  ┌─────────────┐  ┌───────────┐  │  │   │
│  │  │  │  Public   │  │  Protected  │  │  Owner    │  │  │   │
│  │  │  │  Routes   │  │  Routes     │  │  Routes   │  │  │   │
│  │  │  └──────────┘  └─────────────┘  └───────────┘  │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 21.2 Setting Up Axios

Instead of using the Fetch API directly, we will use **Axios** -- a popular HTTP client that makes it easier to attach headers, handle errors, and work with interceptors.

### Creating the Axios Instance

```ts
// src/api/axios.ts
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

const API_URL: string = import.meta.env.VITE_API_URL as string || "http://localhost:3001/api";

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor -- automatically attach the auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token: string | null = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);

// Response interceptor -- handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid -- clear stored data
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Redirect to login (only if not already on login page)
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### What Are Interceptors?

Think of interceptors as **checkpoints** that every request and response passes through:

```
Your code calls: api.get("/rooms")
         │
         ▼
  Request Interceptor
  "Let me add the auth token to the headers"
         │
         ▼
  Actual HTTP Request → Server
         │
         ▼
  Response Interceptor
  "Was it a 401? If so, redirect to login"
         │
         ▼
  Your code receives the response
```

**Why this approach?** Without interceptors, you would need to manually add the `Authorization` header to every single API call. With an interceptor, you write it once and it applies everywhere.

---

## 21.3 The AuthContext

The AuthContext manages all authentication state and provides login/register/logout functions to every component in the app.

### Type Definitions

```ts
// src/types/user.ts (should already exist from Lesson 19)

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
```

### Building the Context

```tsx
// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import api from "../api/axios";
import type { User, LoginData, RegisterData, AuthResponse } from "../types/user";

// Define the shape of the context
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

// Create the context with null as default
const AuthContext = createContext<AuthContextType | null>(null);

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Props for the provider
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load the current user when the app starts (if a token exists)
  const loadUser = useCallback(async (): Promise<void> => {
    const storedToken: string | null = localStorage.getItem("token");

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get<User>("/auth/me");
      setUser(response.data);
      setToken(storedToken);
    } catch (error: unknown) {
      // Token is invalid or expired -- clean up
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Login function
  const login = async (data: LoginData): Promise<void> => {
    const response = await api.post<AuthResponse>("/auth/login", data);
    const { token: newToken, user: newUser } = response.data;

    // Store in localStorage
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));

    // Update state
    setToken(newToken);
    setUser(newUser);
  };

  // Register function
  const register = async (data: RegisterData): Promise<void> => {
    const response = await api.post<AuthResponse>("/auth/register", data);
    const { token: newToken, user: newUser } = response.data;

    // Store in localStorage
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));

    // Update state
    setToken(newToken);
    setUser(newUser);
  };

  // Logout function
  const logout = (): void => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Key Design Decisions

**Why `isLoading`?** When the app first loads, we need to check if there is a stored token and if it is still valid. During this check, we do not know if the user is logged in or not. Without `isLoading`, protected routes would briefly flash the login page before redirecting to the dashboard.

**Why store in both `localStorage` and state?**
- `localStorage` persists across page refreshes and browser tabs
- React state triggers re-renders when it changes (localStorage does not)
- We need both: persistence AND reactivity

**Why `!!user && !!token` for `isAuthenticated`?** The double exclamation mark `!!` converts any value to a boolean. `!!null` is `false`, `!!"some-string"` is `true`. Both user and token must exist for the user to be considered authenticated.

---

## 21.4 Wiring Up the Provider

Add the AuthProvider to your app, wrapping it around the router:

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

**Order matters:**
1. `BrowserRouter` -- provides routing context
2. `AuthProvider` -- provides auth context (needs to be inside BrowserRouter so it can use navigation)
3. `App` -- uses both routing and auth

---

## 21.5 Login Page

Build a login form using React Hook Form and Zod, connected to the auth API.

### Zod Schema

```ts
// src/schemas/authSchemas.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be under 50 characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
  phone: z
    .string()
    .min(7, "Phone number must be at least 7 digits"),
  role: z.enum(["owner", "user"], {
    errorMap: () => ({ message: "Please select a role" }),
  }),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
```

### Login Page Component

```tsx
// src/pages/LoginPage.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginSchema, type LoginFormData } from "../schemas/authSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    try {
      setServerError(null);
      setIsSubmitting(true);
      await login(data);
      navigate("/", { replace: true });
    } catch (error: unknown) {
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        setServerError(
          axiosError.response?.data?.message || "Login failed. Please try again."
        );
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {serverError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                className={cn(
                  errors.email && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register("password")}
                className={cn(
                  errors.password && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : "Login"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Do not have an account?{" "}
              <Link to="/register" className="text-primary hover:underline">
                Register here
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
```

### What Happens on Submit

```
1. User fills in email and password
2. Zod validates the form data (client-side)
3. If valid, onSubmit() runs
4. login(data) calls POST /api/auth/login via the AuthContext
5. AuthContext stores the token in localStorage and updates state
6. navigate("/", { replace: true }) redirects to home
7. The Navbar re-renders to show the logged-in state
```

**Why `replace: true`?** After logging in, you do not want the user to press "back" and see the login page again. `replace: true` removes the login page from browser history.

---

## 21.6 Register Page

The register page includes a role selection (Owner or User):

```tsx
// src/pages/RegisterPage.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { registerSchema, type RegisterFormData } from "../schemas/authSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function RegisterPage(): JSX.Element {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "user",
    },
  });

  const selectedRole: "owner" | "user" = watch("role");

  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    try {
      setServerError(null);
      setIsSubmitting(true);
      await registerUser(data);
      navigate("/", { replace: true });
    } catch (error: unknown) {
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        setServerError(
          axiosError.response?.data?.message || "Registration failed. Please try again."
        );
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            Join BookMyRoom as a room owner or a customer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {serverError}
              </div>
            )}

            {/* Role Selection */}
            <div className="space-y-2">
              <Label>I want to</Label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={cn(
                    "flex items-center justify-center p-3 rounded-md border-2 cursor-pointer transition-colors",
                    selectedRole === "user"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <input
                    type="radio"
                    value="user"
                    {...register("role")}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">Book Rooms</span>
                </label>
                <label
                  className={cn(
                    "flex items-center justify-center p-3 rounded-md border-2 cursor-pointer transition-colors",
                    selectedRole === "owner"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <input
                    type="radio"
                    value="owner"
                    {...register("role")}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">List Rooms</span>
                </label>
              </div>
              {errors.role && (
                <p className="text-sm text-destructive">{errors.role.message}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Smith"
                {...register("name")}
                className={cn(
                  errors.name && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                className={cn(
                  errors.email && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="07700900001"
                {...register("phone")}
                className={cn(
                  errors.phone && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                {...register("password")}
                className={cn(
                  errors.password && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create Account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Login here
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default RegisterPage;
```

### Understanding the Role Selection

The role selection uses styled radio buttons hidden with `sr-only` (screen-reader only). The visual appearance is controlled by the `label` wrapper:

```tsx
// The radio input is visually hidden but still accessible
<input type="radio" value="user" {...register("role")} className="sr-only" />

// The label provides the visual UI
<label className={selectedRole === "user" ? "border-primary" : "border-muted"}>
  <span>Book Rooms</span>
</label>
```

The `watch("role")` hook from React Hook Form gives us the current value of the role field in real time, so the styling updates immediately when the user clicks a different option.

---

## 21.7 Protected Route Component

A `ProtectedRoute` component wraps around any route that requires authentication:

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: JSX.Element;
  requiredRole?: "owner" | "user";
}

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Still checking if the user is logged in
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Not logged in -- redirect to login
  if (!isAuthenticated) {
    // Save the page they were trying to visit so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but wrong role -- redirect to home
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // All checks passed -- render the page
  return children;
}

export default ProtectedRoute;
```

### How It Works

```
User visits /dashboard (protected, owner-only)
  │
  ▼
Is auth still loading? → Yes → Show loading spinner
  │
  No
  │
  ▼
Is user authenticated? → No → Redirect to /login
  │
  Yes
  │
  ▼
Is requiredRole set? → Yes → Does user.role match? → No → Redirect to /
  │                                                    │
  No                                                  Yes
  │                                                    │
  ▼                                                    ▼
Render the children (the actual page component)
```

### Why `state={{ from: location }}`?

This saves the URL the user was trying to visit. After they log in, you can redirect them back to where they were going instead of always sending them to the home page. You would read it like this:

```tsx
// In LoginPage, after successful login:
const location = useLocation();
const from = (location.state as { from?: Location })?.from?.pathname || "/";
navigate(from, { replace: true });
```

---

## 21.8 Setting Up Routes with Protection

Update `App.tsx` to use the ProtectedRoute component:

```tsx
// src/App.tsx
import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RoomListPage from "./pages/RoomListPage";
import RoomDetailPage from "./pages/RoomDetailPage";
import DashboardPage from "./pages/DashboardPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import NotFoundPage from "./pages/NotFoundPage";

function App(): JSX.Element {
  return (
    <Routes>
      {/* Public routes with main layout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/rooms" element={<RoomListPage />} />
        <Route path="/rooms/:id" element={<RoomDetailPage />} />

        {/* Protected routes -- any logged-in user */}
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute>
              <MyBookingsPage />
            </ProtectedRoute>
          }
        />

        {/* Owner-only routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="owner">
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Auth routes with auth layout (no navbar) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
    </Routes>
  );
}

export default App;
```

### The Auth Layout

A simpler layout for login and register pages -- just a centred container, no navbar:

```tsx
// src/layouts/AuthLayout.tsx
import { Outlet } from "react-router-dom";

function AuthLayout(): JSX.Element {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}

export default AuthLayout;
```

---

## 21.9 Navbar with Auth State

Update the Navbar to show different items based on whether the user is logged in:

```tsx
// src/components/Navbar.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";

function Navbar(): JSX.Element {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <NavLink to="/" className="text-xl font-bold text-primary">
          BookMyRoom
        </NavLink>

        {/* Navigation Links */}
        <div className="flex items-center gap-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/rooms"
            className={({ isActive }) =>
              isActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            Rooms
          </NavLink>

          {/* Show owner dashboard link only for owners */}
          {isAuthenticated && user?.role === "owner" && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground transition-colors"
              }
            >
              Dashboard
            </NavLink>
          )}

          {/* Show bookings link only for logged-in users */}
          {isAuthenticated && (
            <NavLink
              to="/my-bookings"
              className={({ isActive }) =>
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground transition-colors"
              }
            >
              My Bookings
            </NavLink>
          )}

          {/* Auth buttons */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {user?.name}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                Login
              </Button>
              <Button size="sm" onClick={() => navigate("/register")}>
                Register
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
```

### What the Navbar Shows

| State | Left Side | Right Side |
|-------|-----------|------------|
| Not logged in | Home, Rooms | Login, Register buttons |
| Logged in (user) | Home, Rooms, My Bookings | Name + Logout button |
| Logged in (owner) | Home, Rooms, Dashboard, My Bookings | Name + Logout button |

The key pattern is **conditional rendering** with `&&`:

```tsx
{isAuthenticated && user?.role === "owner" && (
  <NavLink to="/dashboard">Dashboard</NavLink>
)}
```

This reads as: "If the user is authenticated AND their role is owner, then show the Dashboard link."

---

## 21.10 Complete File Summary

```
booking-frontend/
├── src/
│   ├── api/
│   │   └── axios.ts                # Axios instance with interceptors
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── Navbar.tsx              # Auth-aware navigation
│   │   └── ProtectedRoute.tsx      # Route guard component
│   ├── context/
│   │   └── AuthContext.tsx          # Auth state management
│   ├── layouts/
│   │   ├── MainLayout.tsx          # Navbar + Outlet + Footer
│   │   └── AuthLayout.tsx          # Centred card layout
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── AboutPage.tsx
│   │   ├── LoginPage.tsx           # Login form with RHF + Zod
│   │   ├── RegisterPage.tsx        # Register form with role selection
│   │   ├── RoomListPage.tsx        # (placeholder for now)
│   │   ├── RoomDetailPage.tsx      # (placeholder for now)
│   │   ├── DashboardPage.tsx       # Owner-only (placeholder)
│   │   ├── MyBookingsPage.tsx      # Auth-required (placeholder)
│   │   └── NotFoundPage.tsx
│   ├── schemas/
│   │   └── authSchemas.ts          # Login + Register Zod schemas
│   ├── types/
│   │   ├── user.ts                 # User, LoginData, RegisterData
│   │   ├── room.ts
│   │   └── booking.ts
│   ├── App.tsx                     # Routes with protection
│   ├── main.tsx                    # BrowserRouter + AuthProvider
│   └── index.css
├── .env
└── package.json
```

---

## Practice Exercises

### Exercise 1: Build the Auth Context
1. Create the Axios instance with request and response interceptors
2. Create the `AuthContext` with `login`, `register`, `logout`, and `loadUser`
3. Add the `AuthProvider` to `main.tsx` (inside `BrowserRouter`)
4. Create a simple test component that displays `useAuth().isAuthenticated`
5. Verify that the context provides the correct initial state (not authenticated, loading true then false)

### Exercise 2: Build the Login Flow
1. Create the login Zod schema
2. Build the `LoginPage` with React Hook Form
3. Test with valid credentials -- verify you are redirected to the home page
4. Test with invalid credentials -- verify the server error message appears
5. Test with empty fields -- verify the Zod validation messages appear
6. Refresh the page after logging in -- verify you stay logged in (token persists in localStorage)

### Exercise 3: Build the Register Flow
1. Create the register Zod schema with role enum
2. Build the `RegisterPage` with the role selection radio buttons
3. Test registering as a "user" -- verify the correct role is saved
4. Test registering as an "owner" -- verify the correct role is saved
5. Test registering with an existing email -- verify the error message
6. After registering, verify you are automatically logged in and redirected

### Exercise 4: Complete the Auth Flow
1. Create the `ProtectedRoute` component
2. Add protected routes to `App.tsx` (My Bookings for any user, Dashboard for owners)
3. Build the auth-aware `Navbar` with conditional links and buttons
4. Test the full flow:
   - Visit `/dashboard` while logged out -- should redirect to `/login`
   - Login as a user -- should not see "Dashboard" in the navbar
   - Login as an owner -- should see "Dashboard" in the navbar
   - Click "Logout" -- should clear the token and redirect to `/login`
   - Verify the navbar updates immediately after login and logout

---

## Key Takeaways
1. **AuthContext** centralises auth state (user, token, login, register, logout) for the entire app
2. **Axios interceptors** automatically attach the JWT token to every request -- write once, works everywhere
3. **localStorage** persists the token across page refreshes; React state triggers re-renders
4. **`isLoading`** prevents the flash of login page while checking the stored token on app start
5. **React Hook Form + Zod** handles form validation on the frontend; the backend also validates with Zod
6. **`ProtectedRoute`** checks authentication and role before rendering the child component
7. **`Navigate` with `replace`** redirects users without adding entries to browser history
8. **Conditional rendering** (`isAuthenticated && <Component />`) controls what the user sees in the Navbar
9. **Role-based UI** shows different navigation items to owners and users using `user.role`
10. **Server error handling** catches Axios errors and displays meaningful messages to the user

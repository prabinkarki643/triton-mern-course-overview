# Lesson 21: Authentication Frontend

## What You Will Learn
- Building **React Query auth hooks** (`useCurrentUser`, `useLogin`, `useRegister`, `useLogout`) -- one focused hook per action
- A **query keys factory** for authentication, just like the `todoKeys` pattern from Lesson 17
- Storing and retrieving JWT tokens from localStorage
- Configuring **Axios interceptors** to auto-attach auth headers and handle 401 responses
- Building login and register forms with the **shadcn `Field` component** + React Hook Form + Zod
- **Sonner toast notifications** for success and error feedback (the same pattern as Lesson 17)
- Programmatic navigation with `useNavigate` from inside mutation `onSuccess` callbacks
- Creating a `ProtectedRoute` component for route guarding
- Role-based route protection (owner-only pages)
- Structuring the app with **two layout routes** (MainLayout for the public shell, AuthLayout for login/register)
- Setting up the shadcn **`ThemeProvider`** and pinning `defaultTheme="light"` so the design ships consistently
- Building a Navbar with an **avatar dropdown menu** that reacts to auth state without any props or context

---

## 21.1 The Big Picture

In the previous lesson, we built the auth API. Now we need the frontend to:

1. **Register** -- send name, email, password, phone, and role to the API
2. **Login** -- send email and password, receive a JWT token
3. **Store the token** -- save it in localStorage so it persists across page refreshes
4. **Send the token** -- automatically attach it to every API request
5. **Protect routes** -- redirect unauthenticated users to the login page
6. **Control access** -- only show owner features to owners
7. **Give feedback** -- show a toast whenever login, register, or logout happens

We will use **exactly the same React Query + Sonner pattern** we used for todos in Lesson 17. Authentication is just another piece of server state -- the current user lives in the React Query cache, and login/register/logout are mutations.

```
┌─────────────────────────────────────────────────────────────────┐
│                            App                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              QueryClientProvider + Toaster                  │ │
│  │  ┌─────────────────┐  ┌──────────────────┐                 │ │
│  │  │ useCurrentUser  │  │ useLogin /       │                 │ │
│  │  │ (cached user)   │  │ useRegister /    │                 │ │
│  │  │                 │  │ useLogout        │                 │ │
│  │  └─────────────────┘  └──────────────────┘                 │ │
│  │                                                              │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │                BrowserRouter                          │   │ │
│  │  │  ┌──────────┐  ┌─────────────┐  ┌───────────┐      │   │ │
│  │  │  │ Public    │  │ Protected   │  │ Owner     │      │   │ │
│  │  │  │ Routes    │  │ Routes      │  │ Routes    │      │   │ │
│  │  │  └──────────┘  └─────────────┘  └───────────┘      │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Why no `AuthContext`?

In Lesson 17 we learned that **server state belongs in React Query**, not in a Context. The current user is server state -- it lives on the backend, can be re-fetched, and can become stale.

Instead of building a giant `AuthContext` that does direct HTTP calls and tracks `user`, `token`, `isLoading`, `login`, `register`, and `logout`, we will:

- Cache the current user in React Query under the key `['auth', 'user']`
- Provide a single `useCurrentUser()` hook any component can call
- Provide one mutation hook per action: `useLogin`, `useRegister`, `useLogout`

This is **simpler, more consistent with the rest of the app, and avoids re-render storms** when only one piece of auth state changes. (If you need to share the user object across deeply nested trees, just call `useCurrentUser()` -- React Query gives you the cached value with no extra fetch.)

---

## 21.2 Updating the Axios Instance

You already have an Axios instance from Lesson 17 (`services/api.ts`). Now we extend it with **two interceptors** for authentication, plus a small tweak that makes server error messages reach our toasts:

1. A **request interceptor** that attaches the JWT token to every request
2. A **response interceptor** that
   - Catches 401 (Unauthorized) on protected pages and forces a logout
   - Pulls the friendly `message` field out of error responses so `error.message` is human-readable everywhere

```ts
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor -- attach the auth token if we have one
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor -- handle expired tokens + surface server messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the token expired and we are not on a public auth page, force logout
    if (error.response?.status === 401) {
      const onAuthPage =
        window.location.pathname === '/login' ||
        window.location.pathname === '/register';
      if (!onAuthPage) {
        localStorage.removeItem('token');
        window.location.href = '/login';
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
  },
);

export default api;
```

### Why the Server Message Override?

By default, when the backend responds with `401 { "message": "Invalid email or password" }`, Axios throws an error whose `.message` is the unhelpful `"Request failed with status code 401"`. Every toast in the app would read that.

The override at the bottom of the interceptor copies the server's `message` onto `error.message`, so a single line like `toast.error(error.message)` automatically shows:

| Backend response | Toast text |
|---|---|
| `401 { message: "Invalid email or password" }` | "Invalid email or password" |
| `400 { message: "A user with this email already exists" }` | "A user with this email already exists" |
| `400 { message: "Validation failed", errors: [...] }` | "Validation failed" |
| Network down (no response at all) | "Network Error" (Axios default) |

Doing this once in the interceptor means none of the React Query hooks need their own message-parsing logic -- every `onError: (error) => toast.error(error.message)` just works.

### Why Skip the 401 Redirect on `/login` and `/register`?

A wrong-password attempt returns 401 -- but the user is *trying* to log in, not "their session expired". Redirecting them back to the page they are already on would clear the form and confuse them. The check `onAuthPage` keeps the form visible while still showing the error toast.

### What Are Interceptors?

Think of interceptors as **checkpoints** that every request and response passes through:

```
Your code calls: api.get('/rooms')
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
  "Was it a 401? If so, clear the token and redirect"
         │
         ▼
  Your code receives the response
```

**Why this approach?** Without interceptors, you would need to manually add the `Authorization` header to every single API call. With an interceptor, you write it once and it applies everywhere.

---

## 21.3 Shared Types

Define the types that represent your auth data. These mirror the Mongoose model from the backend:

```ts
// src/types/user.ts

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'user';
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
  role: 'owner' | 'user';
}

export interface AuthResponse {
  token: string;
  user: User;
}
```

---

## 21.4 The `authApi` Service Layer

Just like `todoApi` in Lesson 17, we wrap all auth HTTP calls in a typed service. Our backend responses are wrapped in `{ data: ... }`, so we unwrap once here:

```ts
// src/services/authApi.ts
import api from './api';
import type { User, LoginData, RegisterData, AuthResponse } from '../types/user';

export const authApi = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const { data: response } = await api.post<{ data: AuthResponse }>(
      '/auth/register',
      data,
    );
    return response.data;
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const { data: response } = await api.post<{ data: AuthResponse }>(
      '/auth/login',
      data,
    );
    return response.data;
  },

  async getMe(): Promise<User> {
    const { data: response } = await api.get<{ data: User }>('/auth/me');
    return response.data;
  },
};
```

This service layer has **no React, no state, no toasts** -- it is just typed HTTP. The React Query hooks in the next section consume it.

---

## 21.5 Query Keys Factory for Auth

Following the same pattern as `todoKeys` in Lesson 17, define a centralised object for all auth query keys:

```ts
// src/hooks/useAuth.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '../services/authApi';
import type { User, LoginData, RegisterData } from '../types/user';

// Centralised auth query keys -- one source of truth
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
};
```

```
authKeys.all     =>  ['auth']
authKeys.user()  =>  ['auth', 'user']
```

Invalidating `authKeys.all` will invalidate every auth query -- handy when we add more (e.g. a separate `useMyProfile` query) later.

---

## 21.6 Auth Hooks -- One Hook Per Action

We now write **four focused hooks** -- one per action. Each component subscribes only to what it needs, and each hook owns its own toast and navigation logic.

### `useCurrentUser` -- fetch and cache the logged-in user

This query is **`enabled` only when a token exists**. On app start, if there is a token in localStorage, React Query will automatically call `/auth/me` to fetch the user. If the token is invalid the response interceptor handles the 401 for us.

```ts
// src/hooks/useAuth.ts (continued)

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: () => authApi.getMe(),
    enabled: !!localStorage.getItem('token'),
    retry: false, // don't retry auth checks -- if it fails, the user is logged out
    staleTime: 1000 * 60 * 5, // user data is fresh for 5 minutes
  });
}
```

### `useLogin` -- login mutation

On success: store the token, **seed the React Query cache** with the user (so `useCurrentUser` returns instantly), show a welcome toast, and redirect.

```ts
// src/hooks/useAuth.ts (continued)

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: LoginData) => authApi.login(data),
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      // Seed the cache so useCurrentUser() returns immediately
      queryClient.setQueryData(authKeys.user(), data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(data.user.role === 'owner' ? '/owner/dashboard' : '/');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Login failed');
    },
  });
}
```

### `useRegister` -- register mutation

Mirrors `useLogin`: store the token, seed the cache, toast, and redirect.

```ts
// src/hooks/useAuth.ts (continued)

export function useRegister() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: RegisterData) => authApi.register(data),
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      queryClient.setQueryData(authKeys.user(), data.user);
      toast.success('Account created successfully');
      navigate('/');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Registration failed');
    },
  });
}
```

### `useLogout` -- a plain function, not a mutation

Logout has no API call (JWTs are stateless), so we just clear local state. Returning a function from a hook keeps the call site identical to the mutation hooks (`const logout = useLogout(); logout()`).

```ts
// src/hooks/useAuth.ts (continued)

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return () => {
    localStorage.removeItem('token');
    queryClient.setQueryData(authKeys.user(), null);
    queryClient.clear(); // wipe all caches -- user-specific data must go
    toast.success('Logged out');
    navigate('/login');
  };
}
```

### Why this pattern?

| Old `AuthContext` approach | New React Query hooks |
|----------------------------|----------------------|
| One context value holds `user`, `token`, `login`, `register`, `logout` | One hook per action -- import only what you need |
| Direct HTTP calls inside the provider | HTTP calls live in `authApi`, hooks orchestrate cache + UI |
| Manual `isLoading` flag | React Query gives `isPending` per mutation |
| Components re-render whenever **any** auth state changes | Components re-render only when **their** hook changes |
| Toasts must be added in every page that calls `login` | Toasts live inside the hook -- consistent everywhere |
| Navigation logic scattered across pages | `useNavigate` lives inside the hook |

---

## 21.7 The Theme Provider

When you ran the shadcn init in Lesson 19, it scaffolded a `src/components/theme-provider.tsx` file for you. Open it up -- it is ~220 lines of context provider that lets any component read or change the current theme. It supports three values: `"light"`, `"dark"`, or `"system"` (follows the operating system preference).

You do not need to memorise the internals. Here is what it does for us:

| Feature | What it does |
|---|---|
| `useTheme()` hook | Any child can read `theme` or call `setTheme("dark")` |
| Adds `.light` or `.dark` on `<html>` | Tailwind's dark-mode utilities key off this class |
| Persists to `localStorage` | Refresh the page and your choice sticks |
| Listens to system changes | If theme is `"system"` and the OS flips to dark, the app flips too |
| **`d` keyboard shortcut** | Press `d` anywhere (except inside inputs) to toggle light/dark instantly |

### Why We Pin `defaultTheme="light"`

Our auth pages use rose-and-pink gradients that were designed for a light background. If a student on macOS with system dark mode visits the app, the shadcn default (`"system"`) would flip the whole UI to dark and the gradients would look muddy.

**We pin the default to `light` for this course** so the design looks the way you built it, on every machine, out of the box:

```tsx
<ThemeProvider defaultTheme="light">
  {/* ... */}
</ThemeProvider>
```

> This only changes the **starting** value on a fresh browser. If a user later presses `d` to toggle, or you build a theme switcher, their choice is written to `localStorage` and honoured on the next visit.

The theme-provider is a shadcn asset -- treat it as a black box for now. If you ever want to teach dark mode later, students can build a theme toggle button in ~10 lines using `useTheme()`.

---

## 21.8 Wiring Up the App

The `main.tsx` from Lesson 17 already has `QueryClientProvider` and `<Toaster />`. We need to add three more wrappers around `<App />`:

1. **`BrowserRouter`** -- so our auth hooks can use `useNavigate`
2. **`ThemeProvider defaultTheme="light"`** -- the theme provider we just discussed
3. Confirm **`<Toaster richColors />`** is still mounted so `toast.success()` / `toast.error()` from the auth hooks appear

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "./index.css";
import App from "./App.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          <App />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
```

**Provider order matters:**

1. `BrowserRouter` outermost -- so hooks anywhere in the tree (including inside React Query mutations) can use `useNavigate`
2. `QueryClientProvider` -- so hooks can use React Query
3. `ThemeProvider` -- so components can read the current theme
4. `<Toaster />` at the same level as `<App />` -- mounted once so toasts render on top of every page

**No `AuthProvider`.** Any component that needs the current user just calls `useCurrentUser()`.

---

## 21.9 Login Page

Build a login form using the **shadcn `Field` component** with React Hook Form + Zod, connected via the `useLogin` mutation hook.

### Zod Schema

```ts
// src/schemas/authSchemas.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be under 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(7, 'Phone number must be at least 7 digits'),
  role: z.enum(['owner', 'user'], {
    errorMap: () => ({ message: 'Please select a role' }),
  }),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
```

### Add the shadcn Field component

If you have not already added it, install the `Field` component from shadcn:

```bash
npx shadcn@latest add field
```

This gives us `Field`, `FieldLabel`, `FieldError`, `FieldDescription`, and `FieldGroup` -- composable primitives that handle layout, accessibility, and error display. We pair them with React Hook Form's `Controller` to bind each input to the form state.

> Note: the older shadcn `Form`/`FormField`/`FormItem`/`FormControl`/`FormMessage` wrappers are no longer used in this course. The new `Field` primitives are simpler, more flexible, and work with any input component.

### Login Page Component

```tsx
// src/pages/LoginPage.tsx
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useLogin } from '../hooks/useAuth';
import { loginSchema, type LoginFormData } from '../schemas/authSchemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

function LoginPage(): JSX.Element {
  const { mutate: login, isPending } = useLogin();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginFormData): void => {
    login(data);
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
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FieldGroup>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="password"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Signing in...' : 'Sign in'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Do not have an account?{' '}
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
2. Zod validates the form data (client-side, via the resolver)
3. If valid, onSubmit() runs and calls login(data)
4. The useLogin mutation hits POST /api/auth/login via Axios
5. On success: token saved -> cache seeded -> success toast -> navigate
6. On error:   the hook's onError fires a red error toast
```

**No `try/catch`, no `setServerError`, no manual `setIsSubmitting`.** The hook owns all of that.

### Why the shadcn `Field` component?

| Plain `<Input {...register('email')} />` | shadcn `<Field>` + `Controller` |
|------------------------------------------|---------------------------------|
| Manual `<Label htmlFor>` linking | `FieldLabel htmlFor={field.name}` -- explicit and obvious |
| Manual `errors.email && <p>...</p>` | `<FieldError errors={[fieldState.error]} />` -- styled and accessible |
| Manual `aria-invalid` plumbing | `data-invalid` on `Field` + `aria-invalid` on the input |
| Hard to keep styles consistent | `FieldGroup` provides consistent vertical spacing |

We use this **same `Field` + `Controller` pattern in every form across the app** from this lesson onwards.

---

## 21.10 Register Page

The register page uses the same `Field` + `Controller` pattern plus a shadcn `Select` for choosing the role. If you have not added the `Select` component yet, install it now:

```bash
npx shadcn@latest add select
```

```tsx
// src/pages/RegisterPage.tsx
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useRegister } from '../hooks/useAuth';
import { registerSchema, type RegisterFormData } from '../schemas/authSchemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

function RegisterPage(): JSX.Element {
  const { mutate: registerUser, isPending } = useRegister();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'user',
    },
  });

  const onSubmit = (data: RegisterFormData): void => {
    registerUser(data);
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
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FieldGroup>
              {/* Role Selection */}
              <Controller
                name="role"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>I want to</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">
                          Book rooms (Guest)
                        </SelectItem>
                        <SelectItem value="owner">
                          List my room (Owner)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      You can change this later in your profile.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      placeholder="John Smith"
                      autoComplete="name"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="phone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Phone Number</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="tel"
                      placeholder="07700900001"
                      autoComplete="tel"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="password"
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Creating account...' : 'Create Account'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
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

The role field uses a shadcn `Select` dropdown wired to the form through `Controller`. The current value comes from `field.value` and updates flow through `field.onChange` -- no need for `watch()`. A `FieldDescription` sits below the input to give helpful guidance, and `FieldError` renders only when validation fails.

---

## 21.11 Protected Route Component

A `ProtectedRoute` component wraps any route that requires authentication. It uses `useCurrentUser()` so there is only **one source of truth** for who is logged in:

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useAuth';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'owner' | 'user';
}

function ProtectedRoute({
  children,
  requireRole,
}: ProtectedRouteProps): JSX.Element {
  const { data: user, isLoading } = useCurrentUser();
  const location = useLocation();

  // Still checking the stored token
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Not logged in -- redirect to login, remembering where they came from
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but wrong role -- send them home
  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
```

### How It Works

```
User visits /owner/dashboard (owner-only)
  │
  ▼
useCurrentUser() -- is the query loading?  → Yes → Show loading text
  │
  No
  │
  ▼
Is `user` null?  → Yes → Redirect to /login
  │
  No
  │
  ▼
Is `requireRole` set and user.role !== requireRole?  → Yes → Redirect to /
  │
  No
  │
  ▼
Render the children
```

### Why `state={{ from: location }}`?

This saves the URL the user was trying to visit. After they log in, you could redirect them back to where they were going. To use it, read `location.state` inside your login mutation's `onSuccess`:

```ts
// (Advanced) inside useLogin onSuccess:
const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
navigate(from ?? (data.user.role === 'owner' ? '/owner/dashboard' : '/'));
```

---

## 21.12 Setting Up Routes with Two Layouts

Our app has two very different kinds of pages:

- **Main pages** (Home, Owner Dashboard, 404) need the sticky Navbar, footer, etc.
- **Auth pages** (Login, Register) look nothing like the rest -- they are centred cards on a gradient background, and would look wrong under the same Navbar.

React Router lets us solve this with **layout routes**: each `Route` without a `path` acts as a wrapper that renders its own JSX plus `<Outlet />`, and any child routes get placed into that outlet.

### The Two Layouts

Both are tiny components. Each one just picks a wrapping design and drops an `<Outlet />` where child routes should render.

**MainLayout** -- sticky navbar + main content area:

```tsx
// src/layouts/MainLayout.tsx
import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/Navbar";

export function MainLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
```

**AuthLayout** -- centred wrapper with **no** navbar (auth pages have their own gradient card, so the app chrome would fight with it):

```tsx
// src/layouts/AuthLayout.tsx
import { Outlet } from "react-router-dom";

function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full">
        <Outlet />
      </div>
    </div>
  );
}

export default AuthLayout;
```

### The Not Found Page

The `*` catch-all route needs a component too. Keep it simple:

```tsx
// src/pages/NotFoundPage.tsx
import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="mb-4 text-6xl font-bold text-muted-foreground">404</h1>
      <p className="mb-8 text-xl">Page not found</p>
      <Link to="/" className="text-primary underline hover:no-underline">
        Go back home
      </Link>
    </div>
  );
}

export default NotFoundPage;
```

### App.tsx -- Nesting Routes Under Layouts

```tsx
// src/App.tsx
import { Routes, Route } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { OwnerDashboardPage } from "@/pages/OwnerDashboardPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AuthLayout from "./layouts/AuthLayout";
import NotFoundPage from "./pages/NotFoundPage";

export function App() {
  return (
    <Routes>
      {/* Pages that share the sticky Navbar */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />

        {/* Owner-only route */}
        <Route
          path="/owner/dashboard"
          element={
            <ProtectedRoute requireRole="owner">
              <OwnerDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all -- any unknown path lands here */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Auth pages -- no navbar, centred card */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
    </Routes>
  );
}

export default App;
```

**Reading the file, top to bottom:**

| Route | Layout | Access | Component |
|---|---|---|---|
| `/` | MainLayout | Anyone | `HomePage` |
| `/owner/dashboard` | MainLayout | Owner only | `OwnerDashboardPage` (wrapped in `ProtectedRoute`) |
| Anything unmatched | MainLayout | Anyone | `NotFoundPage` |
| `/login` | AuthLayout | Anyone | `LoginPage` |
| `/register` | AuthLayout | Anyone | `RegisterPage` |

> **A note about future lessons:** Right now we only have the Home page and Owner Dashboard. In lessons 24 (`/rooms`, `/rooms/:id`), 25 (`/my-bookings`, `/owner/bookings`), and 27 (`/owner/rooms`), we will keep adding routes to this same `App.tsx`. The two-layout structure stays the same -- we just add more `<Route>` entries inside `MainLayout`.

---

## 21.13 Navbar with Auth State

The Navbar uses `useCurrentUser()` to know who is logged in and `useLogout()` for the logout button. **No props, no context -- just hooks.** When the user logs in or out, every Navbar re-renders automatically.

We install the shadcn `avatar` and `dropdown-menu` components (if you have not already):

```bash
npx shadcn@latest add avatar dropdown-menu
```

Then build the Navbar. The logged-in state shows an avatar with the user's initials that opens a dropdown menu; the logged-out state shows Log in and Sign up buttons.

```tsx
// src/components/Navbar.tsx
import { Link, NavLink } from "react-router-dom";
import { Hotel, LogOut, User as UserIcon, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";

export function Navbar() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  // Extract initials from the name for the avatar fallback: "Ram Bahadur" -> "RB"
  const initials = user
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  // Reusable NavLink styling helper -- active links get the strong colour
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors hover:text-foreground ${
      isActive ? "text-foreground" : "text-muted-foreground"
    }`;

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-sm">
            <Hotel className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            BookMyRoom
          </span>
        </Link>

        {/* Primary nav -- hidden on mobile */}
        <nav className="hidden items-center gap-8 md:flex">
          <NavLink to="/" end className={navLinkClass}>
            Browse Rooms
          </NavLink>
          {user && (
            <NavLink to="/my-bookings" className={navLinkClass}>
              My Bookings
            </NavLink>
          )}
          {user?.role === "owner" && (
            <NavLink to="/owner/dashboard" className={navLinkClass}>
              Owner Portal
            </NavLink>
          )}
        </nav>

        {/* Auth area */}
        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="hover:bg-muted focus-visible:ring-ring flex items-center gap-2 rounded-full border bg-background py-1 pl-1 pr-3 outline-none transition-colors focus-visible:ring-2">
                <Avatar size="sm">
                  <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-600 text-xs font-medium text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">
                  {user.name}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {user.email}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserIcon className="mr-2 size-4" />
                  Profile
                </DropdownMenuItem>
                {user.role === "owner" && (
                  <DropdownMenuItem asChild>
                    <Link to="/owner/dashboard">
                      <LayoutDashboard className="mr-2 size-4" />
                      Owner Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={logout}>
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link to="/login">Log in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700"
              >
                <Link to="/register">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
```

### What the Navbar Shows

| State | Nav Links | Right Side |
|-------|-----------|------------|
| Not logged in | Browse Rooms | Log in + Sign up (gradient) |
| Logged in (user) | Browse Rooms, My Bookings | Avatar + name → dropdown |
| Logged in (owner) | Browse Rooms, My Bookings, Owner Portal | Avatar + name → dropdown with **Owner Dashboard** menu item |

### Reading the Auth Area

Two important patterns to notice:

**1. `Button asChild` with `<Link>`** — the shadcn Button component supports `asChild` (via Radix Slot). When we pass a `<Link>` as its child, the Link element gets the Button's styling **but stays a real React Router link** with its own `to` behaviour. No `onClick={() => navigate("/login")}` shim needed.

```tsx
<Button asChild variant="ghost">
  <Link to="/login">Log in</Link>
</Button>
```

**2. Role-conditional dropdown item** — the "Owner Dashboard" menu item only renders when the user is an owner. Guests never see it in their menu.

```tsx
{user.role === "owner" && (
  <DropdownMenuItem asChild>
    <Link to="/owner/dashboard">
      <LayoutDashboard className="mr-2 size-4" />
      Owner Dashboard
    </Link>
  </DropdownMenuItem>
)}
```

### How the Navbar Reacts to Auth Changes

You never wire the Navbar to any store, event, or context. All the reactivity comes from `useCurrentUser()`:

- **User logs in** → `useLogin.onSuccess` seeds the cache with `queryClient.setQueryData(authKeys.user(), data.user)`
- Every component reading `useCurrentUser()` re-renders → Navbar swaps from Log in / Sign up buttons to avatar dropdown, in one frame
- **User logs out** → `useLogout` writes `null` to the same cache key → Navbar flips back the other way

No prop drilling, no manual subscription, no `<AuthProvider>`. This is the whole point of putting auth in React Query.

---

## 21.14 Complete File Summary

By the end of Lesson 21, your `booking-frontend/src` folder should look like this. Files marked **NEW** were created in this lesson; the rest were carried in from Lesson 19 or the shadcn init.

```
booking-frontend/
├── src/
│   ├── components/
│   │   ├── ui/                     # shadcn/ui (button, input, avatar, field,
│   │   │                           #  select, dropdown-menu, sonner, ...)
│   │   ├── theme-provider.tsx      # from shadcn init -- treat as a black box
│   │   ├── Navbar.tsx              # NEW -- avatar dropdown, role-aware links
│   │   └── ProtectedRoute.tsx      # NEW -- route guard using useCurrentUser
│   ├── hooks/
│   │   └── useAuth.ts              # NEW -- authKeys + useCurrentUser,
│   │                               #        useLogin, useRegister, useLogout
│   ├── layouts/
│   │   ├── MainLayout.tsx          # NEW -- Navbar + Outlet
│   │   └── AuthLayout.tsx          # NEW -- Centred wrapper for auth pages
│   ├── pages/
│   │   ├── HomePage.tsx            # from earlier lessons
│   │   ├── LoginPage.tsx           # NEW -- shadcn Field + useLogin
│   │   ├── RegisterPage.tsx        # NEW -- shadcn Field + Select + useRegister
│   │   ├── OwnerDashboardPage.tsx  # NEW -- placeholder for lessons 22-27
│   │   └── NotFoundPage.tsx        # NEW -- catch-all for the `*` route
│   ├── schemas/
│   │   └── authSchema.ts           # NEW -- loginSchema + registerSchema (Zod)
│   ├── services/
│   │   ├── api.ts                  # UPDATED -- adds JWT + 401 interceptors
│   │   └── authApi.ts              # NEW -- register / login / getMe
│   ├── types/
│   │   ├── user.ts                 # UPDATED -- adds LoginData / RegisterData / AuthResponse
│   │   ├── room.ts                 # from Lesson 19 (used in later lessons)
│   │   └── booking.ts              # from Lesson 19 (used in later lessons)
│   ├── App.tsx                     # UPDATED -- MainLayout + AuthLayout routes
│   ├── main.tsx                    # UPDATED -- BrowserRouter, ThemeProvider, Toaster
│   └── index.css                   # from shadcn init
├── .env                            # VITE_API_URL=http://localhost:4001/api
└── package.json
```

> **What is missing (on purpose):** we do not yet have `/rooms`, `/my-bookings`, or the owner dashboard body. Those routes and their supporting components arrive in lessons 22-27. Lesson 21's job is auth + the two-layout skeleton -- everything else builds on top.

---

## Practice Exercises

### Exercise 1: Set Up the Auth Hooks + Providers
1. Update `services/api.ts` with the request and response interceptors
2. Create `services/authApi.ts` with `register`, `login`, and `getMe`
3. Create `hooks/useAuth.ts` with the `authKeys` factory
4. Add the `useCurrentUser` query hook
5. Add the `useLogin`, `useRegister`, and `useLogout` hooks -- each with a Sonner toast
6. In `main.tsx`, wrap `<App />` with `BrowserRouter`, `QueryClientProvider`, and `ThemeProvider defaultTheme="light"`. Confirm `<Toaster richColors />` is at the same level as `<App />`.

### Exercise 2: Build the Login Flow
1. Install the shadcn Field component: `npx shadcn@latest add field`
2. Create the login Zod schema
3. Build the `LoginPage` using `<Field>` + `<Controller>` + `useLogin`
4. Test with valid credentials -- verify you see a "Welcome back" toast and are redirected
5. Test with invalid credentials -- verify the red toast shows the **server's** message ("Invalid email or password"), not the generic "Request failed with status code 401"
6. Test with empty fields -- verify the Zod validation messages appear via `<FieldError />`
7. Refresh the page after logging in -- verify you stay logged in and `useCurrentUser` re-hydrates from `/auth/me`

### Exercise 3: Build the Register Flow
1. Install the shadcn Select component: `npx shadcn@latest add select`
2. Create the register Zod schema with the role enum
3. Build the `RegisterPage` using `<Field>` + `<Controller>` + `<Select>` + `useRegister`
4. Test registering as a "user" -- verify a success toast and redirect to `/`
5. Test registering as an "owner" -- verify a success toast and redirect to `/`
6. Test registering with an existing email -- verify the error toast
7. After registering, verify you are automatically logged in (token in localStorage, `useCurrentUser` returns the new user)

### Exercise 4: Two Layouts + Not Found
1. Create `layouts/MainLayout.tsx` -- Navbar + `<Outlet />`
2. Create `layouts/AuthLayout.tsx` -- centred wrapper, no navbar (auth pages have their own gradient)
3. Create `pages/NotFoundPage.tsx` -- a friendly 404 with a link home
4. Wire `App.tsx` so `/`, `/owner/dashboard`, and `*` live under `MainLayout`, and `/login`, `/register` live under `AuthLayout`
5. Confirm:
   - Visiting `/` shows the Navbar
   - Visiting `/login` shows the centred card **without** the Navbar
   - Visiting `/some-nonsense-path` shows the 404 page **with** the Navbar

### Exercise 5: Complete the Auth Flow
1. Create the `ProtectedRoute` component built on `useCurrentUser`
2. Wrap `/owner/dashboard` in `<ProtectedRoute requireRole="owner">`
3. Build the auth-aware `Navbar` with the avatar dropdown and role-conditional "Owner Portal" link
4. Test the full flow:
   - Visit `/owner/dashboard` while logged out -- should redirect to `/login`
   - Login as a user -- should **not** see "Owner Portal" in the navbar
   - Login as an owner -- should see "Owner Portal" and be redirected to `/owner/dashboard`
   - Open the avatar dropdown and click "Log out" -- should see a "Logged out" toast and be redirected to `/login`
   - Verify the navbar updates immediately after login and logout (no page refresh needed)

### Exercise 6: Handle 401s Gracefully (Advanced)
1. Manually delete the token from localStorage while keeping the React Query cache populated
2. Trigger an authenticated request (e.g. navigate to `/my-bookings`)
3. Confirm the response interceptor redirects you to `/login` automatically
4. Bonus: Tamper with the token (change a character) and confirm the 401 flow still works

---

## Key Takeaways
1. **Auth is server state** -- it belongs in React Query, not in a giant `AuthContext`
2. **Query keys factory** (`authKeys.all`, `authKeys.user()`) gives type-safe, hierarchical invalidation -- same pattern as `todoKeys` in Lesson 17
3. **One hook per action** -- `useCurrentUser`, `useLogin`, `useRegister`, `useLogout`. Each component imports only what it needs
4. **Mutation `onSuccess`** is the right place for token storage, cache seeding (`queryClient.setQueryData`), Sonner toasts, and `navigate()`
5. **Sonner toasts inside the hooks** give consistent success/error feedback across the whole app, just like the todo mutations in Lesson 17
6. **Axios request interceptor** attaches the JWT to every call -- write once, works everywhere
7. **Axios response interceptor** catches 401 globally and redirects to login (except on `/login` and `/register`), and copies the server's `message` field onto `error.message` so every toast shows a human-readable error -- no per-call error handling needed
8. **The shadcn `Field` component** (`Field`, `FieldLabel`, `FieldError`, `FieldDescription`, `FieldGroup`) is paired with React Hook Form's `Controller` to bind inputs, wire labels via `htmlFor={field.name}`, surface validation through `<FieldError errors={[fieldState.error]} />`, and signal the invalid state with `data-invalid` + `aria-invalid`
9. **`useNavigate` lives inside the auth hooks** -- pages stay clean and never duplicate redirect logic
10. **`ProtectedRoute`** consumes `useCurrentUser()` -- the same single source of truth as the rest of the app
11. **`queryClient.clear()` on logout** wipes user-specific caches so the next user does not see stale data
12. **Role-based UI** uses `user.role` directly from `useCurrentUser` -- no extra context, no extra props
13. **Two layout routes** (`MainLayout` for the main shell, `AuthLayout` for centred auth cards) keep the app chrome clean without duplicating markup on every page
14. **`ThemeProvider defaultTheme="light"`** ships the app with a consistent look on every machine; the `d` keyboard shortcut and `localStorage` sync come from the shadcn provider for free
15. **`<Button asChild><Link .../></Button>`** styles a real React Router link as a button without an `onClick` shim -- the shadcn / Radix Slot pattern

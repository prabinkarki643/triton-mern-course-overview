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
- Updating the Navbar based on authentication state

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

You already have an Axios instance from Lesson 17 (`api/api.ts` or `services/api.ts`). Now we extend it with **two interceptors** for authentication:

1. A **request interceptor** that attaches the JWT token to every request
2. A **response interceptor** that catches 401 (Unauthorized) and redirects to login

```ts
// src/api/api.ts -- add to your existing Axios instance from Lesson 17
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
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

// Response interceptor -- handle expired/invalid tokens globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Hard redirect so React Query cache is also cleared on next mount
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
```

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
// src/api/authApi.ts
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
import { authApi } from '../api/authApi';
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

## 21.7 Wiring Up the App

The `main.tsx` from Lesson 17 already has `QueryClientProvider` and `<Toaster />`. We just need to make sure `BrowserRouter` wraps everything so our auth hooks can use `useNavigate`:

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
```

**Order matters:**
1. `BrowserRouter` -- so hooks can use `useNavigate`
2. `QueryClientProvider` -- so hooks can use React Query
3. `<Toaster />` -- mounted once at the root so toasts work anywhere

**No `AuthProvider`.** Any component that needs the current user just calls `useCurrentUser()`.

---

## 21.8 Login Page

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

## 21.9 Register Page

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

## 21.10 Protected Route Component

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

## 21.11 Setting Up Routes with Protection

Update `App.tsx` to use the `ProtectedRoute` component:

```tsx
// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RoomListPage from './pages/RoomListPage';
import RoomDetailPage from './pages/RoomDetailPage';
import DashboardPage from './pages/DashboardPage';
import MyBookingsPage from './pages/MyBookingsPage';
import NotFoundPage from './pages/NotFoundPage';

function App(): JSX.Element {
  return (
    <Routes>
      {/* Public routes with main layout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/rooms" element={<RoomListPage />} />
        <Route path="/rooms/:id" element={<RoomDetailPage />} />

        {/* Protected -- any logged-in user */}
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute>
              <MyBookingsPage />
            </ProtectedRoute>
          }
        />

        {/* Owner-only */}
        <Route
          path="/owner/dashboard"
          element={
            <ProtectedRoute requireRole="owner">
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Auth routes -- no navbar */}
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
import { Outlet } from 'react-router-dom';

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

## 21.12 Navbar with Auth State

The Navbar uses `useCurrentUser()` to know who is logged in and `useLogout()` for the logout button. No props, no context -- just hooks:

```tsx
// src/components/Navbar.tsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useCurrentUser, useLogout } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';

function Navbar(): JSX.Element {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();

  const isAuthenticated = !!user;

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <NavLink to="/" className="text-xl font-bold text-primary">
          BookMyRoom
        </NavLink>

        <div className="flex items-center gap-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground transition-colors'
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/rooms"
            className={({ isActive }) =>
              isActive
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground transition-colors'
            }
          >
            Rooms
          </NavLink>

          {/* Owners get a dashboard link */}
          {isAuthenticated && user?.role === 'owner' && (
            <NavLink
              to="/owner/dashboard"
              className={({ isActive }) =>
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground transition-colors'
              }
            >
              Dashboard
            </NavLink>
          )}

          {/* Any logged-in user gets bookings */}
          {isAuthenticated && (
            <NavLink
              to="/my-bookings"
              className={({ isActive }) =>
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground transition-colors'
              }
            >
              My Bookings
            </NavLink>
          )}

          {/* Auth buttons */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{user.name}</span>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
              <Button size="sm" onClick={() => navigate('/register')}>
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
{isAuthenticated && user?.role === 'owner' && (
  <NavLink to="/owner/dashboard">Dashboard</NavLink>
)}
```

This reads as: "If the user is authenticated AND their role is owner, then show the Dashboard link."

When the user logs in, the `useLogin` hook seeds the cache. Every component using `useCurrentUser()` -- including this Navbar -- immediately re-renders with the new user. No prop drilling, no manual subscription.

---

## 21.13 Complete File Summary

```
booking-frontend/
├── src/
│   ├── api/
│   │   ├── api.ts                  # Axios instance + auth interceptors
│   │   └── authApi.ts              # Typed auth HTTP service
│   ├── components/
│   │   ├── ui/                     # shadcn/ui (field, select, button, input, sonner, ...)
│   │   ├── Navbar.tsx              # Uses useCurrentUser + useLogout
│   │   └── ProtectedRoute.tsx      # Route guard built on useCurrentUser
│   ├── hooks/
│   │   └── useAuth.ts              # authKeys + useCurrentUser, useLogin,
│   │                               #          useRegister, useLogout
│   ├── layouts/
│   │   ├── MainLayout.tsx          # Navbar + Outlet + Footer
│   │   └── AuthLayout.tsx          # Centred card layout
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── AboutPage.tsx
│   │   ├── LoginPage.tsx           # shadcn Field + useLogin
│   │   ├── RegisterPage.tsx        # shadcn Field + Select + useRegister
│   │   ├── RoomListPage.tsx
│   │   ├── RoomDetailPage.tsx
│   │   ├── DashboardPage.tsx       # Owner-only
│   │   ├── MyBookingsPage.tsx      # Auth-required
│   │   └── NotFoundPage.tsx
│   ├── schemas/
│   │   └── authSchemas.ts          # loginSchema + registerSchema (Zod)
│   ├── types/
│   │   ├── user.ts                 # User, LoginData, RegisterData, AuthResponse
│   │   ├── room.ts
│   │   └── booking.ts
│   ├── App.tsx                     # Routes + ProtectedRoute
│   ├── main.tsx                    # BrowserRouter + QueryClientProvider + Toaster
│   └── index.css
├── .env
└── package.json
```

---

## Practice Exercises

### Exercise 1: Set Up the Auth Hooks
1. Update your Axios instance with the request and response interceptors
2. Create `api/authApi.ts` with `register`, `login`, and `getMe`
3. Create `hooks/useAuth.ts` with the `authKeys` factory
4. Add the `useCurrentUser` query hook
5. Add the `useLogin`, `useRegister`, and `useLogout` hooks -- each with a Sonner toast
6. Confirm `<Toaster richColors />` is mounted in `main.tsx` (from Lesson 17)

### Exercise 2: Build the Login Flow
1. Install the shadcn Field component: `npx shadcn@latest add field`
2. Create the login Zod schema
3. Build the `LoginPage` using `<Field>` + `<Controller>` + `useLogin`
4. Test with valid credentials -- verify you see a "Welcome back" toast and are redirected
5. Test with invalid credentials -- verify a red error toast appears
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

### Exercise 4: Complete the Auth Flow
1. Create the `ProtectedRoute` component built on `useCurrentUser`
2. Add protected routes to `App.tsx` (My Bookings for any user, Dashboard for owners)
3. Build the auth-aware `Navbar` using `useCurrentUser` and `useLogout`
4. Test the full flow:
   - Visit `/owner/dashboard` while logged out -- should redirect to `/login`
   - Login as a user -- should not see "Dashboard" in the navbar
   - Login as an owner -- should see "Dashboard" and be redirected to `/owner/dashboard`
   - Click "Logout" -- should see a "Logged out" toast and be redirected to `/login`
   - Verify the navbar updates immediately after login and logout

### Exercise 5: Handle 401s Gracefully (Advanced)
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
7. **Axios response interceptor** catches 401 globally and redirects to login -- no per-call error handling needed
8. **The shadcn `Field` component** (`Field`, `FieldLabel`, `FieldError`, `FieldDescription`, `FieldGroup`) is paired with React Hook Form's `Controller` to bind inputs, wire labels via `htmlFor={field.name}`, surface validation through `<FieldError errors={[fieldState.error]} />`, and signal the invalid state with `data-invalid` + `aria-invalid`
9. **`useNavigate` lives inside the auth hooks** -- pages stay clean and never duplicate redirect logic
10. **`ProtectedRoute`** consumes `useCurrentUser()` -- the same single source of truth as the rest of the app
11. **`queryClient.clear()` on logout** wipes user-specific caches so the next user does not see stale data
12. **Role-based UI** uses `user.role` directly from `useCurrentUser` -- no extra context, no extra props

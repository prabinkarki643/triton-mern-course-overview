# Project Lesson 04: Authentication (Next.js + Cookies)

## What You Will Learn
- Which parts of our auth module stay **exactly the same**, and the one part that changes
- Building the auth backend: `User` model, bcrypt, JWT, validators, `requireAuth` middleware
- Storing the JWT in a **cookie** with `js-cookie` instead of `localStorage`
- Why a cookie lets your **Server Components** read the token, and what that unlocks
- Attaching the token to every request with an Axios interceptor
- React Query hooks: `useLogin`, `useRegister`, `useCurrentUser`, `useLogout`
- **Our page convention**: a server `page.tsx` plus a `<name>-client.tsx` — use it for every page
- Protecting routes with **route groups** — `(auth)` and `(protected)` layouts
- The honest security position on this approach — and the viva answer
- **Extending auth** with OTP email flows: forgot password, change password, verify email

---

## 4.1 What Changes, and What Does Not

You have already built this auth module once, for BookMyRoom. **The backend is identical.** So is the frontend logic. One thing changes:

| | BookMyRoom (Vite) | Your project (Next.js) |
|---|------------------|------------------------|
| Backend — bcrypt, JWT, validators, middleware | ✅ | ✅ **identical** |
| Login / register forms — React Hook Form + Zod + Field | ✅ | ✅ identical |
| React Query hooks | ✅ | ✅ identical |
| Axios interceptor attaching the token | ✅ | ✅ identical |
| **Where the token is stored** | `localStorage` | **cookie, via `js-cookie`** |
| Route protection | `<ProtectedRoute>` + two layouts | `(protected)` and `(auth)` route-group layouts |
| Navigation after login | `useNavigate()` | `useRouter()` from `next/navigation` |

### Why move to a cookie?

`localStorage` is only readable by JavaScript running **in the browser**. Next.js renders many of your pages on the **server** — and the server has no access to `localStorage`. So a Server Component can never know who is logged in.

A cookie is sent with every request to the server automatically. That means:

- Your **Server Components** can read the token with `cookies()` from `next/headers`
- You can fetch a user's data on the server and send rendered HTML, rather than showing a spinner while the browser fetches
- Route protection can happen **before** the page is sent, not after it renders

That is the whole reason for the change.

### Your reference material

| What you need | Where to look |
|---------------|---------------|
| Full backend auth explanation | [Lesson 20 — Auth Backend](../lessons/20-auth-backend.md) |
| Full frontend auth explanation | [Lesson 21 — Auth Frontend](../lessons/21-auth-frontend.md) |
| Forgot password, OTP, change password | [Lesson 21.1 — Auth Extend](../lessons/21.1-auth-extend.md) |
| Working backend code to compare against | `bookmyroom_app/booking-backend/src/` |
| Working frontend code to compare against | `bookmyroom_app/booking-frontend/src/` |

**Lesson 20 explains *why* bcrypt salts, how a JWT is structured, and what each middleware does.** This lesson does not repeat that — go and read it. What follows is the checklist to get it into *your* project, plus the Next.js parts that are genuinely new.

> Remember the rule from the README: **do not edit `bookmyroom_app/`**. Open it, read it, copy from it — but type the code into your own project.

---

## 4.2 The Backend (same as Lesson 20)

### Install

```bash
cd backend
npm install bcrypt jsonwebtoken
npm install -D @types/bcrypt @types/jsonwebtoken
```

### Check your `.env`

```bash
JWT_SECRET=replace-me-with-a-long-random-string
```

Generate a real one:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> A guessable `JWT_SECRET` means anyone can forge a token and log in as any user. This is the single most important secret in your project.

### The files to create

Follow **Lesson 20** section by section. Your checklist:

| File | What goes in it | Lesson 20 |
|------|----------------|-----------|
| `src/models/User.ts` | name, email (unique), password (`select: false`), phone, role | §20.3 |
| `src/types/express.d.ts` | Extends `Request` so `req.user` is typed | §20.7 |
| `src/validators/auth.validator.ts` | `registerValidator`, `loginValidator` | §20.5 |
| `src/controllers/authController.ts` | `register`, `login`, `getMe` | §20.6 |
| `src/middleware/auth.ts` | `requireAuth`, `requireRole` | §20.7 |
| `src/routes/authRoutes.ts` | Wires the above together | §20.8 |

Then mount it in `src/index.ts`, above your 404 handler:

```ts
import authRoutes from "./routes/authRoutes";

app.use("/api/auth", authRoutes);
```

### Two details worth repeating

**`select: false` on the password field.** This means `User.find()` never returns the password hash — so it cannot leak into an API response by accident. When you *do* need it (checking a login), ask explicitly:

```ts
const user = await User.findOne({ email }).select("+password");
```

**Change the roles to suit your project.** BookMyRoom uses `"owner" | "user"`. Yours might be:

| Project | Roles |
|---------|-------|
| Restaurant tables | `"restaurant" \| "customer"` |
| Futsal grounds | `"owner" \| "player"` |
| Doctor appointments | `"doctor" \| "patient"` |
| Cargo trucks | `"transporter" \| "shipper"` |

Change it in three places: the `IUser` interface, the schema `enum`, and `TokenPayload` in `middleware/auth.ts`. TypeScript will point at anything you miss.

### Test before touching the frontend

```http
### Register
POST http://localhost:4001/api/auth/register
Content-Type: application/json

{
  "name": "Ram Bahadur",
  "email": "ram@example.com",
  "password": "secret123",
  "phone": "9800000000",
  "role": "user"
}

### Login
POST http://localhost:4001/api/auth/login
Content-Type: application/json

{ "email": "ram@example.com", "password": "secret123" }

### Who am I? (paste the token from the login response)
GET http://localhost:4001/api/auth/me
Authorization: Bearer PASTE_TOKEN_HERE
```

**Get all three working before you write a single line of frontend.** Debugging a broken login is far harder when you cannot tell which half is at fault.

---

## 4.3 Frontend Setup

```bash
cd webapp
npm install axios js-cookie @tanstack/react-query react-hook-form zod @hookform/resolvers
npm install -D @types/js-cookie
npx shadcn@latest add field input label button card sonner
```

`js-cookie` is a tiny wrapper over `document.cookie` — the browser API for cookies is genuinely unpleasant to use directly, and this makes it three readable functions.

Your `.env.local` should already have:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4001/api
```

---

## 4.4 The Cookie Helper

Everything that touches the token goes through one file, so there is exactly one place to change it later.

```ts
// src/lib/auth.ts
import Cookies from "js-cookie";

export const TOKEN_KEY = "token";

export function setToken(token: string): void {
  Cookies.set(TOKEN_KEY, token, {
    expires: 7, // days -- match your JWT expiry
    path: "/", // available on every route
    sameSite: "lax", // sent on normal navigation, blocked on cross-site POSTs
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
  });
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function removeToken(): void {
  Cookies.remove(TOKEN_KEY, { path: "/" });
}
```

### The options, one at a time

| Option | What it does | Why this value |
|--------|-------------|----------------|
| `expires: 7` | Cookie is deleted after 7 days | Match your JWT's expiry. A cookie that outlives its token means a "logged in" user whose every request 401s |
| `path: "/"` | Sent on every route | Without it the cookie only applies to the path that set it. **Pass the same `path` to `remove()` or logout silently fails** |
| `sameSite: "lax"` | Sent on normal navigation, not on cross-site form posts | Basic CSRF protection |
| `secure` | Only sent over HTTPS | `true` in production. On `localhost` (plain HTTP) it must be `false`, or the cookie is never stored |

> **The `secure` flag catches people out.** Hard-code `secure: true` and your login works in production but silently fails on localhost — the cookie is set and immediately discarded, so you are redirected back to the login page with no error. Tying it to `NODE_ENV` handles both.

---

## 4.5 The Axios Instance

Identical to Lesson 21 except it reads the cookie rather than `localStorage`:

```ts
// src/services/api.ts
import axios from "axios";
import { getToken, removeToken } from "@/lib/auth";

export const API_URL: string =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Attach the JWT to every request, if we have one
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired tokens and surface the server's message
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const onAuthPage =
        window.location.pathname === "/login" ||
        window.location.pathname === "/register";
      if (!onAuthPage) {
        removeToken();
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    // Prefer the first field error from validateResult
    const firstFieldError = error.response?.data?.errors?.[0]?.message;
    if (firstFieldError) {
      error.message = firstFieldError;
      return Promise.reject(error);
    }

    const serverMessage = error.response?.data?.message;
    if (serverMessage) {
      error.message = serverMessage;
    }

    return Promise.reject(error);
  }
);

export default api;
```

> **`typeof window !== "undefined"`** is new compared with Lesson 21. This file can be imported on the server, where `window` does not exist — without the guard you get `ReferenceError: window is not defined` during the build. Any time you touch `window`, `document` or `localStorage` in Next.js, guard it.

The service layer is unchanged from Lesson 21 §21.4:

```ts
// src/services/authApi.ts
import api from "./api";
import type { AuthResponse, LoginData, RegisterData, User } from "@/types/user";

export const authApi = {
  async login(payload: LoginData): Promise<AuthResponse> {
    const { data } = await api.post<{ data: AuthResponse }>(
      "/auth/login",
      payload
    );
    return data.data;
  },

  async register(payload: RegisterData): Promise<AuthResponse> {
    const { data } = await api.post<{ data: AuthResponse }>(
      "/auth/register",
      payload
    );
    return data.data;
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<{ data: User }>("/auth/me");
    return data.data;
  },
};
```

> **Why `data.data`?** Two different "data" are stacked here. Axios puts the response body on `response.data`, and the Lesson 20 controllers wrap successful responses in their own envelope — `{ data: { user, token } }`. So `data` is the body, and `data.data` is what is inside the envelope.
>
> Check your own controller before copying this. If your `register` responds with `res.status(201).json({ data: { user, token } })` — as Lesson 20's does — you need both. If you chose to return `{ user, token }` flat, drop one level. **Getting this wrong gives you `undefined` where the token should be, and a login that "succeeds" but stores nothing.**

---

## 4.6 The Providers

React Query needs a provider, and it must be a **Client Component**:

```tsx
// src/app/providers.tsx
"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
```

> **Why `useState(() => new QueryClient())` and not just `new QueryClient()`?** Written the plain way, a new client is created on every render, throwing your whole cache away. The `useState` initialiser runs once per component instance.

**Now wire it into your root layout — this is the step everyone forgets:**

```tsx
// src/app/layout.tsx
import { Providers } from "./providers";
import "./globals.css";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

Miss this and your build fails with **`No QueryClient set, use QueryClientProvider to set one`**. The error points at your hook, but the fault is here.

---

## 4.7 The Auth Hooks

Same shape as Lesson 21 §21.6. Three changes: `setToken` instead of `localStorage.setItem`, `useRouter` from `next/navigation` instead of `useNavigate`, and a `router.refresh()`.

```ts
// src/hooks/useAuth.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/services/authApi";
import { getToken, removeToken, setToken } from "@/lib/auth";
import type { LoginData, RegisterData, User } from "@/types/user";

export const authKeys = {
  all: ["auth"] as const,
  user: () => [...authKeys.all, "user"] as const,
};

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
      router.push(data.user.role === "owner" ? "/dashboard" : "/");
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
      router.push("/");
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
```

### Why `router.refresh()`?

`router.push()` navigates, but any Server Component already rendered still holds the **old** cookie state — so your navbar can still say "Log in" after a successful login. `router.refresh()` re-renders the server components with the new cookie. **Call it after every login, register and logout.**

---

## 4.8 How We Structure Every Page

**Follow this convention for every page in your project.** Two files per page:

```
(auth)/login/
├── page.tsx           Server Component -- no "use client"
└── login-client.tsx   Client Component -- has "use client"
```

| File | Runs | Contains |
|------|------|----------|
| `page.tsx` | On the **server** | Cookie reads, redirects, server-side data fetching, then renders the client component |
| `<name>-client.tsx` | In the **browser** | The form, `useState`, hooks, `onClick` — anything interactive |

### Why split it?

You met the rule in project Lesson 01 §1.7: a component with `useState` or `onSubmit` must be a Client Component. The moment you put `"use client"` at the top of `page.tsx`, that page can no longer do **any** server work — no `await cookies()`, no server-side fetching, no `redirect()` before render.

Splitting keeps both doors open:

- `page.tsx` stays a Server Component, so you can always add server work later
- the interactive part lives next to it, in its own file
- you never have to restructure a page because you suddenly need a cookie in it

**Name the client file after the page** — `login-client.tsx`, `register-client.tsx`, `dashboard-client.tsx`. When you have thirty files open, `page.tsx` alone tells you nothing.

> A page that is **purely display** — it fetches on the server and renders text — does not need a client file. §4.10's dashboard is one. But the moment there is a button, a form, or state, add one.

### The login page

**`page.tsx`** — the server half:

```tsx
// src/app/(auth)/login/page.tsx
import { Suspense } from "react";
import LoginClient from "./login-client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
```

That is all it does today. Later, if you want this page to check something on the server first, it goes here — and the client file does not change:

```tsx
export default async function LoginPage() {
  const token = (await cookies()).get("token")?.value;
  if (token) redirect("/dashboard");

  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
```

**`login-client.tsx`** — the interactive half:

```tsx
// src/app/(auth)/login/login-client.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useLogin } from "@/hooks/useAuth";
import { loginSchema, type LoginFormData } from "@/schemas/authSchema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function LoginClient() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const login = useLogin();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginFormData) {
    login.mutate(values);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Welcome back.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
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
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? "Logging in..." : "Log in"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              No account? <Link href="/register" className="underline">Register</Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
```

Note the card has no centring wrapper around it — `(auth)/layout.tsx` provides that (§4.9), so every auth page looks the same without repeating the markup.

### Why the `<Suspense>` is not optional

`useSearchParams()` reads the URL, which is only known per request. Without a Suspense boundary **your build fails**:

```
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/login".
Error occurred prerendering page "/login"
```

Wrapping the client component in `<Suspense>` fixes it. Make it a habit in every `page.tsx` — it costs nothing when it is not needed, and saves a confusing build failure when it is.

### The schema

```ts
// src/schemas/authSchema.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .pipe(z.email("Please enter a valid email address")),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

**The register page is the same shape** — `page.tsx` plus `register-client.tsx`, with more fields including role. Copy the structure from Lesson 21 §21.10.

Add a link to `/forgot-password` here too — §4.12 builds that page.


## 4.9 Protecting Routes

In BookMyRoom you had two layouts and a wrapper component. Next.js gives you the same three things as **folders**:

| BookMyRoom (Lesson 21 §21.12) | Your project |
|-------------------------------|--------------|
| `AuthLayout.tsx` — centred, no navbar | `app/(auth)/layout.tsx` |
| `<ProtectedRoute>` wrapper | `app/(protected)/layout.tsx` |
| `MainLayout.tsx` — navbar | the layout of whichever group needs it |

### Route groups

A folder in **round brackets** groups pages under a shared layout **without appearing in the URL**:

```
src/app/
├── layout.tsx                          root -- html, body, <Providers>
├── page.tsx                            /            public landing page
│
├── (auth)/
│   ├── layout.tsx                      already logged in?  -> redirect("/")
│   ├── login/
│   │   ├── page.tsx                    /login
│   │   └── login-client.tsx
│   └── register/
│       ├── page.tsx                    /register
│       └── register-client.tsx
│
└── (protected)/
    ├── layout.tsx                      no token?  -> redirect("/login")   <- the guard
    ├── dashboard/
    │   └── page.tsx                    /dashboard
    └── my-bookings/
        ├── page.tsx                    /my-bookings
        └── my-bookings-client.tsx
```

Every page follows the §4.8 convention — a server `page.tsx`, plus a `-client.tsx` when the page needs interactivity. The dashboard here has no client file because it only displays server-fetched data (§4.10).

`(auth)` and `(protected)` are **not** in the URLs. `(protected)/dashboard/page.tsx` is still `/dashboard`.

**That is the whole point:** the folder tells you the rule. Anything inside `(protected)` needs a login. You can see it in the file tree without reading a line of code.

### The guard

```tsx
// src/app/(protected)/layout.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  return <div className="min-h-screen">{children}</div>;
}
```

**This only works because the token is in a cookie.** A cookie is sent with the request, so the server can read it *before* rendering the page. With `localStorage` this file could not see the token at all — the page would have to render, reach the browser, and only then discover you are not logged in. That is the change in one sentence.

> **`await cookies()`** — it is asynchronous. Forget the `await` and you get a confusing type error about `Promise<ReadonlyRequestCookies>`. Older tutorials show it without, because it changed in Next.js 15.

### The mirror image, for auth pages

A logged-in user should not see the login form. Same idea, condition flipped:

```tsx
// src/app/(auth)/layout.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get("token")?.value;

  if (token) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      {children}
    </main>
  );
}
```

This layout does the job of BookMyRoom's `AuthLayout` too — the centred wrapper your login and register cards sit in. One file, two purposes.

### Where the navbar goes

Keep `<Navbar />` out of the root layout, so your login and register pages stay clean — exactly the reason BookMyRoom has a separate `AuthLayout`:

- **`(protected)/layout.tsx`** — render `<Navbar />` above `{children}`
- **`app/page.tsx`** — your landing page renders its own `<Navbar />`

If you would rather have the navbar on every page including auth, move it to the root layout instead. Either is fine — decide once, with your partner.

### Check the routes are what you expect

```bash
npm run build
```

```
Route (app)
┌ ○ /
├ ƒ /dashboard
├ ƒ /login
└ ƒ /register
```

Two things to notice. The bracketed folders are gone from the URLs — that is route groups working. And `/` is `○` **static** while the others are `ƒ` **dynamic**: reading a cookie forces a page to be rendered per request. Your public landing page stays fast and cacheable; only the guarded pages do work per visitor. That is the behaviour you want, and it is a good thing to be able to explain.

### What these guards do NOT do

Both layouts check only that **a cookie exists**. They do not check that the token is valid, unexpired, or has the right role. Anyone can open DevTools and type a fake `token` cookie — and they will get past both.

**The real security is `requireAuth` on your backend.** It verifies the signature on every protected endpoint, so a forged cookie gets an empty page and a 401 from every API call.

> **Expect this in your viva: "what stops me just editing that cookie?"**
> *"Nothing — the layout guard is for user experience, so people are not shown pages that cannot load. Every protected endpoint runs `requireAuth`, which verifies the JWT signature with our secret. A forged cookie gets a 401 from the API."*

**One thing to watch:** a page only gets guarded if it is **inside** the `(protected)` folder. Create `app/dashboard/page.tsx` by mistake instead of `app/(protected)/dashboard/page.tsx` and it is public. When you add a page, check which group it is in.

> **Seen `middleware.ts` in a tutorial?** Next.js also has a file that runs before every request — called `middleware.ts`, renamed to `proxy.ts` in Next.js 16. You **do not need it** for this project, and Next's own documentation recommends avoiding it unless nothing else will do. Two guards doing the same job just makes it harder to work out which one redirected you. Stick to the layouts.

## 4.10 Reading the User in a Server Component

This is what the cookie buys you. No loading spinner — the HTML arrives with the user's name already in it:

```tsx
// src/app/(protected)/dashboard/page.tsx
import { cookies } from "next/headers";
import type { User } from "@/types/user";

async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    // Never cache a per-user request.
    cache: "no-store",
  });

  if (!res.ok) return null;

  // Same envelope as authApi -- the controller wraps it in { data: ... }
  const { data }: { data: User } = await res.json();
  return data;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // The layout already redirected anyone without a cookie. Reaching here
  // with no user means the cookie exists but the token is invalid or
  // expired -- exactly what a forged cookie produces.
  if (!user) {
    return <p className="p-6">We could not verify your session.</p>;
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
      <p className="text-muted-foreground">{user.email}</p>
    </main>
  );
}
```

Two things to keep:

**`cache: "no-store"`** — without it Next.js may cache one user's response and serve it to another. **Never cache a personalised request.**

**The `if (!user)` branch.** The layout guard only proved a cookie *exists*. If someone edits that cookie by hand, the layout lets them through and this fetch returns 401 — so the page needs something to show. Try it: change your `token` cookie in DevTools to `rubbish` and reload. You will land on this branch, which is the whole §4.9 security point made visible.

### The navbar problem: hydration mismatch

You will hit this the moment you build a navbar that shows the user's name. The error is:

```
Hydration failed because the server rendered HTML didn't match the client.
```

**Why it happens.** Your navbar is a Client Component calling `useCurrentUser()`, which is `enabled: !!getToken()`. But `getToken()` uses `js-cookie`, which reads `document.cookie` — and **there is no `document` on the server**. So:

| | `getToken()` returns | Navbar renders |
|---|---------------------|----------------|
| On the server | `undefined` | the logged-**out** links |
| First client render | the real token | the **loading** state |

Two different trees for the same markup, which is exactly what React complains about.

**The fix** — render nothing in the auth area until after mount, so the server and the first client render agree:

```tsx
"use client";

import { useEffect, useState } from "react";

export function Navbar() {
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();

  // Server and first client render both produce null here; the real state
  // appears immediately after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header>
      {/* ...logo... */}
      {!mounted || isLoading ? null : user ? (
        <LoggedInLinks user={user} onLogout={logout} />
      ) : (
        <LoggedOutLinks />
      )}
    </header>
  );
}
```

Give the nav a fixed height (`h-14`) so nothing jumps when the real state arrives.

> **This is the cost of a client-readable cookie.** `js-cookie` cannot see the cookie on the server; only `await cookies()` can. If you want the navbar correct on the very first paint, read the user in a Server Component (as §4.10 does) and pass it down as a prop. The `mounted` approach is simpler and fine for a project — just know why it is there.

### When to use which

| Situation | Use |
|-----------|-----|
| Page content that depends on the user, shown on load | Server Component + `await cookies()` |
| Anything interactive — forms, buttons, live updates | Client Component + `useCurrentUser()` |
| Navbar showing the user's name | Either — client is simpler while you are learning |

Do not force everything to the server. A Client Component with `useCurrentUser()` is perfectly good, and it is what you already know from Lesson 21.

---

## 4.11 Is This Secure? (know this before your defence)

Be straight about this, because an examiner may well ask.

**A cookie set by `js-cookie` is readable by JavaScript.** It is not `httpOnly`. So against an XSS attack it is **no safer than `localStorage`** — an injected script can read either one.

**What we gained** is server access, not security: Server Components and your `(protected)` layout can see the token.

**What would be more secure** is an `httpOnly` cookie set by the backend with `res.cookie(...)`. JavaScript cannot read it at all, so XSS cannot steal it. We are not doing that here because it needs the backend to set cookies, CORS configured with credentials, and CSRF protection — a fair amount of extra machinery for a student project.

> **A good viva answer:** *"We store the JWT in a cookie so Server Components can read it. It is not httpOnly, so it carries the same XSS exposure as localStorage — the benefit is server-side access, not security. For production I would have the backend set an httpOnly, secure, sameSite cookie and add CSRF protection, so the token is never reachable from JavaScript."*
>
> That answer shows you understand the trade-off you made. "It's in a cookie so it's secure" is wrong, and an examiner who knows the area will pursue it.

**What you must do regardless:**

1. `JWT_SECRET` long, random, and in `.env` only
2. Passwords hashed with bcrypt — never stored or logged in plain text
3. `requireAuth` on **every** protected endpoint, and `requireRole` where roles matter
4. Never return the password hash — `select: false` handles this
5. Give tokens an expiry (7 days is sensible for a project)

---

## 4.12 Extending Auth: Forgot Password, Change Password, Verify Email

Everything so far covers getting in. This part covers the three flows every real application needs, all built on **one-time passwords (OTPs)** sent by email:

| Flow | Who | Steps |
|------|-----|-------|
| **Forgot password** | Public | Request a code by email → submit code + new password |
| **Change password** | Logged in | Current password + new password (no OTP needed — being logged in is the proof) |
| **Verify email** | Logged in | Request a code → submit code |

### Your reference material

| What you need | Where |
|---------------|-------|
| Full explanation of every piece below | [Lesson 21.1 — Auth Extend](../lessons/21.1-auth-extend.md) |
| Working backend code | `bookmyroom_app/booking-backend/src/` — `config/mail.ts`, `models/OtpToken.ts`, `services/otpService.ts`, `services/mailService.ts` |
| Working frontend code | `bookmyroom_app/booking-frontend/src/pages/ForgotPasswordPage.tsx`, `ProfilePage.tsx` |

**Lesson 21.1 explains *why* each design decision was made** — why OTPs are hashed at rest, why they live in their own collection, why the error messages are deliberately vague. Read it. What follows is the checklist plus the Next.js differences.

---

## 4.13 The Backend (same as Lesson 21.1)

### Install and configure

```bash
cd backend
npm install nodemailer
npm install -D @types/nodemailer
```

Add to `.env` — we use **Mailtrap Sandbox**, a captured inbox. Mail never reaches a real person, which is exactly what you want while testing:

```bash
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
MAIL_SECURE=false
SMTP_USERNAME=<your mailtrap sandbox username>
SMTP_PASSWORD=<your mailtrap sandbox password>
SMTP_DEFAULT_FROM=no-reply@yourproject.example
```

Get your own credentials free from <https://mailtrap.io/inboxes> → your inbox → **SMTP Settings**. Add the same keys to `.env.example` with placeholder values.

> **Why a sandbox rather than your Gmail?** Three reasons. You cannot accidentally email a real person while testing. Gmail needs app passwords and will rate-limit or block you. And a captured inbox lets you *read the code* during development, which you need constantly.

### The files to create

| File | What it does | Lesson 21.1 |
|------|-------------|-------------|
| `src/config/mail.ts` | Lazy nodemailer transporter, so bad SMTP config does not crash boot | §21.1.4 |
| `src/services/mailService.ts` | `sendMail()` plus the OTP email template | §21.1.5 |
| `src/models/OtpToken.ts` | OTP collection with a **TTL index** | §21.1.6 |
| `src/services/otpService.ts` | `issueOtp()`, `verifyOtp()`, `otpTtlMinutes()` | §21.1.7 |

Then add `emailVerified: { type: Boolean, default: false }` to your `User` model, five controller functions, four validators, and the routes:

```ts
// Public
router.post("/forgot-password", forgotPasswordValidator, validateResult, forgotPassword);
router.post("/reset-password", resetPasswordValidator, validateResult, resetPassword);

// Authenticated
router.post("/change-password", requireAuth, changePasswordValidator, validateResult, changePassword);
router.post("/send-email-verify-otp", requireAuth, sendEmailVerifyOtp);
router.post("/verify-email", requireAuth, verifyEmailValidator, validateResult, verifyEmail);
```

### The four design decisions worth understanding

These are what an examiner will ask about, so do not just copy them.

**1. The OTP is hashed, never stored in plain text.**

```ts
function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}
```

A database dump then contains no usable codes. It also means **you cannot look the code up** — you read it from the email, like a user would.

**2. It is single-use.** Verifying sets `consumedAt`, and `verifyOtp` only ever looks for tokens where `consumedAt` does not exist. A code that worked once cannot be replayed.

**3. Wrong guesses are counted, and 5 burns the token.**

```ts
if (token.attempts >= MAX_ATTEMPTS) token.consumedAt = now;
```

Six digits is a million possibilities, which a script could exhaust in minutes. Five attempts makes guessing hopeless.

**4. `forgot-password` responds identically whether the email exists or not.**

```ts
res.status(200).json({
  message: "If an account exists for that email, a code has been sent.",
});
```

Return "no such user" and the endpoint becomes a tool for discovering who has an account. `reset-password` does the same: an unknown email gets the same "Invalid or expired code" as a wrong code.

> **Use `crypto.randomInt`, not `Math.random`.** `Math.random` is not cryptographically secure and its output can be predicted from earlier values. For anything that guards an account, use `crypto`.

### Testing it

You cannot read the OTP from your database — it is hashed. Read it from your **Mailtrap inbox**, which is the point of using a sandbox.

```http
### 1. Request a code (then open Mailtrap)
POST http://localhost:4001/api/auth/forgot-password
Content-Type: application/json

{ "email": "ram@example.com" }

### 2. Reset with the code from the email
POST http://localhost:4001/api/auth/reset-password
Content-Type: application/json

{ "email": "ram@example.com", "otp": "123456", "newPassword": "newpass456" }

### 3. Try the SAME code again -- must fail, it is single-use
POST http://localhost:4001/api/auth/reset-password
Content-Type: application/json

{ "email": "ram@example.com", "otp": "123456", "newPassword": "another789" }

### 4. Change password (logged in)
POST http://localhost:4001/api/auth/change-password
Content-Type: application/json
Authorization: Bearer PASTE_TOKEN_HERE

{ "currentPassword": "newpass456", "newPassword": "secret123" }

### 5. Request an email verification code
POST http://localhost:4001/api/auth/send-email-verify-otp
Authorization: Bearer PASTE_TOKEN_HERE

### 6. Verify with the code from the email
POST http://localhost:4001/api/auth/verify-email
Content-Type: application/json
Authorization: Bearer PASTE_TOKEN_HERE

{ "otp": "123456" }
```

Work through all six **before** touching the frontend.

---

## 4.14 The Frontend

### Types, service and hooks

These five endpoints return `{ message }` at the **top level** — no `{ data }` envelope like login and register. So there is nothing to unwrap:

```ts
// src/types/user.ts
export interface MessageResponse {
  message: string;
}
```

```ts
// src/services/authApi.ts -- note: NO .data.data here
async forgotPassword(payload: ForgotPasswordData): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>("/auth/forgot-password", payload);
  return data;
},
```

Add five hooks alongside the ones from §4.7, each surfacing the server's own message so the wording lives in one place:

```ts
export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordData) => authApi.forgotPassword(payload),
    onSuccess: (data) => toast.success(data.message),
    onError: (error: Error) =>
      toast.error(error.message || "Failed to send reset code"),
  });
}
```

`useVerifyEmail` needs one extra step — `emailVerified` has just changed, so the cached user is stale:

```ts
export function useVerifyEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VerifyEmailData) => authApi.verifyEmail(payload),
    onSuccess: (data) => {
      toast.success(data.message);
      // Refetch so every "unverified" badge updates at once.
      queryClient.invalidateQueries({ queryKey: authKeys.user() });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
```

### The pages

Both follow the §4.8 convention — a server `page.tsx` plus a client file:

```
src/app/
├── (auth)/
│   └── forgot-password/
│       ├── page.tsx
│       └── forgot-password-client.tsx
└── (protected)/
    └── profile/
        ├── page.tsx
        └── profile-client.tsx
```

`forgot-password` goes in `(auth)` — it is for people who cannot log in, and a logged-in user should be bounced away. `profile` goes in `(protected)` — you must be logged in to change your own password.

### The wizard: two steps, one URL

The forgot-password page has two stages. Hold the stage in state rather than creating a second route, because step 2 needs the email from step 1:

```tsx
const [step, setStep] = useState<"email" | "reset">("email");
const [email, setEmail] = useState<string>("");

function onRequestCode(values: ForgotPasswordFormData) {
  forgotPassword.mutate(values, {
    onSuccess: () => {
      setEmail(values.email);   // step 2 sends this back with the code
      setStep("reset");
    },
  });
}
```

Use **two separate `useForm` instances** — one per step — and give each `<form>` a `key`:

```tsx
{step === "email" ? (
  <form key="email-step" onSubmit={emailForm.handleSubmit(onRequestCode)}>
) : (
  <form key="reset-step" onSubmit={resetForm.handleSubmit(onReset)}>
)}
```

> **The `key` matters.** Without it React reuses the same DOM form across both steps, and the first step's values and validation state leak into the second. A distinct `key` forces a fresh form.

On success, send them to `/login` to sign in with the new password:

```tsx
resetPassword.mutate({ email, ...values }, {
  onSuccess: () => router.push("/login"),
});
```

### The profile page

Two cards, and the email card has three states:

| State | Shows |
|-------|-------|
| `emailVerified === true` | "Email verified" — nothing to do |
| Not verified, no code requested | A "Send verification code" button |
| Code requested | The 6-digit input, Verify, and Resend |

Track the third with a small piece of state:

```tsx
const [showCodeInput, setShowCodeInput] = useState(false);

<Button onClick={() => sendOtp.mutate(undefined, {
  onSuccess: () => setShowCodeInput(true),
})}>
  Send verification code
</Button>
```

Note `sendOtp.mutate(undefined, {...})` — this mutation takes no payload, so the first argument is `undefined` and the options go second.

Add `autoComplete="one-time-code"` and `inputMode="numeric"` to OTP inputs. On a phone that brings up the number pad and lets the OS offer the code from the SMS or email.

---

## 4.15 Security Points for Your Defence

Sections 4.11 and 4.9 covered token storage and route guards. The OTP flows add four more, and they are good marks if you can explain them:

1. **OTPs are hashed at rest** — a leaked database yields no usable codes
2. **Single-use** — `consumedAt` stops replay
3. **Time-limited** — 10 minutes, enforced by `expiresAt` *and* auto-purged by MongoDB's TTL index
4. **Attempt-limited** — five wrong guesses burns the token, so a million-guess script gets nowhere
5. **No user enumeration** — `forgot-password` cannot be used to find out who has an account

> **A question you may get: "why not just email a reset link?"**
> *"A link carries a token in the URL, which ends up in browser history, server logs and referrer headers, and links break when email clients rewrite them. A 6-digit code never leaves the email body, and the same mechanism works for email verification too. The trade-off is that the user has to copy it across."*

**One honest note about the code.** The `too_many_attempts` message is effectively unreachable. The fifth wrong guess sets `consumedAt`, so the next request finds no live token and returns the generic "Invalid or expired code" instead. The **protection works** — the token is genuinely burned — but users never see that specific wording. That is arguably correct (vaguer messages leak less); just do not claim in your report that users see a distinct lockout message, because they do not.

---


## 4.16 When Things Go Wrong

| Error | Cause | Fix |
|-------|-------|-----|
| `No QueryClient set, use QueryClientProvider to set one` | `<Providers>` not wired into the root layout | §4.6 — wrap `{children}` in `layout.tsx` |
| `ReferenceError: window is not defined` | Touching `window` in code that runs on the server | Guard with `typeof window !== "undefined"` |
| `useSearchParams() should be wrapped in a suspense boundary` — build fails | Client component reads the URL, no `<Suspense>` | Wrap it in `page.tsx` (§4.8) |
| `You're importing a component that needs useState...` | Hooks in `page.tsx` | Move the interactive part into `<name>-client.tsx` (§4.8) |
| Login succeeds, then bounces back to `/login` | `secure: true` on `localhost` (HTTP), so the cookie is discarded | Tie `secure` to `NODE_ENV` (§4.4) |
| Logout leaves you logged in | `remove()` called without the same `path` | `Cookies.remove(TOKEN_KEY, { path: "/" })` |
| Navbar still says "Log in" after logging in | Server Components holding the old cookie | Call `router.refresh()` after login |
| `Hydration failed because the server rendered HTML didn't match the client` | Navbar reads the cookie with `js-cookie`, which is blind on the server | Use the `mounted` pattern (§4.10) |
| `data.token` is `undefined`, login "works" but stores nothing | Response envelope not unwrapped | `return data.data` — see §4.5 |
| `Property 'asChild' does not exist` on `<Button>` | Your shadcn preset is base-ui, not radix | Style a `<Link>` with `buttonVariants({ variant, size })` instead |
| `Mail config missing. Set SMTP_HOST...` | SMTP variables absent from `.env` | Add all five plus `SMTP_DEFAULT_FROM` (§4.13) |
| No email arrives | Wrong Mailtrap credentials, or looking in a real inbox | Sandbox mail only appears in your **Mailtrap** inbox, never a real one |
| Step 2 of the wizard shows step 1's values | Both `<form>`s share one DOM node | Give each form a distinct `key` (§4.14) |
| "Verified" badge does not update after verifying | Cached user is stale | `invalidateQueries({ queryKey: authKeys.user() })` in `useVerifyEmail` |
| OTP always "Invalid or expired code" | Code already used, expired, or 5 failed attempts burned it | Request a fresh one — each is single-use |
| Type error about `Promise<ReadonlyRequestCookies>` | Missing `await` | `const cookieStore = await cookies()` |
| A protected page loads without logging in | The page is outside the `(protected)` folder | Move it inside — only that folder is guarded (§4.9) |
| `You cannot have two parallel pages that resolve to the same path` | Two groups both define the same route, e.g. `page.tsx` and `(main)/page.tsx` | Keep one file per URL; brackets do not make the paths different |
| Every request 401s after a week | Cookie outlived the JWT | Match `expires` to your token expiry |
| `401` on `/auth/me` but login worked | Token not being attached | Check the request interceptor; look at the Authorization header in the Network tab |
| CORS error on login | Backend not allowing your origin | `CLIENT_URL=http://localhost:3000` in `backend/.env` |
| Another user's data on the dashboard | A personalised fetch got cached | Add `cache: "no-store"` |

---

## Practice Exercises

### Exercise 1: Backend First
1. Install `bcrypt` and `jsonwebtoken`, set a real `JWT_SECRET`
2. Build the six files from §4.2, following Lesson 20
3. Change the roles to your project's roles
4. Register, log in and call `/auth/me` from `api.http` — all three working before any frontend

### Exercise 2: Cookie Login
1. Install the frontend packages and add the shadcn components
2. Create `lib/auth.ts`, `services/api.ts`, `services/authApi.ts`
3. Create `providers.tsx` and **wire it into `layout.tsx`**
4. Build the login page as **two files** — `page.tsx` and `login-client.tsx` — and log in
5. Open DevTools → Application → Cookies and see your `token` sitting there
6. Now move the `"use client"` into `page.tsx` and delete the split. Read the error, then put it back — that error is the reason for the convention

### Exercise 3: Register and Log Out
1. Build the register page with all your fields including role
2. Add a navbar showing the user's name with a Log out button
3. Confirm logout clears the cookie and redirects
4. Confirm the navbar updates immediately — if not, you are missing `router.refresh()`

### Exercise 4: Protect Your Routes
1. Restructure `src/app/` into the three parts from §4.9 — landing page, `(auth)`, `(protected)`
2. Write both layout guards
3. Run `npm run build` and confirm the bracketed folders do **not** appear in the route list
4. Log out, then visit `/dashboard` directly — you should land on `/login`
5. Log in and confirm you can reach it, and that `/login` now bounces you home

### Exercise 5: Prove the Point of Cookies
1. Build the dashboard as a **Server Component** reading `await cookies()`
2. View source in the browser — your name is in the HTML, not fetched afterwards
3. Now try the same with `localStorage` and explain in one sentence why it cannot work

### Exercise 6: The OTP Flows
1. Add the mail config, `OtpToken`, `otpService` and `mailService`, and set up a free Mailtrap sandbox
2. Build the five endpoints and work through all six requests in §4.13 with the REST Client
3. Build the forgot-password wizard and reset your own password end to end
4. Build the profile page, verify your email, and watch the badge change
5. **Request a code, then use it twice.** The second attempt must fail — explain why in one sentence
6. **Request a code, then guess wrong five times.** Check the token in Atlas: `attempts` is 5 and `consumedAt` is set

### Exercise 7: Try to Break It
1. In DevTools, edit your `token` cookie to `rubbish` and reload `/dashboard`
2. The page loads (the cookie exists!) but the API returns 401
3. **Write down why**, and who is actually enforcing security. That is your viva answer

---

## Key Takeaways
1. The backend auth module is **identical to Lesson 20** — only token *storage* changes
2. `localStorage` is invisible to the server; a **cookie is sent with every request**, so Server Components can read it
3. **Every page is two files**: a server `page.tsx` and a `<name>-client.tsx`. Never put `"use client"` in `page.tsx` — it closes the door on all server work
4. Wrap the client component in `<Suspense>`. Without it, any `useSearchParams()` **fails the build**
5. All cookie access goes through `lib/auth.ts` — one place to change
6. `secure: process.env.NODE_ENV === "production"` or login silently fails on localhost
7. Pass the same `path` to `remove()` as you did to `set()`, or logout does nothing
8. Guard `window` with `typeof window !== "undefined"` — this code runs on the server too
9. `<Providers>` must be wired into the root layout, or React Query throws at build time
10. Call `router.refresh()` after login/logout so Server Components see the new cookie
11. `cookies()` is **async** — `await` it
12. **Route groups** are the guard: `(auth)` and `(protected)` shape the folders without changing the URLs. You do not need `proxy.ts`
13. Frontend route guards are UX only. **`requireAuth` on the backend is the real security**
14. The cookie is not `httpOnly`, so XSS exposure matches `localStorage` — know this, and say so honestly in your defence
15. OTPs are **hashed at rest, single-use, time-limited and attempt-limited** — you cannot look one up in your own database, which is the point
16. `forgot-password` must answer identically for a known and an unknown email, or it leaks who has an account
17. The five OTP endpoints return `{ message }` with **no `{ data }` envelope** — do not unwrap twice
18. Give each step of a multi-step form its own `useForm` and its own `key`

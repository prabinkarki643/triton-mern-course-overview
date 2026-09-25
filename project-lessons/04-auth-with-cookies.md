# Project Lesson 04: Authentication (Next.js + Cookies)

## What You Will Learn
- Which parts of our auth module stay **exactly the same**, and the one part that changes
- Building the auth backend: `User` model, bcrypt, JWT, validators, `requireAuth` middleware
- Storing the JWT in a **cookie** with `js-cookie` instead of `localStorage`
- Why a cookie lets your **Server Components** read the token, and what that unlocks
- Attaching the token to every request with an Axios interceptor
- React Query hooks: `useLogin`, `useRegister`, `useCurrentUser`, `useLogout`
- Protecting routes two ways: `proxy.ts` and a route-group layout
- The honest security position on this approach — and the viva answer

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
| Route protection | `<ProtectedRoute>` wrapper | `proxy.ts` + route-group layout |
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
  login: async (payload: LoginData): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/login", payload);
    return data;
  },
  register: async (payload: RegisterData): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/register", payload);
    return data;
  },
  getMe: async (): Promise<User> => {
    const { data } = await api.get<{ user: User }>("/auth/me");
    return data.user;
  },
};
```

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

## 4.8 The Login Page

Exactly the Lesson 21 form, using the `Field` pattern from project Lesson 01 §1.9.1:

```tsx
// src/app/login/page.tsx
"use client";

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

export default function LoginPage() {
  const login = useLogin();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginFormData) {
    login.mutate(values);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
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
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
```

With the schema from Lesson 21:

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

**The register page is the same shape** with more fields — name, email, password, phone, role. Copy the structure from Lesson 21 §21.10.

---

## 4.9 Protecting Routes

In BookMyRoom you wrapped pages in `<ProtectedRoute>`. Next.js gives you two better places to do it, and you should use **both**.

### Layer 1 — `proxy.ts` (redirect before the page loads)

Create `src/proxy.ts` (next to `app/`, not inside it):

```ts
// src/proxy.ts
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/my-bookings", "/owner"];
const AUTH_PAGES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  // Not logged in, asking for a protected page -> send to login
  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already logged in, asking for login/register -> send home
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

**This only works because the token is in a cookie.** `request.cookies` reads it before your page renders. With `localStorage` this file could not see the token at all — that is the change in one sentence.

> **`proxy.ts`, not `middleware.ts`.** Next.js 16 renamed this file. Older tutorials — and the BookMyRoom-era docs — say `middleware.ts` with `export function middleware()`. That still runs, but prints a deprecation warning on every build. If you inherited a `middleware.ts`, rename the file to `proxy.ts` and the function to `proxy`, or run `npx @next/codemod@canary middleware-to-proxy .`

### Layer 2 — a route-group layout (the real check)

Group your protected pages in a folder with brackets. `(protected)` does **not** appear in the URL — it exists only to share a layout:

```
src/app/
├── (protected)/
│   ├── layout.tsx          ← the guard
│   └── dashboard/
│       └── page.tsx        →  /dashboard
├── login/
│   └── page.tsx            →  /login
└── page.tsx                →  /
```

```tsx
// src/app/(protected)/layout.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  return <>{children}</>;
}
```

> **`await cookies()`** — it is asynchronous. Forget the `await` and you get a confusing type error about `Promise<ReadonlyRequestCookies>`. Older tutorials show it without, because it changed in Next.js 15.

### Why both?

`proxy.ts` runs at the network edge and is the fast redirect, but it is a convenience — Next's own docs recommend not depending on it alone. The layout check runs on the server as part of rendering, so it still applies if the proxy is ever bypassed.

**Neither replaces backend authorisation.** Both check only that *a* cookie exists — not that the token is valid, unexpired, or has the right role. A forged cookie gets past both. Your API must verify the token with `requireAuth` on every protected endpoint. **This is a favourite viva question: "what stops me editing that cookie?" The answer is `requireAuth` on the backend — the frontend checks are purely for user experience.**

---

## 4.10 Reading the User in a Server Component

This is what the cookie buys you. No loading spinner — the HTML arrives with the user's name already in it:

```tsx
// src/app/(protected)/dashboard/page.tsx
import { cookies } from "next/headers";

interface MeResponse {
  user: { name: string; email: string; role: string };
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return <p className="p-6">Could not load your profile.</p>;
  }

  const { user }: MeResponse = await res.json();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
      <p className="text-muted-foreground">{user.email}</p>
    </main>
  );
}
```

Note `cache: "no-store"` — without it Next.js may cache one user's response and serve it to another. **Never cache a personalised request.**

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

**What we gained** is server access, not security: Server Components and `proxy.ts` can see the token.

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

## 4.12 When Things Go Wrong

| Error | Cause | Fix |
|-------|-------|-----|
| `No QueryClient set, use QueryClientProvider to set one` | `<Providers>` not wired into the root layout | §4.6 — wrap `{children}` in `layout.tsx` |
| `ReferenceError: window is not defined` | Touching `window` in code that runs on the server | Guard with `typeof window !== "undefined"` |
| Login succeeds, then bounces back to `/login` | `secure: true` on `localhost` (HTTP), so the cookie is discarded | Tie `secure` to `NODE_ENV` (§4.4) |
| Logout leaves you logged in | `remove()` called without the same `path` | `Cookies.remove(TOKEN_KEY, { path: "/" })` |
| Navbar still says "Log in" after logging in | Server Components holding the old cookie | Call `router.refresh()` after login |
| Type error about `Promise<ReadonlyRequestCookies>` | Missing `await` | `const cookieStore = await cookies()` |
| Build warns about `middleware-to-proxy` | File is named `middleware.ts` | Rename to `proxy.ts`, function to `proxy` (§4.9) |
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
4. Build the login page and log in
5. Open DevTools → Application → Cookies and see your `token` sitting there

### Exercise 3: Register and Log Out
1. Build the register page with all your fields including role
2. Add a navbar showing the user's name with a Log out button
3. Confirm logout clears the cookie and redirects
4. Confirm the navbar updates immediately — if not, you are missing `router.refresh()`

### Exercise 4: Protect Your Routes
1. Add `proxy.ts` with your project's protected paths
2. Create the `(protected)` route group with its layout guard
3. Log out, then visit `/dashboard` directly — you should land on `/login`
4. Log in and confirm you can reach it

### Exercise 5: Prove the Point of Cookies
1. Build the dashboard as a **Server Component** reading `await cookies()`
2. View source in the browser — your name is in the HTML, not fetched afterwards
3. Now try the same with `localStorage` and explain in one sentence why it cannot work

### Exercise 6: Try to Break It
1. In DevTools, edit your `token` cookie to `rubbish` and reload `/dashboard`
2. The page loads (the cookie exists!) but the API returns 401
3. **Write down why**, and who is actually enforcing security. That is your viva answer

---

## Key Takeaways
1. The backend auth module is **identical to Lesson 20** — only token *storage* changes
2. `localStorage` is invisible to the server; a **cookie is sent with every request**, so Server Components can read it
3. All cookie access goes through `lib/auth.ts` — one place to change
4. `secure: process.env.NODE_ENV === "production"` or login silently fails on localhost
5. Pass the same `path` to `remove()` as you did to `set()`, or logout does nothing
6. Guard `window` with `typeof window !== "undefined"` — this code runs on the server too
7. `<Providers>` must be wired into the root layout, or React Query throws at build time
8. Call `router.refresh()` after login/logout so Server Components see the new cookie
9. `cookies()` is **async** — `await` it
10. The file is **`proxy.ts`** in Next 16, not `middleware.ts`
11. Frontend route guards are UX only. **`requireAuth` on the backend is the real security**
12. The cookie is not `httpOnly`, so XSS exposure matches `localStorage` — know this, and say so honestly in your defence

# Project Lesson 01: Next.js + shadcn/ui Setup

## What You Will Learn
- Why we are using **Next.js** for your final year project instead of Vite
- Creating a Next.js app with `npx create-next-app@latest my-app --yes`
- What the `--yes` flag decides for you, and what each generated file does
- Running the dev server and understanding the App Router (a folder = a page)
- The difference between **Server Components** and **Client Components**, and when you need `"use client"`
- Adding shadcn/ui with `npx shadcn@latest init`
- Adding components with `npx shadcn@latest add button card input label`
- Building forms with the **`Field`** components — the old `form` component no longer exists
- Building a first page with those components to prove the setup works
- Pointing your Next.js frontend at your Express backend with `.env.local`

**This is your reference lesson.** Every time you start a new project — or need to remember a command — come back to this file.

---

## 1.1 Why Next.js This Time?

Throughout the course we built our frontends with **Vite**. For your final year project we are switching to **Next.js**. Both give you React; the difference is how much comes in the box.

| | Vite (what we used) | Next.js (what we use now) |
|---|---|---|
| Routing | You install React Router and configure it | Built in — a folder becomes a page |
| Rendering | Everything renders in the browser | Can render on the server, so pages arrive ready |
| SEO | Weak — search engines see an empty page first | Strong — real HTML is sent |
| Images, fonts | You handle it | Optimised automatically |
| Deployment | Build, then host the files | Deploy straight to Vercel |

**Two things that matter for your project:**

1. **It looks professional in your defence.** Next.js is what companies in Nepal and abroad actually hire for. Being able to explain server rendering earns marks.
2. **Your backend does not change.** You still write **Node.js + Express + MongoDB** exactly as you did for BookMyRoom. Next.js replaces the *frontend* only. Two separate projects, two terminals, same as before.

> **Note:** Next.js can write backend code too (Route Handlers). We are **not** using that. Your backend stays a separate Express project, because that is what you have learned and what your syllabus expects.

---

## 1.2 Before You Start

Check your Node.js version:

```bash
node -v
```

You need **Node.js 20.19 or newer** (22 LTS recommended). If your version is older, download the current LTS from [nodejs.org](https://nodejs.org) and install it before continuing.

---

## 1.3 Creating the App

Open your terminal, `cd` into the folder where you keep your projects, and run:

```bash
npx create-next-app@latest my-app --yes
```

Replace `my-app` with your own project name — for example `futsal-booking-frontend`.

### What is happening here?

| Part | Meaning |
|------|---------|
| `npx` | Runs a package without permanently installing it |
| `create-next-app@latest` | The official Next.js project generator, latest version |
| `my-app` | The folder name to create |
| `--yes` | Skip all the questions and use the recommended defaults |

### What `--yes` chooses for you

The flag accepts the recommended setup, which is:

- **TypeScript** — the same TypeScript you used all course
- **Tailwind CSS** (v4) — already wired up, nothing to configure
- **ESLint** — catches mistakes as you type
- **App Router** — the modern routing system
- **Turbopack** — a very fast dev server
- **`@/*` import alias** — so you write `@/components/ui/button` instead of `../../../components/ui/button`

It also runs `git init` for you, so your project is a git repository from the first second.

> **Want to choose yourself?** Drop the flag and run `npx create-next-app@latest`. It will ask you each question one at a time. For your project, the defaults are what you want — use `--yes`.

You should end with:

```
Success! Created my-app at /Users/you/projects/my-app
```

---

## 1.4 Running the Dev Server

```bash
cd my-app
npm run dev
```

Open **http://localhost:3000** and you will see the Next.js welcome page.

> **Port clash warning.** Next.js uses port **3000** — the same port your Todo frontend used. Your Express backend runs on **4001**, so those two are fine together. But if something else is already on 3000, Next.js will move to 3001 and tell you. Always read the URL the terminal prints rather than assuming.

Leave this terminal running while you work. Save a file and the browser updates instantly.

### The scripts you have

```bash
npm run dev      # development server with hot reload
npm run build    # production build (run this before deploying)
npm run start    # run the production build locally
npm run lint     # check code for problems
```

---

## 1.5 What Was Generated

```
my-app/
├── src/
│   └── app/                  # your pages live here
│       ├── favicon.ico
│       ├── globals.css       # Tailwind + your theme colours
│       ├── layout.tsx        # wraps every page (header, fonts, <html>)
│       └── page.tsx          # the home page  →  /
├── public/                   # static files (images, logos)
├── next.config.ts            # Next.js configuration
├── tsconfig.json             # TypeScript config, including the @/* alias
├── eslint.config.mjs
├── package.json
├── AGENTS.md                 # notes for AI coding tools
└── CLAUDE.md                 # notes for AI coding tools
```

> **`src/` or not?** Depending on your answers (or saved preferences), your pages may be at `src/app/` **or** at `app/` in the project root. Both are correct and everything below works the same — just check which one you have and use that path. Open `tsconfig.json` and look at `"paths"` to confirm what `@/` points at.

### The two files you will touch most

**`src/app/layout.tsx`** — wraps every page in your app. Your navbar and footer go here so they appear everywhere.

**`src/app/page.tsx`** — the home page. Delete its contents and start building.

---

## 1.6 The App Router: A Folder Is a Page

This is the single most important Next.js concept, and the biggest difference from React Router.

**There is no routes file.** You create a folder, put a `page.tsx` inside it, and that URL exists.

| File | URL |
|------|-----|
| `src/app/page.tsx` | `/` |
| `src/app/about/page.tsx` | `/about` |
| `src/app/rooms/page.tsx` | `/rooms` |
| `src/app/rooms/[id]/page.tsx` | `/rooms/123` (dynamic) |
| `src/app/owner/dashboard/page.tsx` | `/owner/dashboard` |

The file **must** be called `page.tsx`. A folder without one is not a route.

### Try it now

Create `src/app/about/page.tsx`:

```tsx
export default function AboutPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">About Us</h1>
      <p className="mt-2 text-muted-foreground">
        This page exists because the file exists.
      </p>
    </main>
  );
}
```

Visit **http://localhost:3000/about**. No configuration, no route registration.

### Linking between pages

Use Next's `Link`, not a plain `<a>` — `<a>` reloads the whole page and loses your app's speed.

```tsx
import Link from "next/link";

<Link href="/about">About Us</Link>
```

---

## 1.7 Server Components vs Client Components

In Next.js, **every component is a Server Component by default**. It runs on the server, and only the finished HTML is sent to the browser.

That is excellent for pages that just display data — but a Server Component **cannot** use `useState`, `useEffect`, or `onClick`, because none of those exist on a server.

When you need interactivity, put `"use client"` at the very top of the file:

```tsx
"use client";

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>;
}
```

### Which do I use?

| Your component… | Type |
|-----------------|------|
| Only displays data | Server Component (default — do nothing) |
| Uses `useState` or `useEffect` | Add `"use client"` |
| Has `onClick`, `onChange`, form handling | Add `"use client"` |
| Uses React Hook Form / React Query | Add `"use client"` |

**The error you will definitely see:**

```
You're importing a component that needs `useState`. This React hook only works
in a Client Component. To fix, mark the file with the "use client" directive.
```

That message is telling you exactly what to do — add `"use client"` to the top of that file.

> **Practical tip:** keep pages as Server Components and push the interactive bits into small client components. Your login form is a client component; the page holding it does not have to be.

---

## 1.8 Adding shadcn/ui

You already know shadcn/ui from Lesson 11 — components are **copied into your project**, so you own and edit them. Same tool, and it understands Next.js.

Make sure you are inside your project folder, then run:

```bash
npx shadcn@latest init
```

### The questions it asks

**1. Which preset would you like to use?**

```
❯ Nova  - Lucide / Geist
  Vega
  Maia
  Lyra
  Mira
  Luma
  Sera
  Rhea
  Custom
```

These are visual styles — different fonts, colours and corner rounding. **Nova** is the standard choice. Press Enter.

**2. Which component library?** — `radix`, `base`, or `aria`. These are the accessibility primitives underneath. Choose **radix**; it is what the course used and what most tutorials assume.

### The one-line version

To skip the prompts entirely:

```bash
npx shadcn@latest init -y -b radix -p nova
```

> **Gotcha:** `-b` means **base library** (`radix` / `base` / `aria`), *not* base colour. Running `-b neutral` fails with `Invalid enum value`. If you see that error, this is why.

### What init creates

```
✔ Created 1 file:
  - src/lib/utils.ts
✔ Updating src/app/globals.css
Project initialization completed.
```

| File | Purpose |
|------|---------|
| `components.json` | shadcn configuration — where components go, which style |
| `src/lib/utils.ts` | the `cn()` helper for merging Tailwind classes |
| `src/app/globals.css` | updated with theme colour variables (light and dark) |

It also installs `radix-ui`, `lucide-react` (icons), `class-variance-authority` and `tw-animate-css`.

> **Starting completely fresh?** `npx shadcn@latest init -t next` scaffolds a brand new Next.js project with shadcn already configured — one command instead of two. Use it once you are comfortable; for now, doing it in two steps helps you see what each tool contributes.

---

## 1.9 Adding Components

Add only what you need, one command, as many as you like:

```bash
npx shadcn@latest add button card input label
```

```
✔ Created 4 files:
  - src/components/ui/button.tsx
  - src/components/ui/card.tsx
  - src/components/ui/input.tsx
  - src/components/ui/label.tsx
```

**Open one of those files and read it.** It is ordinary TypeScript and Tailwind. You can change any of it — that is the entire point of shadcn/ui.

### Components you will want for a booking project

```bash
# forms  (note: field, NOT form -- see 1.9.1 below)
npx shadcn@latest add field input label textarea select checkbox radio-group

# layout and display
npx shadcn@latest add card badge table separator avatar skeleton

# interaction
npx shadcn@latest add dialog dropdown-menu sonner tabs

# booking specific
npx shadcn@latest add calendar popover
```

Add them as you need them, not all at once.

---

## 1.9.1 Forms: Use `field`, Not `form`

> **Read this section before you build any form.** It will save you an hour of confusion.

shadcn/ui **replaced** the old `Form` component with the newer **`Field`** components. If you follow an older tutorial or YouTube video, it will tell you to run this:

```bash
npx shadcn@latest add form     # ← the old way, no longer works
```

**That command now does nothing.** It prints `✔ Checking registry.`, exits successfully with no error, and creates **no files**. Then your imports fail and you cannot see why, because nothing told you anything went wrong.

The command you actually want is:

```bash
npx shadcn@latest add field
```

which creates `src/components/ui/field.tsx` (plus `label.tsx` and `separator.tsx`, which it depends on).

### Old way vs new way

| Old (`form`) | New (`field`) |
|--------------|---------------|
| `<Form {...form}>` wrapper | No wrapper — use a plain `<form>` |
| `<FormField control={...} />` | `<Controller />` straight from React Hook Form |
| `<FormItem>` | `<Field>` |
| `<FormLabel>` | `<FieldLabel>` |
| `<FormControl>` | *(gone — put props on the input directly)* |
| `<FormDescription>` | `<FieldDescription>` |
| `<FormMessage>` | `<FieldError>` |

What you gain: `Controller` is standard React Hook Form, so the skill transfers to any project, shadcn or not. Nothing is hidden behind a custom wrapper.

### Components in `field.tsx`

`Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldSet`, `FieldLegend`, `FieldSeparator`, `FieldContent`, `FieldTitle`

### A working example

Install the form libraries first — the same three you used in Lesson 12:

```bash
npm install react-hook-form zod @hookform/resolvers
npx shadcn@latest add field input button
```

Then `src/app/page.tsx`:

```tsx
"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const bookingSchema = z.object({
  fullName: z.string().min(3, "Name must be at least 3 characters."),
  email: z.email("Enter a valid email address."),
});

type BookingValues = z.infer<typeof bookingSchema>;

export default function BookingForm() {
  const form = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { fullName: "", email: "" },
  });

  function onSubmit(values: BookingValues) {
    console.log(values);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-sm p-6">
      <FieldGroup>
        <Controller
          name="fullName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Full name</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="Ram Bahadur"
              />
              <FieldDescription>The name on the booking.</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Button type="submit">Confirm booking</Button>
      </FieldGroup>
    </form>
  );
}
```

### The pattern to memorise

Every field follows the same four lines:

```tsx
<Controller
  name="yourFieldName"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Your Label</FieldLabel>
      <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

Copy that block, change `name`, the label and the input. That is every form in your project.

**Three details that matter:**

- `"use client"` at the top — forms use state, so this is compulsory
- `data-invalid` on `<Field>` turns the label red; `aria-invalid` on the input tells screen readers. Both, not one
- `z.email("...")` is the Zod 4 way. Older tutorials write `z.string().email()` — it still runs, but `z.email()` is current and matches the rest of the course

> **You have already seen this pattern.** The contact form in the Lesson 30 portfolio (`developer-portfolio/src/components/sections/Contact.tsx`) is written exactly this way. Open it when you want a longer, real example with four fields and a submit state.

### Browsing what exists

Every component, with live examples and code: **https://ui.shadcn.com/docs/components**

---

## 1.10 Proving the Setup Works

Replace everything in `src/app/page.tsx` with this:

```tsx
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Setup Complete</CardTitle>
          <CardDescription>
            Next.js and shadcn/ui are working together.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project">Project title</Label>
            <Input id="project" placeholder="Futsal Booking System" />
          </div>
        </CardContent>

        <CardFooter className="gap-2">
          <Button>Save</Button>
          <Button variant="outline">Cancel</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
```

Save and look at http://localhost:3000. A styled card with an input and two buttons means **everything is wired correctly** — Next.js, TypeScript, Tailwind and shadcn/ui.

Note there is no `"use client"` here. Nothing is interactive yet, so it stays a Server Component.

### Button variants available

```tsx
<Button>Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link</Button>

<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon">🔍</Button>
```

### Adding interactivity

Create `src/components/counter.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <Button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </Button>
  );
}
```

Import it into your page. The page stays a Server Component; only the counter is a Client Component. That is the pattern you will use throughout your project.

---

## 1.11 Connecting to Your Express Backend

Your backend is a separate project on a different port. The frontend needs to know that address, and it must not be hard-coded.

Create **`.env.local`** in your project root:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4001/api
```

Also create **`.env.example`** with the same key and no real value, so your teammate knows what to set:

```bash
# Copy this file to .env.local and set your own values
#   cp .env.example .env.local

# Base URL of your Express backend.
# The trailing /api matters — routes are mounted at /api/... on the backend.
NEXT_PUBLIC_API_URL=http://localhost:4001/api
```

### The `NEXT_PUBLIC_` prefix

In Vite you wrote `VITE_API_URL`. In Next.js the prefix is **`NEXT_PUBLIC_`**, and the rule is the same:

- `NEXT_PUBLIC_ANYTHING` → sent to the browser, readable by anyone
- `ANYTHING_ELSE` → stays on the server only

**Never put a secret in a `NEXT_PUBLIC_` variable.** Your JWT secret and database URI belong in the *backend's* `.env`, never here.

Read it in code with:

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;
```

> **Important gotcha:** the generated `.gitignore` contains `.env*`, which ignores **`.env.example` as well**. Your teammate would never receive it. Fix it by adding this line to `.gitignore`:
>
> ```gitignore
> !.env.example
> ```
>
> Now `.env.local` stays private and `.env.example` gets committed — exactly what you want.

### Running both projects

Two terminals, backend first:

```bash
# Terminal 1
cd your-backend
npm run dev          # http://localhost:4001

# Terminal 2
cd your-frontend
npm run dev          # http://localhost:3000
```

And in your backend's `.env`, set `CLIENT_URL=http://localhost:3000` so CORS allows your Next.js app. Forget this and every request fails with a CORS error.

---

## 1.12 When Things Go Wrong

| Error | Cause | Fix |
|-------|-------|-----|
| `You're importing a component that needs useState...` | Interactivity in a Server Component | Add `"use client"` at the top of that file |
| `Module not found: Can't resolve '@/components/ui/button'` | Component not added yet, or wrong alias | Run `npx shadcn@latest add button`; check `paths` in `tsconfig.json` |
| `npx shadcn@latest add form` succeeds but creates nothing | `form` was replaced by `field` | Run `npx shadcn@latest add field` — see section 1.9.1 |
| `Can't resolve '@/components/ui/form'` | Following an old tutorial | Use `Field` + `Controller` instead — see section 1.9.1 |
| `Invalid enum value. Expected 'radix' \| 'base' \| 'aria'` | Used `-b` for a colour | `-b` is the base library. Use `-b radix` |
| Port 3000 already in use | Something else is running | Next.js offers another port — or run `npm run dev -- -p 3005` |
| CORS error in the browser console | Backend does not allow your frontend origin | Set `CLIENT_URL=http://localhost:3000` in the backend `.env` |
| `process.env.NEXT_PUBLIC_API_URL` is `undefined` | Missing prefix, or server not restarted | Prefix must be `NEXT_PUBLIC_`; **restart `npm run dev`** after editing `.env.local` |
| Styles not applying | Editing the wrong CSS file | Theme lives in `src/app/globals.css` |
| shadcn command does nothing | Not in the project folder | `cd` into your project first — `components.json` must be present |

---

## Practice Exercises

### Exercise 1: Create Your Project
1. Create your Next.js app named after your chosen project title
2. Run the dev server and confirm the welcome page loads
3. Initialise shadcn/ui with the Nova preset and the radix base
4. Add `button`, `card`, `input` and `label`
5. Replace the home page with the card from section 1.10

### Exercise 2: Build Your Route Skeleton
Create empty pages for the routes your project needs. For a booking app that is typically:

- `/` — home
- `/login` and `/register`
- `/listings` — browse everything
- `/listings/[id]` — one item's details
- `/owner/dashboard` — provider area
- `/my-bookings` — customer's own bookings

Each page just needs a heading for now. Confirm every URL loads.

### Exercise 3: Server vs Client
1. Build a shared navbar in `src/app/layout.tsx` linking your routes with `Link`
2. Add a client component with a `useState` toggle for the mobile menu
3. Deliberately remove `"use client"` and read the error carefully, then put it back

### Exercise 4: Build a Form with Field
1. Install `react-hook-form`, `zod` and `@hookform/resolvers`
2. Run `npx shadcn@latest add field input button`
3. Build your project's login form: email and password, validated with Zod
4. Submit with an invalid email and confirm the error appears under the input
5. For comparison, run `npx shadcn@latest add form` and notice it creates nothing — this is exactly the trap an old tutorial will lead you into

### Exercise 5: Wire Up the Backend Address
1. Create `.env.local` with `NEXT_PUBLIC_API_URL`
2. Create `.env.example` and add `!.env.example` to `.gitignore`
3. Render the value on a page to prove it is read
4. Run `git status` and confirm `.env.example` is tracked and `.env.local` is not

---

## Key Takeaways
1. **Next.js replaces Vite for the frontend only** — your Express + MongoDB backend is unchanged
2. `npx create-next-app@latest my-app --yes` gives you TypeScript, Tailwind, ESLint, App Router and the `@/*` alias in one command
3. **A folder with `page.tsx` is a route** — no route configuration file
4. Components are **Server Components by default**; add `"use client"` for state, effects or event handlers
5. `npx shadcn@latest init` sets up shadcn; `-b` selects the base library (`radix`), not a colour
6. `npx shadcn@latest add <component>` copies real, editable files into `src/components/ui/`
7. **Forms use `field`, not `form`** — `add form` silently creates nothing. Use `Controller` + `Field` + `FieldError`
8. Browser-visible environment variables **must** start with `NEXT_PUBLIC_`, and never contain secrets
9. Add `!.env.example` to `.gitignore`, or your teammate never gets the template
10. Restart the dev server after changing `.env.local`
11. Come back to this lesson whenever you set up a new project — these commands do not change

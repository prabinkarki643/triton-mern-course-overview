# Lesson 30: Build & Ship a Developer Portfolio

## What You Will Learn
- How to scaffold a fresh Vite + React + shadcn/ui project the same way we've been doing
- A **data-first** structure -- content lives in `src/data/*.ts`, components just render
- Single-page layout with anchor-link navigation (no router needed)
- Reusing our shadcn theme provider so **light / dark mode** works with one press of `d` or a click
- Building sections: **Hero**, **About**, **Skills**, **Projects**, **Contact**
- A **contact form that opens Gmail** with subject + body pre-filled -- no backend, no SMTP creds
- Adding your own **brand accent colour** to the shadcn theme tokens
- Deploying the finished site for free on **Firebase Hosting**
- Optional: registering a **free `.np` domain** at register.com.np and pointing it at Firebase via **Cloudflare**

---

## 30.1 Why a Portfolio?

You just finished a full-stack booking app. That is a real thing to show off. But a recruiter opening your CV is not going to clone your repo -- they will click **one link**. That link needs to open a fast, clean page that answers three questions in ten seconds:

1. Who are you?
2. What can you actually build?
3. How do I contact you?

That is what this lesson builds. A **single-page portfolio** with your name, a short about, your skill list, links to the projects you have shipped, and a contact form. Boring on purpose -- portfolios are marketing, not art.

By the end of the lesson your site will be live at `https://your-portfolio.web.app` (Firebase Hosting), optionally at a `.np` domain like `yourname.com.np`.

---

## 30.2 Project Setup

We use the same scaffold as every other course project -- Vite + React + shadcn/ui with the `base-nova` preset.

Create the project **next to** `bookmyroom_app/`, not inside it:

```bash
cd triton-college/react-node-course
npx shadcn@latest init --template vite --name developer-portfolio
cd developer-portfolio
npm install
```

The scaffold gives you:

- Vite + React 19 + TypeScript
- Tailwind 4 (already wired)
- shadcn CLI configured (`components.json`)
- A working `ThemeProvider` in `src/components/theme-provider.tsx` (dark mode + `d` key toggle)
- `Button` component pre-installed
- A stub `App.tsx` you can safely replace

Confirm it runs before you touch anything:

```bash
npm run dev
```

Open `http://localhost:5173` (Vite's default). You should see "Project ready!" with a button. Kill the server with `Ctrl+C`.

> **Node version.** Vite 8's build tooling needs **Node 20.19 or newer**. If `npm run dev` throws `styleText` from `node:util`, upgrade Node with `nvm install 20 && nvm use 20` (or `brew upgrade node` on macOS).

### Add the shadcn components we'll use

```bash
npx shadcn@latest add card badge input textarea label separator
```

We already have `button`; that plus these six is everything the portfolio needs.

---

## 30.3 Folder Layout

We are going to split the codebase into three responsibilities: **data**, **types**, and **components**.

```
developer-portfolio/
├── public/
│   └── images/
│       ├── logo.png          (already there)
│       ├── profile.jpeg      (already there)
│       └── projects/
│           └── book_my_room.png
└── src/
    ├── App.tsx               # Stitches sections together
    ├── main.tsx              # Wraps App with ThemeProvider (already set up)
    ├── index.css             # Tailwind + shadcn tokens + our brand accent
    ├── components/
    │   ├── theme-provider.tsx    (already there)
    │   ├── theme-toggle.tsx      (new -- Sun/Moon button)
    │   ├── layout/
    │   │   ├── Navbar.tsx
    │   │   └── Footer.tsx
    │   ├── sections/
    │   │   ├── Hero.tsx
    │   │   ├── About.tsx
    │   │   ├── Skills.tsx
    │   │   ├── Projects.tsx
    │   │   └── Contact.tsx
    │   └── ui/                    (shadcn components)
    ├── data/
    │   ├── site.ts               # Name, socials, contact
    │   ├── navigation.ts         # Anchor links
    │   ├── profile.ts            # Hero + About copy
    │   ├── skills.ts             # Skill categories
    │   └── projects.ts           # Projects list
    ├── lib/
    │   ├── utils.ts              (already there -- shadcn cn())
    │   └── mailto.ts             # Gmail compose URL helper
    └── types/
        └── index.ts              # Shared TypeScript types
```

**Why data-first?** Every section reads from `src/data/*.ts` -- when you get a new job and want to update your role, you edit one line in `src/data/site.ts` rather than hunting through JSX.

---

## 30.4 Shared Types

Every data file uses TypeScript so a typo in a data file becomes a compile error rather than a broken page. One file defines every shape.

```typescript
// src/types/index.ts
import type { LucideIcon } from "lucide-react"

export interface SocialLink {
  label: string
  href: string
  icon: LucideIcon
}

export interface NavItem {
  label: string
  href: string
}

export interface SiteConfig {
  name: string
  initials: string
  role: string
  tagline: string
  email: string
  phone: string
  location: string
  logo: string
  socials: SocialLink[]
}

export interface QuickFact {
  label: string
  value: string
  icon: LucideIcon
}

export interface ProfileContent {
  eyebrow: string
  headline: string
  headlineAccent: string
  subheadline: string
  photo: string
  aboutParagraphs: string[]
  quickFacts: QuickFact[]
}

export interface SkillCategory {
  title: string
  icon: LucideIcon
  skills: string[]
}

export interface ProjectItem {
  title: string
  role: string
  description: string
  image: string
  tech: string[]
  liveUrl?: string
  sourceUrl?: string
  featured?: boolean
}
```

Icons come **as components** from lucide-react. Passing the component (rather than a string name) means when you rename an icon TypeScript catches it immediately, and there's no runtime lookup table.

---

## 30.5 Data Files

Each file is small, human-readable, and typed. Every section imports whichever one it needs.

### `src/data/site.ts`

```typescript
// The base-nova fork of lucide-react ships without brand icons, so we
// hand-roll GitHub and LinkedIn as inline SVGs (see below).
import { Mail } from "lucide-react"
import { GithubIcon, LinkedinIcon } from "@/components/shared/brand-icons"
import type { SiteConfig } from "@/types"

export const siteConfig: SiteConfig = {
  name: "Your Name",
  initials: "YN",
  role: "Junior Web Developer",
  tagline: "I build clean, modern web apps with React and Node.",
  email: "your.name@example.com",
  phone: "+977 98XXXXXXXX",
  location: "Kathmandu, Nepal",
  logo: "/images/logo.png",
  // Paste the Google Drive share URL (or a hosted PDF URL) for your CV.
  // The "Resume" button in the navbar opens this in a new tab.
  resumeUrl: "https://drive.google.com/file/d/PUT-YOUR-FILE-ID/view?usp=sharing",
  socials: [
    { label: "GitHub", href: "https://github.com/your-username", icon: GithubIcon },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/your-username", icon: LinkedinIcon },
    { label: "Email", href: "mailto:your.name@example.com", icon: Mail },
  ],
}
```

### Brand icons -- a two-file trick

Lucide-react in the `base-nova` preset ships a fork **without brand marks** (no `Github`, no `Linkedin`). Rather than pull a new dependency, we drop the two SVGs we need into a tiny file and import them like any other component:

```tsx
// src/components/shared/brand-icons.tsx
import type { SVGProps } from "react"

export function GithubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

export function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  )
}
```

Both SVGs use `fill="currentColor"` and `width/height="24"` -- the same conventions lucide uses -- so they mix cleanly with lucide icons anywhere on the page and inherit whatever `className` colour you set.

For `SocialLink.icon` to accept BOTH lucide icons and our brand SVGs, widen the type in `src/types/index.ts`:

```typescript
import type { LucideIcon } from "lucide-react"
import type { ComponentType, SVGProps } from "react"

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

export interface SocialLink {
  label: string
  href: string
  icon: IconComponent  // both LucideIcon and our brand SVGs satisfy this
}
```

### `src/data/navigation.ts`

```typescript
import type { NavItem } from "@/types"

export const navItems: NavItem[] = [
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Projects", href: "#projects" },
  { label: "Contact", href: "#contact" },
]
```

### `src/data/profile.ts`

```typescript
import { Briefcase, GraduationCap, Languages, MapPin } from "lucide-react"
import type { ProfileContent } from "@/types"

export const profile: ProfileContent = {
  eyebrow: "Available for work",
  headline: "I turn ideas into",
  headlineAccent: "web apps.",
  subheadline:
    "Junior full-stack developer trained in the MERN stack. I love clean UIs, well-typed code, and shipping small things that just work.",
  photo: "/images/profile.jpeg",
  aboutParagraphs: [
    "Hi -- I'm a recent computer-science graduate...",
    "I care about writing readable code, using TypeScript...",
    "I am open to junior or intern positions...",
  ],
  quickFacts: [
    { label: "Location", value: "Kathmandu, Nepal", icon: MapPin },
    { label: "Focus", value: "React · Node.js · MongoDB", icon: Briefcase },
    { label: "Education", value: "BSc CSIT", icon: GraduationCap },
    { label: "Languages", value: "English · Nepali", icon: Languages },
  ],
}
```

### `src/data/skills.ts`

```typescript
import { Code2, Database, GitBranch, Layout, Palette, Server } from "lucide-react"
import type { SkillCategory } from "@/types"

export const skillCategories: SkillCategory[] = [
  { title: "Languages", icon: Code2, skills: ["HTML", "CSS", "JavaScript", "TypeScript"] },
  { title: "Frontend", icon: Layout, skills: ["React", "React Router", "React Hook Form", "Zod"] },
  { title: "UI & Styling", icon: Palette, skills: ["Tailwind CSS", "shadcn/ui", "Responsive design"] },
  { title: "Data Fetching", icon: Server, skills: ["Axios", "React Query", "REST APIs"] },
  { title: "Backend", icon: Server, skills: ["Node.js", "Express", "JWT auth", "Nodemailer"] },
  { title: "Database", icon: Database, skills: ["MongoDB", "Mongoose", "Aggregation basics"] },
  { title: "Tooling", icon: GitBranch, skills: ["Git & GitHub", "Vite", "Vercel", "Render"] },
]
```

### `src/data/projects.ts`

```typescript
import type { ProjectItem } from "@/types"

export const projects: ProjectItem[] = [
  {
    title: "BookMyRoom",
    role: "Full-stack Developer",
    description:
      "A room-booking application built end-to-end. React + TypeScript on the front, Express + MongoDB on the back...",
    image: "/images/projects/book_my_room.png",
    tech: ["React", "TypeScript", "Node.js", "Express", "MongoDB", "Tailwind", "shadcn/ui", "React Query"],
    liveUrl: "https://your-bookmyroom.vercel.app",
    sourceUrl: "https://github.com/your-username/bookmyroom",
    featured: true,
  },
  {
    title: "Developer Portfolio",
    role: "Frontend Developer",
    description:
      "This site. A single-page portfolio built with Vite, React and shadcn/ui...",
    image: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1200&auto=format&fit=crop",
    tech: ["Vite", "React", "TypeScript", "Tailwind", "shadcn/ui", "Firebase"],
    liveUrl: "https://your-portfolio.web.app",
    sourceUrl: "https://github.com/your-username/developer-portfolio",
    featured: true,
  },
]
```

> **Placeholder images.** Use free Unsplash images while you don't have your own screenshots. Once the app is live, take a proper screenshot with the browser dev tools (Cmd+Shift+P -> "Capture full size screenshot"), drop it in `public/images/projects/`, and swap the URL. `book_my_room.png` and `profile.jpeg` already ship in the starter -- swap them for your own when ready.

---

## 30.6 Adding a Brand Accent Colour

The `base-nova` shadcn preset ships neutral -- everything is greyscale. Every good portfolio needs one accent that ties the page together. We'll add three CSS variables (`--brand`, `--brand-foreground`, `--brand-soft`) so components can style with them the same way they style with `bg-primary` or `text-muted-foreground`.

Open `src/index.css` and:

1. Register the tokens in `@theme inline`:

```css
@theme inline {
    /* ...existing tokens... */
    --color-brand: var(--brand);
    --color-brand-foreground: var(--brand-foreground);
    --color-brand-soft: var(--brand-soft);
}
```

2. Add the light and dark values:

```css
:root {
    /* ...existing values... */
    --brand: oklch(0.62 0.15 190);           /* teal */
    --brand-foreground: oklch(1 0 0);        /* white on teal */
    --brand-soft: oklch(0.95 0.03 190);      /* very pale teal */
}

.dark {
    /* ...existing dark values... */
    --brand: oklch(0.72 0.16 190);
    --brand-foreground: oklch(0.145 0 0);
    --brand-soft: oklch(0.25 0.05 190);
}
```

3. While we're in `index.css`, tell the browser to smoothly scroll anchor links and add a soft dot grid we'll use behind the hero:

```css
@layer base {
  html {
    @apply font-sans scroll-smooth;
  }
}

.dot-grid {
  background-image: radial-gradient(
    circle at 1px 1px,
    var(--border) 1px,
    transparent 0
  );
  background-size: 24px 24px;
  mask-image: linear-gradient(to bottom, black 30%, transparent 100%);
}
```

Now `text-brand`, `bg-brand`, `bg-brand-soft`, and `border-brand/40` work everywhere. Pick a different `oklch()` hue if you want a different vibe -- 190 is teal, 30 is warm orange, 285 is violet.

---

## 30.7 The Theme Toggle

The scaffold's `ThemeProvider` already handles storage + system preference + the keyboard shortcut (`d`). We just add a visible Sun/Moon button on the Navbar so users who don't know the shortcut still find it.

```tsx
// src/components/theme-toggle.tsx
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
```

The button toggles between exactly "light" and "dark" -- the `system` preference stays as a first-load default until the user clicks.

---

## 30.8 Navbar & Footer

The navbar is sticky, backdrop-blurs when you scroll past 12px, has a **Resume button** on the right that opens `siteConfig.resumeUrl` in a new tab, and includes a mobile hamburger drawer. All links live in `data/navigation.ts` so the desktop and mobile views can never drift apart.

```tsx
// src/components/layout/Navbar.tsx
import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { navItems } from "@/data/navigation"
import { siteConfig } from "@/data/site"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-40 border-b transition-colors ${
      scrolled ? "bg-background/85 backdrop-blur-md" : "border-transparent bg-transparent"
    }`}>
      {/* ... logo, links mapped from navItems, ThemeToggle, mobile hamburger ... */}
    </header>
  )
}
```

The Footer is a single-line component that reads `siteConfig.socials` and prints © + your name + the current year.

*(Complete source in the repo's `src/components/layout/Navbar.tsx` and `Footer.tsx`.)*

---

## 30.9 Sections

Each section is a self-contained `<section id="..." class="scroll-mt-20 py-20">` that reads from one data file. `scroll-mt-20` gives the anchor link enough space to clear the sticky navbar.

Rather than paste every line of every section here, we walk through the pattern once. The shared `SectionHeading` component keeps every section's heading identical:

```tsx
// Exported from About.tsx and reused everywhere
export function SectionHeading({ eyebrow, title, align = "left" }: {
  eyebrow: string; title: string; align?: "left" | "center"
}) {
  return (
    <div className={`flex flex-col gap-2 ${align === "center" ? "items-center text-center" : ""}`}>
      <span className="text-brand text-xs font-semibold tracking-widest uppercase">
        {eyebrow}
      </span>
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
    </div>
  )
}
```

### Hero (§components/sections/Hero.tsx)

- Two-column at `lg`: copy on the left, portrait on the right
- Copy = eyebrow badge ("Available for work" with animated ping), headline + accent word in `text-brand`, tagline, two CTA buttons (View Projects, Contact me), social row
- Portrait = square image with a soft gradient glow, rounded 3xl

The eyebrow badge uses the animated ping trick you've seen in the reference sites:

```tsx
<span className="relative flex size-2">
  <span className="bg-brand absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
  <span className="bg-brand relative inline-flex size-2 rounded-full" />
</span>
```

### About (§components/sections/About.tsx)

- Two-column: paragraphs on the left, four `<Card>` quick-facts on the right (Location, Focus, Education, Languages)
- Quick-fact icons render from lucide, coloured with `text-brand` on a `bg-brand-soft` badge

### Skills (§components/sections/Skills.tsx)

- Full-width `bg-muted/40` section so it visually separates from About
- Grid of category cards -- one per `skillCategory`, each holding its icon + a wrap of `<Badge variant="secondary">` chips

### Projects (§components/sections/Projects.tsx)

- Two-column card grid
- Each card: cover image with hover zoom, title + role, description, tech badges, live-demo + source buttons
- "Featured" prints a small tag in the top-right

### Contact (§components/sections/Contact.tsx)

Split into two cards side by side: the form on the left, contact info on the right. **This is where the Gmail trick lives** -- see §30.10.

---

## 30.10 A Contact Form That Opens Gmail

We have no backend on this site -- it's static. But we still want a "form" experience, not just a raw `mailto:` link. The trick: build a Gmail compose URL with pre-filled subject and body, then `window.open()` it when the user submits.

```typescript
// src/lib/mailto.ts
interface BuildMailUrlArgs {
  to: string
  subject: string
  body: string
}

export function buildGmailComposeUrl({ to, subject, body }: BuildMailUrlArgs): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to,
    su: subject,
    body,
  })
  return `https://mail.google.com/mail/?${params.toString()}`
}

export function buildMailtoUrl({ to, subject, body }: BuildMailUrlArgs): string {
  const query = new URLSearchParams({ subject, body }).toString()
  return `mailto:${to}?${query}`
}
```

Gmail's compose URL accepts `to`, `su` (subject) and `body`. Users signed into Gmail in the browser get a compose window with everything already typed in.

The form handler tries Gmail first and falls back to a plain `mailto:` link if the popup doesn't open (which usually means the browser blocked it or the user has no Gmail account signed in):

```tsx
const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault()

  const subject = values.subject.trim() || `Hello from ${values.name || "your portfolio"}`
  const body = [
    `Hi ${siteConfig.name},`,
    "",
    values.message,
    "",
    "---",
    `From: ${values.name}${values.email ? ` <${values.email}>` : ""}`,
  ].join("\n")

  const gmailUrl = buildGmailComposeUrl({ to: siteConfig.email, subject, body })
  const opened = window.open(gmailUrl, "_blank", "noopener,noreferrer")
  if (!opened) {
    window.location.href = buildMailtoUrl({ to: siteConfig.email, subject, body })
  }
}
```

**Advantages of this pattern:**
- Zero backend to run
- Zero SMTP credentials to leak
- Zero rate-limiting to worry about (it's the user's own Gmail)
- The user sees their own message in *their* Sent folder afterwards -- reassuring
- Anti-spam is Gmail's problem, not yours

**Disadvantages:**
- If the user isn't signed into Gmail we fall through to `mailto:` (Outlook, Apple Mail)
- If they use webmail from another provider, the fallback still works but it's less pretty

For a portfolio, the tradeoff is worth it every time. Ship this, not a backend.

The rest of the Contact section is a two-column layout: the form on the left, a "prefer direct?" info card on the right with email / phone / location and clickable socials.

---

## 30.11 Assembling `App.tsx`

Once each section is built, `App.tsx` is trivial -- it just stacks them in reading order.

```tsx
// src/App.tsx
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { Hero } from "@/components/sections/Hero"
import { About } from "@/components/sections/About"
import { Skills } from "@/components/sections/Skills"
import { Projects } from "@/components/sections/Projects"
import { Contact } from "@/components/sections/Contact"

export function App() {
  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}

export default App
```

That's the whole page. Every piece of copy is in `src/data/*.ts`; every visual detail is in the section component; every colour token is in `src/index.css`. **Nothing is duplicated.**

Update `index.html` while you're here so the browser tab and favicon look right:

```html
<link rel="icon" type="image/png" href="/images/logo.png" />
<meta name="description" content="Junior developer portfolio -- React, TypeScript, MongoDB." />
<title>Your Name -- Junior Web Developer</title>
```

Run `npm run dev` and click through every section. Toggle dark mode with the header button (or `d`). Fix anything that jumps.

---

## 30.12 Deploying to Firebase Hosting

Firebase Hosting is Google's static-site host. **Free tier: 10 GB storage + 360 MB/day bandwidth**, custom domains supported, HTTPS included, no credit card required for the free tier. Perfect for a portfolio.

### Step 1: Build

```bash
npm run build
```

Vite produces a `dist/` folder with the entire site inside. Preview locally to catch anything the build broke:

```bash
npm run preview
```

Visit `http://localhost:4173` -- everything should look identical to `npm run dev`.

### Step 2: Install the Firebase CLI

```bash
npm install -g firebase-tools
```

Log in with your Google account:

```bash
firebase login
```

A browser tab will open for you to authorise the CLI. Approve it.

### Step 3: Create a Firebase project

- Go to https://console.firebase.google.com
- Click **Add project** -> pick a name like `your-name-portfolio` -> disable Google Analytics (not needed) -> Create.

### Step 4: Initialise Firebase in your local project

```bash
cd developer-portfolio
firebase init hosting
```

The CLI asks a few questions -- answer them like this:

| Question | Answer |
|---|---|
| Please select an option | **Use an existing project** |
| Select a default Firebase project | Pick the one you just created |
| What do you want to use as your public directory? | **`dist`** |
| Configure as a single-page app? | **Yes** (this makes all routes fall back to `index.html` -- important for anchors) |
| Set up automatic builds and deploys with GitHub? | **No** (skip for now; you can wire it later) |
| File dist/index.html already exists. Overwrite? | **No** |

Firebase writes two files: `firebase.json` and `.firebaserc`. Commit them.

### Step 5: Deploy

```bash
firebase deploy
```

After ~20 seconds you get:

```
✔  Deploy complete!

Hosting URL: https://your-name-portfolio.web.app
```

Open the URL. Your portfolio is live. Every subsequent deploy is one command: `npm run build && firebase deploy`.

> **Common gotcha.** If you edit code and forget to `npm run build`, `firebase deploy` publishes the *old* `dist/` and nothing appears to change. Always build before you deploy. Add a script to `package.json`:
>
> ```json
> "scripts": {
>   "release": "npm run build && firebase deploy"
> }
> ```
>
> Then `npm run release` does both.

---

## 30.13 Optional: A Custom `.np` Domain via Cloudflare

Firebase gives you `your-name-portfolio.web.app`. It's fine. But `yourname.com.np` is nicer to write on a CV, and `.np` domains are **free** for Nepali residents.

The pipeline:

```
register.com.np  ─►  buy free .np domain
       │
       │  update nameservers
       ▼
  Cloudflare       ─►  manage DNS records
       │
       │  point at Firebase
       ▼
 Firebase Hosting  ─►  serve the site over HTTPS
```

### Step 1: Register a free `.np` domain

- Go to https://register.com.np
- Create an account (you'll need a Nepali phone number and a copy of your citizenship or passport for verification)
- Search for `yourname.com.np` (or `.dev.np`, `.info.np`, etc.)
- Add to cart -- it should show **NPR 0**
- Upload the required documents
- Verification takes 1-3 business days

Once approved, the domain appears in your dashboard with default Mercantile nameservers. We'll change those to Cloudflare.

### Step 2: Set up Cloudflare

- Go to https://cloudflare.com and create a free account
- **Add a site** -> enter `yourname.com.np` -> pick the **Free** plan
- Cloudflare scans for existing DNS records (there will be none)
- Cloudflare gives you two nameservers, e.g. `noel.ns.cloudflare.com` and `jean.ns.cloudflare.com`
- Copy them somewhere safe

### Step 3: Point the .np domain at Cloudflare

- Go back to https://register.com.np
- Open your domain -> **Nameserver update**
- Replace the Mercantile nameservers with the two Cloudflare gave you
- Save

DNS propagation for `.np` typically takes 30 minutes to a few hours. When Cloudflare's dashboard flips your site to "Active", you're through.

### Step 4: Add the custom domain in Firebase

- In Firebase Console -> Hosting -> click **Add custom domain**
- Enter `yourname.com.np` (and separately `www.yourname.com.np` if you want that too)
- Firebase shows you two records to add: usually a **TXT** record for ownership verification and one or two **A** records with the Firebase IPs

### Step 5: Add the records in Cloudflare

- In Cloudflare -> DNS -> Records
- Add the TXT record Firebase gave you (name `_firebase-hosting-challenge` or similar, content `<hash>`) -- **set proxy status to DNS only (grey cloud), not proxied**, for the initial verification
- Add the A records Firebase gave you -- again grey cloud for the first verification
- Save

Come back to Firebase, click **Verify**. When it succeeds Firebase issues a Let's Encrypt certificate (this can take up to 24 hours). Once the certificate is live, you can turn the Cloudflare proxy **on** (orange cloud) for CDN + DDoS protection.

That's it. `https://yourname.com.np` now serves your portfolio, behind Cloudflare's edge, for free forever.

> **Do not skip Cloudflare.** Even for a hobby site, the free CDN + DDoS + smart caching turns a slow Firebase-in-us-central page into a globally fast one at zero cost. See L29.5 for what else Cloudflare does.

---

## 30.14 Keeping It Alive

A portfolio is not a "set and forget" project. Ways to keep it fresh:

- Every time you ship a new project, add it to `src/data/projects.ts` and redeploy (`npm run release`)
- When you finish an internship / learn a new tool, update `src/data/skills.ts`
- Rewrite `src/data/profile.ts` at least once every six months -- the tone that fits "junior developer looking for first job" will feel wrong once you have a year of experience
- Take real screenshots of every project as soon as it's live; don't ship a placeholder for more than a week

The strength of the data-first structure is that these edits are one-liner changes to typed files. No refactor, no design meeting.

---

## Practice Exercises

1. **Personalise every field in `src/data/site.ts` and `src/data/profile.ts`.** Real name, real email, real GitHub URL. Do this before anything else so you're editing a portfolio that is actually yours.

2. **Replace the placeholder photos.** `public/images/profile.jpeg` and `public/images/projects/book_my_room.png` are placeholders -- take a real screenshot of your deployed BookMyRoom and a real head-and-shoulders photo of yourself.

3. **Change the brand accent.** Try `--brand: oklch(0.55 0.2 30)` (warm orange) or `oklch(0.55 0.22 285)` (violet). Pick whatever matches your personal taste, keep contrast readable in both light and dark mode.

4. **Add an Education section.** Copy the About / Skills pattern: a new `src/data/education.ts` with a typed array, a new `<Education />` section, an entry in `navigation.ts`. Slot it between Skills and Projects.

5. **Wire a GitHub star count.** In the Projects section, fetch `https://api.github.com/repos/<user>/<repo>` on mount, display `stargazers_count`. No auth needed for public repos; rate-limited to 60 requests/hour per IP.

6. **Deploy to Firebase.** Follow §30.12 end to end. When you have the `.web.app` URL, share it with a friend and ask them to try the contact form -- confirm Gmail opens with the message pre-filled.

7. **Buy the `.np` domain and point it at Firebase.** Follow §30.13. Complete the Cloudflare setup.

8. **Add analytics.** Sign up for [Plausible](https://plausible.io) (privacy-friendly, no cookies, free while under 10k views/month) or use Cloudflare's free Web Analytics. Paste the snippet into `index.html`.

9. **Stretch: WhatsApp button.** Add a floating "Chat on WhatsApp" button in the bottom-right that opens `https://wa.me/<your-number>?text=Hi!`. Same "no backend, just a URL" pattern as the Gmail form.

10. **Stretch: SEO tags.** Add proper `<meta property="og:title">`, `<meta property="og:description">`, and `<meta property="og:image">` to `index.html` so LinkedIn / Twitter / WhatsApp show a nice preview card when someone shares your URL.

---

## Key Takeaways

- **Content, structure, and style are three separate concerns.** Data lives in `src/data/*.ts`, structure lives in `src/components/**`, style lives in `src/index.css`. Editing your bio never touches JSX.
- **Anchor-link navigation beats a router for a single page** -- less code, better perceived performance, back button works naturally.
- **shadcn's `Card`, `Badge`, `Button`, `Input`, `Textarea`** are enough to build a professional portfolio. Resist installing more.
- **`ThemeProvider` from the scaffold already handles dark mode** -- you just added a visible toggle. Every page automatically respects the user's system preference.
- **Brand tokens in `@theme inline` let you use `text-brand` and `bg-brand`** the same way Tailwind's built-in colours work. One accent, defined once, used everywhere.
- **A Gmail-based contact form is the right default** for a portfolio -- no backend, no SMTP, no rate limits, message lands in the sender's Sent folder for reassurance.
- **Firebase Hosting is free forever** for a static site, includes HTTPS, and takes two commands to deploy.
- **A free `.np` domain via Cloudflare + Firebase** costs zero rupees and looks a lot better on a CV than a `.web.app` subdomain.
- **The strongest portfolios are boring.** Recruiters need to answer "who, what, how do I contact" in ten seconds -- give them exactly that.

---

## What Comes Next

You now have:

- A **real MERN application** (BookMyRoom) with auth, payments, dashboards, deployment
- A **portfolio site** at a real domain to link people to
- A working knowledge of **git, DNS, hosting, CI/CD, and the tools around the app** (L29)

That is genuinely enough to apply for junior developer roles. Update your LinkedIn, put both URLs on your CV, and start applying.

Ship. Break things. Fix them. Ship again.

Welcome to the industry.

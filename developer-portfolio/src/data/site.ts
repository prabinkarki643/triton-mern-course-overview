// src/data/site.ts
// Top-level site info: name shown everywhere, contact channels, socials.
// Swap these values -- every section reads from here.
// The base-nova fork of lucide-react ships without brand icons, so we hand-roll
// the GitHub and LinkedIn marks as tiny inline SVGs in components/shared/brand-icons.tsx
// (drawn on lucide's 24x24 grid so they mix cleanly).
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
  // Paste a Google Drive share link (or your own hosted PDF URL) so the
  // "Resume" button opens the current version of your CV in a new tab.
  resumeUrl:
    "https://drive.google.com/file/d/PUT-YOUR-FILE-ID/view?usp=sharing",
  socials: [
    {
      label: "GitHub",
      href: "https://github.com/your-username",
      icon: GithubIcon,
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/your-username",
      icon: LinkedinIcon,
    },
    {
      label: "Email",
      href: "mailto:your.name@example.com",
      icon: Mail,
    },
  ],
}

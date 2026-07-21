// src/data/site.ts
// Top-level site info: name shown everywhere, contact channels, socials.
// Swap these values -- every section reads from here.
// This base-nova fork of lucide-react ships without brand icons, so we use
// neutral lucide icons that convey the same meaning: FolderGit2 for GitHub
// (code repo folder) and Briefcase for LinkedIn (professional network).
// Swap for react-icons brand marks if you want the real GitHub/LinkedIn logos.
import { Briefcase, FolderGit2, Mail } from "lucide-react"
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
  socials: [
    {
      label: "GitHub",
      href: "https://github.com/your-username",
      icon: FolderGit2,
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/your-username",
      icon: Briefcase,
    },
    {
      label: "Email",
      href: "mailto:your.name@example.com",
      icon: Mail,
    },
  ],
}

// src/types/index.ts
// Shared shapes for every data file in src/data/*.

import type { LucideIcon } from "lucide-react"
import type { ComponentType, SVGProps } from "react"

// Any icon-shaped component -- both LucideIcon and our inline brand SVGs
// (see components/shared/brand-icons.tsx) satisfy this.
export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

export interface SocialLink {
  label: string
  href: string
  icon: IconComponent
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
  /** External resume link (Google Drive, etc.) -- shown as the Resume button */
  resumeUrl: string
  socials: SocialLink[]
}

export interface QuickFact {
  label: string
  value: string
  icon: LucideIcon
}

// Section-level shapes below can stay tied to LucideIcon (their icons are
// non-brand). Only socials need the wider IconComponent type.

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

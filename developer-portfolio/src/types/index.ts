// src/types/index.ts
// Shared shapes for every data file in src/data/*.

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

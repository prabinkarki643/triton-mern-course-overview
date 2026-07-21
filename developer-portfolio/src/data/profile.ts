// src/data/profile.ts
// Hero + About content. Update `photo` to a real headshot when you have one --
// /images/profile.jpeg ships as a placeholder.
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
    "Hi -- I'm a recent computer-science graduate based in Kathmandu, currently focused on the React + Node.js ecosystem. I just finished a full-stack course where I built a room-booking application from scratch, including auth, payments and a small dashboard.",
    "I care about writing readable code, using TypeScript everywhere it fits, and picking libraries that solve real problems (Zod, React Query, shadcn/ui) rather than reinventing them.",
    "I am open to junior or intern positions -- either onsite in Kathmandu or fully remote. If you have a project I could learn from, I would love to hear about it.",
  ],
  quickFacts: [
    {
      label: "Location",
      value: "Kathmandu, Nepal",
      icon: MapPin,
    },
    {
      label: "Focus",
      value: "React · Node.js · MongoDB",
      icon: Briefcase,
    },
    {
      label: "Education",
      value: "BSc CSIT",
      icon: GraduationCap,
    },
    {
      label: "Languages",
      value: "English · Nepali",
      icon: Languages,
    },
  ],
}

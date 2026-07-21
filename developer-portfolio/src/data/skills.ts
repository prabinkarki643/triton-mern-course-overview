// src/data/skills.ts
// Skills categorised by area. Icon comes straight from lucide-react.
import {
  Code2,
  Database,
  GitBranch,
  Layout,
  Palette,
  Server,
} from "lucide-react"
import type { SkillCategory } from "@/types"

export const skillCategories: SkillCategory[] = [
  {
    title: "Languages",
    icon: Code2,
    skills: ["HTML", "CSS", "JavaScript", "TypeScript"],
  },
  {
    title: "Frontend",
    icon: Layout,
    skills: ["React", "React Router", "React Hook Form", "Zod"],
  },
  {
    title: "UI & Styling",
    icon: Palette,
    skills: ["Tailwind CSS", "shadcn/ui", "Responsive design"],
  },
  {
    title: "Data Fetching",
    icon: Server,
    skills: ["Axios", "React Query", "REST APIs"],
  },
  {
    title: "Backend",
    icon: Server,
    skills: ["Node.js", "Express", "JWT auth", "Nodemailer"],
  },
  {
    title: "Database",
    icon: Database,
    skills: ["MongoDB", "Mongoose", "Aggregation basics"],
  },
  {
    title: "Tooling",
    icon: GitBranch,
    skills: ["Git & GitHub", "Vite", "Vercel", "Render"],
  },
]

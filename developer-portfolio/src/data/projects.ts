// src/data/projects.ts
// Two projects the course produces: a full-stack booking app and this portfolio
// itself. Add more as you build them.
import type { ProjectItem } from "@/types"

export const projects: ProjectItem[] = [
  {
    title: "BookMyRoom",
    role: "Full-stack Developer",
    description:
      "A room-booking application built end-to-end. React + TypeScript on the front, Express + MongoDB on the back. JWT auth, image uploads, eSewa payments with signed callbacks, owner dashboard with aggregation stats, and abandoned-booking cron.",
    image: "/images/projects/book_my_room.png",
    tech: [
      "React",
      "TypeScript",
      "Node.js",
      "Express",
      "MongoDB",
      "Tailwind",
      "shadcn/ui",
      "React Query",
    ],
    liveUrl: "https://your-bookmyroom.vercel.app",
    sourceUrl: "https://github.com/your-username/bookmyroom",
    featured: true,
  },
  {
    title: "Developer Portfolio",
    role: "Frontend Developer",
    description:
      "This site. A single-page portfolio built with Vite, React and shadcn/ui, with dark and light themes, a Gmail-based contact form, and hosted for free on Firebase.",
    image:
      "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1200&auto=format&fit=crop",
    tech: ["Vite", "React", "TypeScript", "Tailwind", "shadcn/ui", "Firebase"],
    liveUrl: "https://your-portfolio.web.app",
    sourceUrl: "https://github.com/your-username/developer-portfolio",
    featured: true,
  },
]

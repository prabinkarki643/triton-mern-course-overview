// src/App.tsx
// Single-page portfolio. Sections are stitched together in reading order
// -- each one owns its own <section id="..."> anchor, so nav links just
// scroll (no router).
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

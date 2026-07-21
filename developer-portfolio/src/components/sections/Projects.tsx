// src/components/sections/Projects.tsx
// Project cards. Two projects for now (BookMyRoom + this portfolio); the
// grid stays two columns on large screens because more cards can slot in.
import { ArrowUpRight, Code2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { SectionHeading } from "@/components/sections/About"
import { projects } from "@/data/projects"

export function Projects() {
  return (
    <section id="projects" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Projects"
          title="What I've built recently"
        />

        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-2">
          {projects.map((project) => (
            <Card
              key={project.title}
              className="border-border/60 group flex h-full flex-col overflow-hidden py-0 pb-6 transition-shadow hover:shadow-lg"
            >
              {/* Cover image */}
              <div className="bg-muted relative aspect-[16/9] overflow-hidden">
                <img
                  src={project.image}
                  alt={project.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <CardContent className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">
                      {project.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {project.role}
                    </p>
                  </div>
                  {project.featured && (
                    <Badge
                      variant="outline"
                      className="border-brand/40 text-brand text-[10px] tracking-wider uppercase"
                    >
                      Featured
                    </Badge>
                  )}
                </div>

                <p className="text-muted-foreground text-sm leading-relaxed">
                  {project.description}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {project.tech.map((tech) => (
                    <Badge
                      key={tech}
                      variant="secondary"
                      className="rounded-md font-normal"
                    >
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>

              {(project.liveUrl || project.sourceUrl) && (
                <CardFooter className="flex flex-wrap gap-2">
                  {project.liveUrl && (
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({
                        size: "sm",
                        className:
                          "bg-brand text-brand-foreground hover:bg-brand/90",
                      })}
                    >
                      Live demo
                      <ArrowUpRight className="ml-1.5 size-4" />
                    </a>
                  )}
                  {project.sourceUrl && (
                    <a
                      href={project.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({
                        size: "sm",
                        variant: "outline",
                      })}
                    >
                      <Code2 className="mr-1.5 size-4" />
                      Source
                    </a>
                  )}
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

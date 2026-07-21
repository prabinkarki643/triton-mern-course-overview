// src/components/sections/Skills.tsx
// Grid of skill-category cards. Everything renders from src/data/skills.ts.
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SectionHeading } from "@/components/sections/About"
import { skillCategories } from "@/data/skills"

export function Skills() {
  return (
    <section
      id="skills"
      className="bg-muted/40 scroll-mt-20 border-y py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Skills"
          title="Tech I know and use"
          align="center"
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {skillCategories.map((category) => {
            const Icon = category.icon
            return (
              <Card key={category.title} className="border-border/60 h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="bg-brand-soft text-brand flex size-8 items-center justify-center rounded-lg">
                      <Icon className="size-4" />
                    </span>
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {category.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="rounded-md font-normal"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// src/components/sections/About.tsx
// Two-column: paragraphs on the left, quick-fact cards on the right.
import { Card, CardContent } from "@/components/ui/card"
import { profile } from "@/data/profile"

export function About() {
  return (
    <section id="about" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="About" title="A little about me" />

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            {profile.aboutParagraphs.map((paragraph, idx) => (
              <p
                key={idx}
                className="text-muted-foreground text-base leading-relaxed"
              >
                {paragraph}
              </p>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {profile.quickFacts.map((fact) => {
              const Icon = fact.icon
              return (
                <Card key={fact.label} className="border-border/60">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="bg-brand-soft text-brand flex size-9 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs tracking-wide uppercase">
                        {fact.label}
                      </div>
                      <div className="text-sm font-medium">{fact.value}</div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  align = "left",
}: {
  eyebrow: string
  title: string
  align?: "left" | "center"
}) {
  return (
    <div
      className={`flex flex-col gap-2 ${align === "center" ? "items-center text-center" : ""}`}
    >
      <span className="text-brand text-xs font-semibold tracking-widest uppercase">
        {eyebrow}
      </span>
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
    </div>
  )
}

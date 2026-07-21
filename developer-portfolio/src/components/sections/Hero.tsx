// src/components/sections/Hero.tsx
// Top-of-page hero with photo, name, headline, CTAs.
import { ArrowRight, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { profile } from "@/data/profile"
import { siteConfig } from "@/data/site"

export function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden"
    >
      <div className="dot-grid absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:px-8">
        {/* Copy */}
        <div className="flex flex-col items-start gap-6">
          <Badge
            variant="outline"
            className="border-brand/40 bg-brand-soft/30 text-brand gap-2 rounded-full px-3 py-1 text-xs font-medium tracking-wide"
          >
            <span className="relative flex size-2">
              <span className="bg-brand absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
              <span className="bg-brand relative inline-flex size-2 rounded-full" />
            </span>
            {profile.eyebrow}
          </Badge>

          <div>
            <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {profile.headline}{" "}
              <span className="text-brand">{profile.headlineAccent}</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm font-medium tracking-widest uppercase">
              {siteConfig.role}
            </p>
          </div>

          <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">
            {profile.subheadline}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#projects"
              className={buttonVariants({
                size: "lg",
                className: "bg-brand text-brand-foreground hover:bg-brand/90",
              })}
            >
              View Projects
              <ArrowRight className="ml-2 size-4" />
            </a>
            <a
              href="#contact"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              <Mail className="mr-2 size-4" />
              Contact me
            </a>
          </div>

          <div className="flex items-center gap-4 pt-2">
            {siteConfig.socials.map((social) => {
              const Icon = social.icon
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Icon className="size-5" />
                </a>
              )
            })}
          </div>
        </div>

        {/* Portrait */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="from-brand/40 absolute -inset-2 rounded-3xl bg-gradient-to-br to-transparent blur-2xl" />
          <div className="border-border/60 bg-card relative overflow-hidden rounded-3xl border shadow-sm">
            <img
              src={profile.photo}
              alt={`${siteConfig.name} portrait`}
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

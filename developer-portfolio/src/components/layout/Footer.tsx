// src/components/layout/Footer.tsx
import { siteConfig } from "@/data/site"

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-muted-foreground text-sm">
          © {year} {siteConfig.name}. Built with React and shadcn/ui.
        </p>
        <div className="flex items-center gap-3">
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
                <Icon className="size-4" />
              </a>
            )
          })}
        </div>
      </div>
    </footer>
  )
}

// src/components/layout/Navbar.tsx
// Sticky top nav with anchor links + theme toggle. Every entry lives in
// src/data/navigation.ts so adding a section is one array push.
import { useEffect, useState } from "react"
import { FileText, Menu, X } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { navItems } from "@/data/navigation"
import { siteConfig } from "@/data/site"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        scrolled
          ? "bg-background/85 backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <a href="#home" className="flex items-center gap-2">
          <img
            src={siteConfig.logo}
            alt=""
            className="size-8 rounded-md object-cover"
          />
          <span className="text-sm font-semibold tracking-tight">
            {siteConfig.name}
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex items-center gap-1">
          <a
            href={siteConfig.resumeUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({
              size: "sm",
              className:
                "hidden bg-brand text-brand-foreground hover:bg-brand/90 md:inline-flex",
            })}
          >
            <FileText className="mr-1.5 size-4" />
            Resume
          </a>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile drawer -- simple overlay, no dependency on <Sheet> */}
      {mobileOpen && (
        <nav className="bg-background border-t md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="hover:bg-muted rounded-md px-3 py-2 text-sm font-medium"
              >
                {item.label}
              </a>
            ))}
            <a
              href={siteConfig.resumeUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileOpen(false)}
              className={buttonVariants({
                size: "sm",
                className:
                  "mt-2 bg-brand text-brand-foreground hover:bg-brand/90",
              })}
            >
              <FileText className="mr-1.5 size-4" />
              Resume
            </a>
          </div>
        </nav>
      )}
    </header>
  )
}

// src/components/sections/Contact.tsx
// Contact form + info card. Submitting the form opens a fresh Gmail compose
// tab with the subject and body pre-filled (see lib/mailto.ts). No backend
// required -- perfect for a static portfolio.
import { useState, type FormEvent } from "react"
import { Mail, MapPin, Phone, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SectionHeading } from "@/components/sections/About"
import { buildGmailComposeUrl, buildMailtoUrl } from "@/lib/mailto"
import { siteConfig } from "@/data/site"

interface ContactValues {
  name: string
  email: string
  subject: string
  message: string
}

export function Contact() {
  const [values, setValues] = useState<ContactValues>({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const update =
    (key: keyof ContactValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [key]: event.target.value }))
    }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const subject =
      values.subject.trim() || `Hello from ${values.name || "your portfolio"}`
    const body = [
      `Hi ${siteConfig.name},`,
      "",
      values.message,
      "",
      "---",
      `From: ${values.name}${values.email ? ` <${values.email}>` : ""}`,
    ].join("\n")

    const gmailUrl = buildGmailComposeUrl({
      to: siteConfig.email,
      subject,
      body,
    })

    // Try Gmail first in a new tab. Some browsers (or users without Gmail
    // in the browser) will land on a login page -- we fall back to a
    // plain mailto: after a short delay if the window did not open.
    const opened = window.open(gmailUrl, "_blank", "noopener,noreferrer")
    if (!opened) {
      window.location.href = buildMailtoUrl({
        to: siteConfig.email,
        subject,
        body,
      })
    }
  }

  return (
    <section
      id="contact"
      className="bg-muted/40 scroll-mt-20 border-t py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Contact"
          title="Let's talk"
          align="center"
        />
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-center text-base">
          Send a quick message and I'll get back to you within a day or two.
          Prefer a direct channel? Reach me via the details on the right.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Form */}
          <Card className="border-border/60">
            <CardContent className="p-6 sm:p-8">
              <form
                onSubmit={handleSubmit}
                className="grid gap-4 sm:grid-cols-2"
              >
                <Field
                  id="name"
                  label="Your name"
                  value={values.name}
                  onChange={update("name")}
                  required
                />
                <Field
                  id="email"
                  type="email"
                  label="Your email"
                  value={values.email}
                  onChange={update("email")}
                  required
                />
                <div className="sm:col-span-2">
                  <Field
                    id="subject"
                    label="Subject"
                    value={values.subject}
                    onChange={update("subject")}
                    placeholder="Project enquiry, quick chat, ..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={values.message}
                    onChange={update("message")}
                    placeholder="Tell me a little about what you're working on..."
                    required
                    className="mt-1.5 min-h-32"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-brand text-brand-foreground hover:bg-brand/90"
                  >
                    <Send className="mr-2 size-4" />
                    Send
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Info card */}
          <Card className="border-border/60">
            <CardContent className="space-y-4 p-6 sm:p-8">
              <InfoRow
                icon={<Mail className="size-4" />}
                label="Email"
                value={siteConfig.email}
                href={`mailto:${siteConfig.email}`}
              />
              <InfoRow
                icon={<Phone className="size-4" />}
                label="Phone"
                value={siteConfig.phone}
                href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`}
              />
              <InfoRow
                icon={<MapPin className="size-4" />}
                label="Location"
                value={siteConfig.location}
              />

              <div className="border-border/60 flex items-center gap-3 border-t pt-4">
                {siteConfig.socials.map((social) => {
                  const Icon = social.icon
                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={social.label}
                      className="border-border bg-background hover:border-brand hover:text-brand flex size-9 items-center justify-center rounded-md border transition-colors"
                    >
                      <Icon className="size-4" />
                    </a>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string
  label: string
  type?: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="mt-1.5"
      />
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
}) {
  const content = (
    <div className="flex items-start gap-3">
      <span className="bg-brand-soft text-brand mt-0.5 flex size-9 items-center justify-center rounded-lg">
        {icon}
      </span>
      <div>
        <div className="text-muted-foreground text-xs tracking-wide uppercase">
          {label}
        </div>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  )
  return href ? (
    <a href={href} className="hover:text-brand block transition-colors">
      {content}
    </a>
  ) : (
    content
  )
}

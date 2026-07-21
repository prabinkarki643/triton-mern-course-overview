// src/components/sections/Contact.tsx
// Contact form + info card. Uses React Hook Form + Zod + shadcn Field
// primitives -- the same pattern as every form in BookMyRoom (see L12,
// L20, L21, L25). On submit we build a Gmail compose URL with subject
// and body pre-filled and open it in a new tab; if the popup is blocked
// or the user has no Gmail signed in, we fall back to mailto:.
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Mail, MapPin, Phone, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SectionHeading } from "@/components/sections/About"
import { buildGmailComposeUrl, buildMailtoUrl } from "@/lib/mailto"
import { siteConfig } from "@/data/site"
import {
  contactSchema,
  type ContactFormValues,
} from "@/schemas/contactSchema"

export function Contact() {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  })

  const onSubmit = (data: ContactFormValues): void => {
    const subject =
      (data.subject && data.subject.trim()) ||
      `Hello from ${data.name || "your portfolio"}`
    const body = [
      `Hi ${siteConfig.name},`,
      "",
      data.message,
      "",
      "---",
      `From: ${data.name} <${data.email}>`,
    ].join("\n")

    const gmailUrl = buildGmailComposeUrl({
      to: siteConfig.email,
      subject,
      body,
    })

    // Try Gmail first in a new tab. If the popup is blocked or the user
    // has no Gmail signed in, fall back to a plain mailto: -- their OS
    // default mail app picks it up.
    const opened = window.open(gmailUrl, "_blank", "noopener,noreferrer")
    if (!opened) {
      // Function form (assign) rather than `location.href = ...` -- the
      // React Compiler lint blocks mutating properties on external objects.
      window.location.assign(
        buildMailtoUrl({ to: siteConfig.email, subject, body })
      )
    }

    form.reset()
  }

  return (
    <section
      id="contact"
      className="bg-muted/40 scroll-mt-20 border-t py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Contact" title="Let's talk" align="center" />
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-center text-base">
          Send a quick message and I'll get back to you within a day or two.
          Prefer a direct channel? Reach me via the details on the right.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Form */}
          <Card className="border-border/60">
            <CardContent className="p-6 sm:p-8">
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid gap-4 sm:grid-cols-2"
                noValidate
              >
                <FieldGroup className="contents">
                  <Controller
                    name="name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>Your name</FieldLabel>
                        <Input
                          {...field}
                          id={field.name}
                          placeholder="Jane Doe"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <Controller
                    name="email"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={field.name}>Your email</FieldLabel>
                        <Input
                          {...field}
                          id={field.name}
                          type="email"
                          placeholder="jane@example.com"
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <div className="sm:col-span-2">
                    <Controller
                      name="subject"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Subject</FieldLabel>
                          <Input
                            {...field}
                            id={field.name}
                            placeholder="Project enquiry, quick chat, ..."
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Controller
                      name="message"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={field.name}>Message</FieldLabel>
                          <Textarea
                            {...field}
                            id={field.name}
                            placeholder="Tell me a little about what you're working on..."
                            className="min-h-32"
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  </div>
                </FieldGroup>

                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={form.formState.isSubmitting}
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

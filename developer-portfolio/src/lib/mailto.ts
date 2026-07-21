// src/lib/mailto.ts
// Build a Gmail compose URL prefilled with subject + body. Falls back to a
// plain mailto: link so browsers without a Gmail account still open a mail
// client (Outlook, Apple Mail, etc.).

interface BuildMailUrlArgs {
  to: string
  subject: string
  body: string
}

// Gmail's compose URL supports `to`, `su` (subject) and `body` query params.
export function buildGmailComposeUrl({
  to,
  subject,
  body,
}: BuildMailUrlArgs): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to,
    su: subject,
    body,
  })
  return `https://mail.google.com/mail/?${params.toString()}`
}

// Standard RFC 6068 mailto: fallback for anyone without Gmail in the browser.
export function buildMailtoUrl({ to, subject, body }: BuildMailUrlArgs): string {
  const query = new URLSearchParams({ subject, body }).toString()
  return `mailto:${to}?${query}`
}

// src/config/mail.ts
// Matches Lesson 21.1 section 21.1.4. Lazy-init nodemailer transporter so
// routes that don't send email don't force a bad SMTP config to fail at boot.
import nodemailer, { Transporter } from "nodemailer";

interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  from: string;
}

function readMailConfig(): MailConfig {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USERNAME;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_DEFAULT_FROM;

  if (!host || !user || !pass || !from) {
    throw new Error(
      "Mail config missing. Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD and SMTP_DEFAULT_FROM in .env"
    );
  }

  return {
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    // Port 587 uses STARTTLS -- start plaintext then upgrade. `secure: true`
    // means start TLS immediately, which is what port 465 does.
    secure: (process.env.MAIL_SECURE ?? "false").toLowerCase() === "true",
    auth: { user, pass },
    from,
  };
}

let cached: { transporter: Transporter; from: string } | null = null;

export function getMailer(): { transporter: Transporter; from: string } {
  if (cached) return cached;
  const cfg = readMailConfig();
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.auth,
  });
  cached = { transporter, from: cfg.from };
  return cached;
}

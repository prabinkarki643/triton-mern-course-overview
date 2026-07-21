// src/schemas/contactSchema.ts
// Single source of truth for the Contact form -- Zod validates, and
// TypeScript infers the exact same shape for react-hook-form. The
// standard course pattern (see L12, L20, L21, L25).
import { z } from "zod"

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name (at least 2 characters)")
    .max(60, "Name is too long"),
  email: z.email("Please enter a valid email address").trim(),
  subject: z
    .string()
    .trim()
    .max(120, "Subject is too long")
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Please write a slightly longer message (at least 10 characters)")
    .max(2000, "Message is too long"),
})

export type ContactFormValues = z.infer<typeof contactSchema>

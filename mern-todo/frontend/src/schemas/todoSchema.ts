import { z } from "zod";

export const todoSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or fewer"),
  priority: z.enum(["low", "medium", "high"], {
    message: "Please select a priority",
  }),
});

export type TodoFormData = z.infer<typeof todoSchema>;

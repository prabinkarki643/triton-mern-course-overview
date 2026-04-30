// src/components/AddTodoForm.tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTodo } from "@/context/TodoContext"

import { z } from "zod"
import { useForm, Controller } from "react-hook-form"
import { Field, FieldError } from "@/components/ui/field"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

// 1. Define the schema
const todoSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be under 100 characters")
    .trim(),

  priority: z.enum(["low", "medium", "high"], {
    error: "Please select a priority",
  }),
})

// 2. Derive the type from the schema
type TodoFormData = z.infer<typeof todoSchema>

function AddTodoForm() {
  // 3. Connect schema to form with the derived type
  const form = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
    defaultValues: { title: "", priority: "medium" },
  })

  const { addTask } = useTodo()

  const handleSubmit = (data: TodoFormData): void => {
    addTask(data.title, data.priority)
    form.reset()
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex justify-center gap-2"
    >
      <Controller
        name="title"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <Input
              {...field}
              id={field.name}
              placeholder="Enter your title..."
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="priority"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <Select
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="priority" aria-invalid={fieldState.invalid}>
                <SelectValue placeholder="medium" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Button type="submit">Add</Button>
    </form>
  )
}

export default AddTodoForm

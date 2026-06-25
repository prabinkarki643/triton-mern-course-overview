# Lesson 12: React Hook Form and Zod

## What You Will Learn
- Why use a form library instead of manual state management
- Creating validation schemas with Zod
- Deriving TypeScript types from Zod schemas with `z.infer`
- Using React Hook Form with the typed `useForm` hook and the `Controller` component
- Connecting Zod to React Hook Form
- Composing forms with shadcn/ui's `Field` family (`Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`)
- Displaying validation errors accessibly
- Building a validated Todo input form

---

## 12.1 Why Use a Form Library?

In Lesson 7, we managed form inputs with `useState`. That works for simple forms, but it has problems:

**Manual approach issues:**
- You write `useState` and `onChange` for every input
- Validation logic is scattered and repetitive
- The component re-renders on every keystroke
- Error handling gets messy quickly

**React Hook Form solves this by:**
- Managing form state without re-renders on every keystroke
- Providing built-in validation
- Handling errors consistently
- Making complex forms simple

**Zod adds:**
- Type-safe validation schemas
- Clear error messages
- Reusable validation rules
- **Automatic TypeScript types** - define your schema once and get both validation AND types

---

## 12.2 Installing the Libraries

```bash
npm install react-hook-form zod @hookform/resolvers
```

- `react-hook-form` - the form library
- `zod` - the validation library
- `@hookform/resolvers` - connects Zod to React Hook Form

---

## 12.3 Understanding Zod Schemas

A Zod schema defines the **shape and rules** of your data. Think of it as a contract - "this data must look like this."

### Basic Schema

```ts
import { z } from "zod";

// A simple string that must exist
const nameSchema = z.string();

// A string with rules
const titleSchema = z.string()
  .min(3, "Title must be at least 3 characters")
  .max(100, "Title must be under 100 characters");

// A number
const prioritySchema = z.number()
  .min(1, "Priority must be between 1 and 5")
  .max(5, "Priority must be between 1 and 5");
```

### Object Schema

For forms, you define a schema for the whole form data:

```ts
const todoSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be under 100 characters")
    .trim(),
  priority: z.enum(["low", "medium", "high"], {
    errorMap: () => ({ message: "Please select a priority" }),
  }),
  description: z.string().optional(), // optional field
});
```

### Deriving TypeScript Types from Zod

This is one of the most powerful features of Zod. Instead of writing your types separately, you **derive them from the schema**:

```ts
const todoSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be under 100 characters")
    .trim(),
  priority: z.enum(["low", "medium", "high"]),
});

// Derive the TypeScript type from the schema
type TodoFormData = z.infer<typeof todoSchema>;

// TodoFormData is now equivalent to:
// {
//   title: string;
//   priority: "low" | "medium" | "high";
// }
```

**Why this matters:** Your validation rules and your TypeScript types are always in sync. If you add a field to the schema, the type updates automatically. No duplication, no drift.

### Common Zod Validators

```ts
// Strings
z.string()                              // must be a string
z.string().min(3, "Too short")          // minimum length
z.string().max(100, "Too long")         // maximum length
z.string().email("Invalid email")       // must be email format
z.string().min(1, "Required")           // cannot be empty

// Numbers
z.number()                              // must be a number
z.number().min(1)                       // minimum value
z.number().max(100)                     // maximum value
z.number().positive("Must be positive") // > 0

// Booleans
z.boolean()

// Enums (pick from options)
z.enum(["low", "medium", "high"])

// Optional fields
z.string().optional()                   // can be undefined

// Coerce (convert strings from inputs to numbers)
z.coerce.number().min(1).max(10)
```

### Testing a Schema

```ts
const result = todoSchema.safeParse({
  title: "Hi",
  priority: "low",
});

if (!result.success) {
  console.log(result.error.errors);
  // [{ message: "Title must be at least 3 characters", path: ["title"] }]
} else {
  console.log(result.data); // validated data, typed as TodoFormData
}
```

---

## 12.4 React Hook Form Basics

### The useForm Hook

```tsx
import { useForm, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

interface FormData {
  title: string;
}

function MyForm() {
  const form = useForm<FormData>({
    defaultValues: { title: "" },
  });

  const onSubmit = (data: FormData) => {
    console.log(data); // { title: "..." }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Controller
        name="title"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Task Title</FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder="Enter a task..."
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} />
            )}
          </Field>
        )}
      />
      <Button type="submit">Add</Button>
    </form>
  );
}
```

**How it works:**
1. `useForm<FormData>()` creates the form with typed fields
2. `Controller` connects each input to the form — it gives you `field` (value, onChange, etc.) and `fieldState` (errors, invalid state)
3. `Field` is a shadcn/ui wrapper that handles layout and error styling
4. `FieldLabel` and `FieldError` provide accessible labels and error display
5. `data-invalid` on `Field` lets shadcn auto-style the whole group when there's an error
6. `handleSubmit(onSubmit)` validates the form, then calls `onSubmit` with the data

**Why Controller instead of register?**

You might see `register()` in older tutorials, but `Controller` is the better approach:
- Works with **any** component (Input, Select, Checkbox, custom components)
- Gives you `fieldState` with error info right where you need it
- One pattern for everything — learn it once, use it everywhere

### Adding the Field Component

First, add the Field component to your project:

```bash
npx shadcn@latest add field
```

This gives you `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, and more in `src/components/ui/field.tsx`.

---

## 12.5 Connecting Zod to React Hook Form

This is where the power comes together. Zod gives you both validation **and** types from a single schema:

```tsx
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

// 1. Define the schema
const todoSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be under 100 characters")
    .trim(),
});

// 2. Derive the type from the schema
type TodoFormData = z.infer<typeof todoSchema>;

function AddTodoForm() {
  // 3. Connect schema to form with the derived type
  const form = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
    defaultValues: { title: "" },
  });

  // 4. Handle valid submission - data is typed as TodoFormData
  const onSubmit = (data: TodoFormData) => {
    console.log("Valid data:", data); // { title: "..." }
    form.reset();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="title"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Task Title</FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder="What needs to be done?"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} />
            )}
          </Field>
        )}
      />
      <Button type="submit">Add</Button>
    </form>
  );
}
```

Now:
- The form won't submit unless all Zod rules pass
- Error messages come from your Zod schema
- The `data` in `onSubmit` is guaranteed to be valid **and** fully typed
- `Field` auto-styles as invalid when there's an error
- TypeScript knows exactly what fields and types `data` contains

---

## 12.6 Full Todo Form with shadcn/ui

Let's build a proper form with shadcn/ui Field components and Zod validation:

```ts
// src/schemas/todoSchema.ts
import { z } from "zod";

export const todoSchema = z.object({
  title: z.string()
    .min(1, "Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be under 100 characters")
    .trim(),
  priority: z.enum(["low", "medium", "high"], {
    errorMap: () => ({ message: "Please select a priority" }),
  }),
});

// Export the derived type so other files can use it
export type TodoFormData = z.infer<typeof todoSchema>;
```

```tsx
// src/components/AddTodoForm.tsx
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { todoSchema, type TodoFormData } from "../schemas/todoSchema";
import { useTodo } from "../context/TodoContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

function AddTodoForm() {
  const { addTask } = useTodo();

  const form = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      title: "",
      priority: "medium",
    },
  });

  const onSubmit = (data: TodoFormData) => {
    addTask(data.title, data.priority);
    form.reset();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Title field */}
      <Controller
        name="title"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Task Title</FieldLabel>
            <Input
              {...field}
              id={field.name}
              placeholder="What needs to be done?"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} />
            )}
          </Field>
        )}
      />

      {/* Priority field */}
      <Controller
        name="priority"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Priority</FieldLabel>
            <select
              {...field}
              id={field.name}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            {fieldState.invalid && (
              <FieldError errors={[fieldState.error]} />
            )}
          </Field>
        )}
      />

      {/* Submit button */}
      <Button type="submit" className="w-full">
        Add Task
      </Button>
    </form>
  );
}

export default AddTodoForm;
```

**Notice the pattern is identical for every field:**
1. Wrap with `Controller` — give it `name` and `control`
2. Inside `render`, wrap with `Field` — set `data-invalid`
3. Add `FieldLabel` with `htmlFor`
4. Spread `{...field}` onto the input component
5. Show `FieldError` when invalid

This same pattern works for `<Input>`, `<select>`, `<Checkbox>`, `<Textarea>`, or any custom component.

### Update TodoContext to Accept Priority

```ts
// In TodoContext.tsx - update the addTask function
const addTask = (title: string, priority: "low" | "medium" | "high" = "medium") => {
  const newTask = {
    id: Date.now(),
    title,
    priority,
    completed: false,
  };
  setTasks((prev) => [...prev, newTask]);
};
```

---

## 12.7 The Field Component Family

shadcn/ui provides several Field sub-components for building forms:

| Component | Purpose |
|-----------|---------|
| `Field` | Wrapper for a single form field — handles layout and `data-invalid` styling |
| `FieldLabel` | Accessible label that connects to the input via `htmlFor` |
| `FieldDescription` | Helper text below the label (e.g. "Must be at least 3 characters") |
| `FieldError` | Displays validation errors — accepts `errors` array from React Hook Form |
| `FieldGroup` | Groups multiple Field components with consistent spacing |

### Using FieldDescription

```tsx
<Controller
  name="title"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor={field.name}>Task Title</FieldLabel>
      <FieldDescription>Give your task a clear, short name</FieldDescription>
      <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

### Using FieldGroup

`FieldGroup` is a wrapper that stacks multiple `Field` components vertically with consistent spacing — so you don't need to add your own `space-y-*` classes:

```tsx
<form onSubmit={form.handleSubmit(onSubmit)}>
  <FieldGroup>
    <Controller name="title" control={form.control} render={...} />
    <Controller name="priority" control={form.control} render={...} />
  </FieldGroup>
  <Button type="submit">Add Task</Button>
</form>
```

### Horizontal Field Layout

By default `Field` stacks the label above the input. For inline layouts — like a row of action buttons, or a checkbox sat next to its label — use `orientation="horizontal"`:

```tsx
<Controller
  name="acceptTerms"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field orientation="horizontal" data-invalid={fieldState.invalid}>
      <Checkbox
        id={field.name}
        checked={field.value}
        onCheckedChange={field.onChange}
        aria-invalid={fieldState.invalid}
      />
      <FieldLabel htmlFor={field.name}>I accept the terms</FieldLabel>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

You'll see this pattern again in later lessons when we add checkboxes, switches, and side-by-side action buttons.

---

## 12.8 Common Form Patterns

### Watch Field Values

```tsx
const title = form.watch("title"); // reactive value, typed as string

return (
  <div>
    <p>{title?.length ?? 0}/100 characters</p>
  </div>
);
```

### Set Values Programmatically

```tsx
// Set a single field - TypeScript ensures you use valid field names and values
form.setValue("title", "New value");
```

### Reset Form

```tsx
// Reset to defaults
form.reset();

// Reset to specific values - TypeScript checks the shape
form.reset({ title: "Prefilled title", priority: "high" });
```

### Form Submission State

```tsx
const { isSubmitting, isValid } = form.formState;

<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? "Adding..." : "Add Task"}
</Button>
```

---

## 12.9 Edit Task Form with Validation

```tsx
// src/components/EditTaskForm.tsx
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { todoSchema, type TodoFormData } from "../schemas/todoSchema";
import { useTodo } from "../context/TodoContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

interface Task {
  id: number;
  title: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
}

interface EditTaskFormProps {
  task: Task;
  onClose: () => void;
}

function EditTaskForm({ task, onClose }: EditTaskFormProps) {
  const { editTask } = useTodo();

  const form = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      title: task.title,
      priority: task.priority,
    },
  });

  const onSubmit = (data: TodoFormData) => {
    editTask(task.id, data.title, data.priority);
    onClose();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Controller
        name="title"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Task Title</FieldLabel>
            <Input {...field} id={field.name} aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="priority"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Priority</FieldLabel>
            <select
              {...field}
              id={field.name}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

export default EditTaskForm;
```

---

## 12.10 How Zod + TypeScript Work Together

Here's a summary of why this combination is so effective:

```ts
// 1. Define the schema ONCE
const todoSchema = z.object({
  title: z.string().min(1).min(3).max(100).trim(),
  priority: z.enum(["low", "medium", "high"]),
});

// 2. Derive the type - no manual interface needed
type TodoFormData = z.infer<typeof todoSchema>;

// 3. Use everywhere with full type safety
const form = useForm<TodoFormData>({
  resolver: zodResolver(todoSchema),   // validates at runtime
});

const onSubmit = (data: TodoFormData) => {
  // TypeScript knows:
  // - data.title is a string
  // - data.priority is "low" | "medium" | "high"
  // - no other fields exist
};
```

**Without Zod**, you'd need to:
1. Write an interface manually
2. Write validation logic separately
3. Keep them in sync yourself
4. Hope they don't drift apart

**With Zod**, you write the schema once and get:
- Runtime validation (catches bad data)
- TypeScript types (catches bugs at compile time)
- Error messages (for the user interface)

All from a single source of truth.

---

## Practice Exercises

### Exercise 1: Basic Validated Form
Create a form with:
- A "title" field (required, min 3 chars, max 100 chars)
- Define the schema with Zod and derive the type with `z.infer`
- Type the `useForm` hook and `onSubmit` handler
- Use `Controller` + `Field` + `FieldLabel` + `FieldError` from shadcn/ui
- Add a `FieldDescription` with helper text (e.g. "Choose a clear, short title — 3 to 100 characters")
- Display the error message below the input when validation fails
- Log the valid data on submit

### Exercise 2: Full Todo Form
Build the complete AddTodoForm with:
- Title input with validation
- Priority select (low/medium/high)
- shadcn/ui `Field` components for styling and layout
- Wrap both fields in a `FieldGroup` for consistent spacing
- Error messages for all fields via `FieldError`
- Form resets after successful submission
- All types derived from the Zod schema

### Exercise 3: Character Counter
Add a live character counter below the title input:
- Show "X/100 characters"
- Turn the counter red when over 80 characters
- Hint: use `watch("title")` from React Hook Form

---

## Key Takeaways
1. **Zod** defines validation rules as schemas — clear, reusable, type-safe
2. **`z.infer<typeof schema>`** derives TypeScript types from Zod schemas — one source of truth
3. **React Hook Form** manages form state without re-renders
4. Connect them with `useForm<TodoFormData>({ resolver: zodResolver(schema) })`
5. **`Controller`** connects inputs to the form — use it for every field (Input, select, Checkbox, etc.)
6. **`Field` + `FieldLabel` + `FieldError`** from shadcn/ui handle layout, labels, and error display
7. `data-invalid` on `Field` auto-styles the whole group when there's an error
8. **One pattern for everything**: `Controller` → `Field` → input → `FieldError`
9. Use `form.reset()` to clear the form after submission
10. Define schemas in separate `.ts` files and export both the schema and the derived type

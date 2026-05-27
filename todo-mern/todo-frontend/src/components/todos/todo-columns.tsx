// webapp/src/components/todos/todo-columns.tsx
import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { TodoRowActions } from "./todo-row-actions"
import { useUpdateTodo } from "@/hooks/useTodos"
import type { Todo } from "@/types/todo"

const priorityVariant: Record<
  Todo["priority"],
  "default" | "secondary" | "destructive"
> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
}

export function useTodoColumns(): ColumnDef<Todo>[] {
  const { mutate: updateTodo } = useUpdateTodo()

  return [
    {
      accessorKey: "completed",
      header: "Done",
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.completed}
          onCheckedChange={(checked) =>
            updateTodo({ id: row.original._id, data: { completed: !!checked } })
          }
          aria-label="Mark as completed"
        />
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <span
          className={
            row.original.completed
              ? "text-muted-foreground line-through"
              : "font-medium"
          }
        >
          {row.original.title}
        </span>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <Badge
          variant={priorityVariant[row.original.priority]}
          className="capitalize"
        >
          {row.original.priority}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => <TodoRowActions todo={row.original} />,
    },
  ]
}

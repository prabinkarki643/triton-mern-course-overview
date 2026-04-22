import { Checkbox } from "@/components/ui/checkbox"
import type { Todo } from "@/types/todo"
import { Button } from "./ui/button"
import { Trash } from "lucide-react"
import { cn } from "@/lib/utils"

interface TodoItemProps {
  task: Todo
  onToggle: (id: number) => void
  onDelete: (id: number) => void
}

function TodoItem({ task, onDelete, onToggle }: TodoItemProps) {
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-white p-3">
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => {
          onToggle(task.id)
        }}
      />
      <span
        className={`flex-1 ${task.completed ? "text-gray-400 line-through" : ""}`}
      >
        {task.title}
      </span>
      {/* {task.priority === "high" && ( */}
      {task.priority && (
        <span
          className={cn(
            "rounded bg-red-100 px-2 py-1 text-xs text-red-700",
            task.priority === "medium" && "bg-yellow-100 text-yellow-700",
            task.priority === "high" && "bg-red-100 text-red-700",
            task.priority === "low" && "bg-green-100 text-green-700"
          )}
        >
          {task.priority}
        </span>
      )}
      {/* )} */}
      <Button variant="destructive" size="sm" onClick={() => onDelete(task.id)}>
        <Trash />
      </Button>
    </li>
  )
}

export default TodoItem

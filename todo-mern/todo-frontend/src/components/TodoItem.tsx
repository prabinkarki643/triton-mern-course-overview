import { Checkbox } from "@/components/ui/checkbox"
import type { Todo } from "@/types/todo"

interface TodoItemProps {
  task: Todo
}

function TodoItem({ task }: TodoItemProps) {
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-white p-3">
      <Checkbox checked={task.completed} />
      <span
        className={`flex-1 ${task.completed ? "text-gray-400 line-through" : ""}`}
      >
        {task.title}
      </span>
      {task.priority === "high" && (
        <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700">
          High
        </span>
      )}
    </li>
  )
}

export default TodoItem

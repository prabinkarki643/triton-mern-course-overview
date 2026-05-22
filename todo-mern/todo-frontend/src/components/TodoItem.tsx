import { Checkbox } from "@/components/ui/checkbox"
import type { Todo } from "@/types/todo"
import { Button } from "./ui/button"
import { Trash } from "lucide-react"
import { cn } from "@/lib/utils"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { EditTaskDialog } from "./EditTaskDialog"
import { useDeleteTodo, useUpdateTodo } from "@/hooks/useTodos"

interface TodoItemProps {
  task: Todo
}

function TodoItem({ task }: TodoItemProps) {
  const { mutateAsync: deleteTask } = useDeleteTodo()
  const { mutateAsync: editTask } = useUpdateTodo()
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-white p-3">
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => {
          editTask({
            id: task._id,
            data: {
              completed: !task.completed,
            },
          })
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

      <EditTaskDialog task={task}></EditTaskDialog>

      {/* Alert Dialog */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTask(task._id)}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  )
}

export default TodoItem

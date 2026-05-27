// webapp/src/components/todos/todo-row-actions.tsx
// import { useState } from 'react';
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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
// import { EditTodoDialog } from './edit-todo-dialog';
import { useDeleteTodo } from "@/hooks/useTodos"
import type { Todo } from "@/types/todo"
import { EditTaskDialog } from "../EditTaskDialog"

interface TodoRowActionsProps {
  todo: Todo
}

export function TodoRowActions({ todo }: TodoRowActionsProps) {
  const { mutate: deleteTodo, isPending: isDeleting } = useDeleteTodo()

  return (
    <div className="flex items-center justify-end gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isDeleting}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this todo?</AlertDialogTitle>
            <AlertDialogDescription>
              "{todo.title}" will be permanently removed. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTodo(todo._id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditTaskDialog task={todo} />
    </div>
  )
}

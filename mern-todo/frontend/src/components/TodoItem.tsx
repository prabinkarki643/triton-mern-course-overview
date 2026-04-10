import { useState } from "react";
import type { Todo } from "@/types/todo";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditTodoDialog } from "@/components/EditTodoDialog";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodoFormData } from "@/schemas/todoSchema";

const priorityVariantMap = {
  high: "destructive",
  medium: "default",
  low: "secondary",
} as const;

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onUpdate: (id: string, updates: Partial<TodoFormData>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TodoItem({ todo, onToggle, onUpdate, onDelete }: TodoItemProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-muted/50",
          todo.completed && "opacity-60"
        )}
      >
        <Checkbox
          checked={todo.completed}
          onCheckedChange={(checked: boolean) => onToggle(todo._id, checked)}
        />

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium truncate",
              todo.completed && "line-through text-muted-foreground"
            )}
          >
            {todo.title}
          </p>
        </div>

        <Badge variant={priorityVariantMap[todo.priority]}>{todo.priority}</Badge>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setEditOpen(true)}
            aria-label="Edit task"
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onDelete(todo._id)}
            aria-label="Delete task"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <EditTodoDialog
        todo={todo}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdate={onUpdate}
      />
    </>
  );
}

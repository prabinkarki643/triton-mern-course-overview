import type { Todo } from "@/types/todo";
import { TodoItem } from "@/components/TodoItem";
import { Card, CardContent } from "@/components/ui/card";
import { Inbox, Loader2, AlertCircle } from "lucide-react";
import type { TodoFormData } from "@/schemas/todoSchema";

interface TodoListProps {
  todos: Todo[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onUpdate: (id: string, updates: Partial<TodoFormData>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TodoList({
  todos,
  isLoading,
  isError,
  error,
  onToggle,
  onUpdate,
  onDelete,
}: TodoListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-8 animate-spin mb-2" />
            <p className="text-sm">Loading tasks...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-destructive">
            <AlertCircle className="size-8 mb-2" />
            <p className="text-sm font-medium">Failed to load tasks</p>
            <p className="text-xs text-muted-foreground mt-1">
              {error?.message || "Please check your connection and try again."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (todos.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Inbox className="size-8 mb-2" />
            <p className="text-sm font-medium">No tasks found</p>
            <p className="text-xs mt-1">Add a task above to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="space-y-1">
          {todos.map((todo) => (
            <TodoItem
              key={todo._id}
              todo={todo}
              onToggle={onToggle}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

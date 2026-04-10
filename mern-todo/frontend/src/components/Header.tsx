import type { Todo } from "@/types/todo";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ListTodo } from "lucide-react";

interface HeaderProps {
  todos: Todo[];
}

export function Header({ todos }: HeaderProps) {
  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <ListTodo className="size-7 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Todo App</h1>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="size-3" />
          {completedCount}/{totalCount} done
        </Badge>
      </div>
    </div>
  );
}

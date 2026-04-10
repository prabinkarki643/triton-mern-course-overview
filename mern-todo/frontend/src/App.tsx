import { useState, useMemo } from "react";
import { useTodos } from "@/hooks/useTodos";
import { Header } from "@/components/Header";
import { AddTodoForm } from "@/components/AddTodoForm";
import { FilterButtons } from "@/components/FilterButtons";
import { TodoList } from "@/components/TodoList";
import type { FilterType } from "@/types/todo";

function App() {
  const [filter, setFilter] = useState<FilterType>("all");
  const {
    todos,
    isLoading,
    isError,
    error,
    createTodo,
    updateTodo,
    deleteTodo,
    isCreating,
  } = useTodos();

  const filteredTodos = useMemo(() => {
    switch (filter) {
      case "active":
        return todos.filter((t) => !t.completed);
      case "completed":
        return todos.filter((t) => t.completed);
      default:
        return todos;
    }
  }, [todos, filter]);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-lg space-y-6">
        <Header todos={todos} />

        <AddTodoForm onSubmit={createTodo} isSubmitting={isCreating} />

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            {filteredTodos.length} task{filteredTodos.length !== 1 ? "s" : ""}
          </h2>
          <FilterButtons filter={filter} onFilterChange={setFilter} />
        </div>

        <TodoList
          todos={filteredTodos}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onToggle={(id, completed) => updateTodo(id, { completed })}
          onUpdate={(id, updates) => updateTodo(id, updates)}
          onDelete={deleteTodo}
        />
      </div>
    </div>
  );
}

export default App;

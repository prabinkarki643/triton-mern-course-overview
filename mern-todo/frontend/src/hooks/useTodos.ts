import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { todoApi } from "@/api/todoApi";
import type { TodoFormData } from "@/schemas/todoSchema";

const TODOS_KEY = ["todos"] as const;

export function useTodos() {
  const queryClient = useQueryClient();

  const todosQuery = useQuery({
    queryKey: TODOS_KEY,
    queryFn: todoApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: todoApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: todoApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: todoApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_KEY });
    },
  });

  return {
    todos: todosQuery.data ?? [],
    isLoading: todosQuery.isLoading,
    isError: todosQuery.isError,
    error: todosQuery.error,
    createTodo: (data: TodoFormData) => createMutation.mutateAsync(data),
    updateTodo: (id: string, updates: Partial<TodoFormData & { completed: boolean }>) =>
      updateMutation.mutateAsync({ id, updates }),
    deleteTodo: (id: string) => deleteMutation.mutateAsync(id),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

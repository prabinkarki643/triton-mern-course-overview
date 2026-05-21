// webapp/src/hooks/useTodos.ts

import { todoApi } from "@/services/todoApi"
import type { TodoFilters } from "@/types/todo"
import { useQuery } from "@tanstack/react-query"

// Centralised query keys -- one source of truth
export const todoKeys = {
  all: ["todos"] as const,
  lists: () => [...todoKeys.all, "list"] as const,
  list: (filters: TodoFilters) => [...todoKeys.lists(), filters] as const,
}

// Fetch a list of todos (with optional filters)
export function useTodos(filters: TodoFilters = {}) {
  return useQuery({
    queryKey: todoKeys.list(filters),
    queryFn: () => todoApi.getAll(filters),
  })
}

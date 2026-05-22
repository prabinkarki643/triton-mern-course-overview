// webapp/src/hooks/useTodos.ts

import { todoApi } from "@/services/todoApi"
import type { CreateTodoData, TodoFilters, UpdateTodoData } from "@/types/todo"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

// Centralised query keys -- one source of truth
export const todoKeys = {
  all: ["todos"] as const,
  lists: () => [...todoKeys.all, "list"] as const,
  list: (filters: TodoFilters) => [...todoKeys.lists(), filters] as const,
  details: () => [...todoKeys.all, "detail"] as const,
  detail: (id: string) => [...todoKeys.details(), id] as const,
}

// Fetch a list of todos (with optional filters)
export function useTodos(filters: TodoFilters = {}) {
  return useQuery({
    queryKey: todoKeys.list(filters),
    queryFn: () => todoApi.getAll(filters),
  })
}

// Fetch a single todo by id
export function useTodo(id: string) {
  return useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => todoApi.getById(id),
    enabled: !!id, // skip if id is empty,
  })
}

export function useCreateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTodoData) => todoApi.create(data),
    onSuccess: () => {
      toast.success("Todo created successfully")
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() })
      queryClient.invalidateQueries({ queryKey: todoKeys.list({}) })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create todo")
    },
  })
}

// Update an existing todo
export function useUpdateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTodoData }) =>
      todoApi.update(id, data),
    onSuccess: () => {
      toast.success("Todo updated successfully")
      queryClient.invalidateQueries({ queryKey: todoKeys.all })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update todo")
    },
  })
}

// Delete a todo
export function useDeleteTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => todoApi.delete(id),
    onSuccess: () => {
      toast.success("Todo deleted")
      queryClient.invalidateQueries({ queryKey: todoKeys.lists() })
      queryClient.invalidateQueries({ queryKey: todoKeys.list({}) })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete todo")
    },
  })
}

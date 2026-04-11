import api from "./axios";
import type { Todo } from "@/types/todo";
import type { TodoFormData } from "@/schemas/todoSchema";

export const todoApi = {
  getAll: async (): Promise<Todo[]> => {
    const { data } = await api.get<{ success: boolean; count: number; data: Todo[] }>("/todos");
    return data.data;
  },

  create: async (todo: TodoFormData): Promise<Todo> => {
    const { data } = await api.post<{ success: boolean; data: Todo }>("/todos", todo);
    return data.data;
  },

  update: async ({
    id,
    updates,
  }: {
    id: string;
    updates: Partial<TodoFormData & { completed: boolean }>;
  }): Promise<Todo> => {
    const { data } = await api.put<{ success: boolean; data: Todo }>(`/todos/${id}`, updates);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/todos/${id}`);
  },
};

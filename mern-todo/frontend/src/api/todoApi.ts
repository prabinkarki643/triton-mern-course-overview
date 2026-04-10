import api from "./axios";
import type { Todo } from "@/types/todo";
import type { TodoFormData } from "@/schemas/todoSchema";

export const todoApi = {
  getAll: async (): Promise<Todo[]> => {
    const { data } = await api.get<Todo[]>("/todos");
    return data;
  },

  create: async (todo: TodoFormData): Promise<Todo> => {
    const { data } = await api.post<Todo>("/todos", todo);
    return data;
  },

  update: async ({
    id,
    updates,
  }: {
    id: string;
    updates: Partial<TodoFormData & { completed: boolean }>;
  }): Promise<Todo> => {
    const { data } = await api.patch<Todo>(`/todos/${id}`, updates);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/todos/${id}`);
  },
};

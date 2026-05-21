// webapp/src/services/todoApi.ts
import type {
  CreateTodoData,
  Todo,
  TodoFilters,
  UpdateTodoData,
} from "@/types/todo"
import api from "./api"

interface GetAllTodosResponse {
  data: Todo[]
  meta?: unknown
}

interface GetSingleTodoResponse {
  data: Todo
}

export const todoApi = {
  // Get all todos (with optional filters)
  async getAll(filters: TodoFilters = {}) {
    const params: Record<string, string> = {}
    if (filters.completed !== undefined) {
      params.completed = String(filters.completed)
    }
    if (filters.priority) params.priority = filters.priority
    if (filters.search) params.search = filters.search

    const { data } = await api.get<GetAllTodosResponse>("/todos", {
      params: params,
    })
    return data.data
  },

  // Get single todo
  async getById(id: string) {
    const { data } = await api.get<GetSingleTodoResponse>(`/todos/${id}`)
    return data.data
  },

  // Create a new todo
  async create(todoData: CreateTodoData): Promise<Todo> {
    const { data } = await api.post<GetSingleTodoResponse>("/todos", todoData)
    return data.data
  },

  // Update a todo
  async update(id: string, todoData: UpdateTodoData): Promise<Todo> {
    const { data } = await api.put<GetSingleTodoResponse>(
      `/todos/${id}`,
      todoData
    )
    return data.data
  },

  // Delete a todo
  async delete(id: string): Promise<void> {
    await api.delete(`/todos/${id}`)
  },
}

export interface Todo {
  _id: string // MongoDB ObjectId as a string
  title: string
  priority: "low" | "medium" | "high"
  completed: boolean
  createdAt: string // ISO date string from the API
  updatedAt: string // ISO date string from the API
}

export interface CreateTodoData {
  title: string
  priority: "low" | "medium" | "high"
}

export interface UpdateTodoData {
  title?: string
  priority?: "low" | "medium" | "high"
  completed?: boolean
}

export interface TodoFilters {
  page?: number;
  limit?: number;
  completed?: boolean
  priority?: string
  search?: string
  sort?: string
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface TodoStats {
  total: number
  completed: number
  active: number
  percentage: number
}

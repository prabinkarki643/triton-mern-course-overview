export interface Todo {
  id: number;
  title: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
}

export interface CreateTodoBody {
  title: string;
  priority?: Todo["priority"];
}

export interface TodoQueryParams {
  completed?: string;
  priority?: string;
  search?: string;
  sort?: string;
  page?: string;
  limit?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UpdateTodoBody {
  title?: string;
  priority?: Todo["priority"];
  completed?: boolean;
}
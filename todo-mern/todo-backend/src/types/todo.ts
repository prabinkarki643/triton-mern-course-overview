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

export interface UpdateTodoBody {
  title?: string;
  priority?: Todo["priority"];
  completed?: boolean;
}
export interface Todo {
  _id: string;
  title: string;
  priority: "low" | "medium" | "high";
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FilterType = "all" | "active" | "completed";

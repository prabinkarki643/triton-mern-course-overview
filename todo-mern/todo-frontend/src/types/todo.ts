export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  priority?: "high" | "medium" | "low" ;
}
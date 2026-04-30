import type { Todo } from "@/types/todo"
import { createContext, useContext, useState } from "react"

// 1. Define the shape of the context value
export interface TodoContextType {
  tasks: Todo[]
  filteredTasks: Todo[]
  filter: string
  setFilter: (filter: string) => void
  addTask: (title: string, priority?: Todo["priority"]) => void
  toggleTask: (id: number) => void
  deleteTask: (id: number) => void
  editTask: (id: number, title: string, priority: Todo["priority"]) => void
  completedCount: number
}
// 2. Create the context with undefined as default
//    (undefined because there is no Provider yet at creation time)
const TodoContext = createContext<TodoContextType | undefined>(undefined)

// 3. Create a typed custom hook (makes consuming easier and safer)
export const useTodo = (): TodoContextType => {
  const context = useContext(TodoContext)
  if (!context) {
    throw new Error("useTodo must be used within a TodoProvider")
  }
  return context
}

// 4. Define the Provider's props
interface TodoProviderProps {
  children: React.ReactNode
}

// 5. Create the Provider component

const defaultTasks: Todo[] = [
  { id: 1, title: "Learn HTML", completed: true, priority: "high" },
  { id: 2, title: "Learn CSS", completed: true, priority: "medium" },
  { id: 3, title: "Learn JavaScript", completed: false, priority: "high" },
  { id: 4, title: "Learn React", completed: false, priority: "low" },
]
export function TodoProvider({ children }: TodoProviderProps) {
  const [tasks, setTasks] = useState<Todo[]>(defaultTasks)

  const [filter, setFilter] = useState<string>("all")

  const addTask = (
    title: string,
    priority: Todo["priority"] = "medium"
  ): void => {
    const newTask: Todo = {
      id: Date.now(),
      title,
      priority,
      completed: false,
      createdAt: new Date().toISOString(),
    }
    setTasks((prev: Todo[]) => [...prev, newTask])
  }

  const toggleTask = (id: number): void => {
    setTasks((prev: Todo[]) =>
      prev.map((task: Todo) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    )
  }

  const deleteTask = (id: number): void => {
    setTasks((prev: Todo[]) => prev.filter((task: Todo) => task.id !== id))
  }

  const editTask = (
    id: number,
    title: string,
    priority: Todo["priority"]
  ): void => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, title, priority } : task))
    )
  }

  // Derived state - filtered tasks based on current filter
  const filteredTasks: Todo[] = tasks.filter((task: Todo) => {
    if (filter === "active") return !task.completed
    if (filter === "completed") return task.completed
    return true // "all"
  })

  const completedCount: number = tasks.filter((t: Todo) => t.completed).length

  // The value object matches the TodoContextType interface exactly
  const value: TodoContextType = {
    tasks,
    filteredTasks,
    filter,
    setFilter,
    addTask,
    toggleTask,
    deleteTask,
    editTask,
    completedCount,
  }

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>
}

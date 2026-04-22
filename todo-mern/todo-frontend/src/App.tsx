import { useState } from "react"
import { Header } from "./components/Header"
import TodoList from "./components/TodoList"
import type { Todo } from "./types/todo"
import AddTodoForm from "./components/AddTodoForm"

const defaultTasks: Todo[] = [
  { id: 1, title: "Learn HTML", completed: true, priority: "high" },
  { id: 2, title: "Learn CSS", completed: true, priority: "medium" },
  { id: 3, title: "Learn JavaScript", completed: false, priority: "high" },
  { id: 4, title: "Learn React", completed: false, priority: "low" },
]

export function App() {
  const [tasks, setTasks] = useState<Todo[]>(defaultTasks)

  const addTask = (title: string) => {
    const newTask: Todo = {
      id: Date.now(),
      title,
      completed: false,
      priority: "low",
    }

    // const oldTasks = [...tasks]
    // oldTasks.push(newTask)
    // setTasks(oldTasks)
    setTasks((prev) => [...prev, newTask])
  }

  const handleToggleTask = (id: number) => {
    setTasks((prev) => {
      return prev.map((task: Todo) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    })
  }

  const handleDeleteTask = (id: number): void => {
    setTasks((prev: Todo[]) => prev.filter((task: Todo) => task.id !== id))
  }

  const completedCount = tasks.filter((t: Todo) => t.completed).length

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gray-50 p-6">
      <Header
        title="My Todo App"
        taskCount={tasks.length}
        completedCount={completedCount}
      />
      <div className="mb-2">
        <AddTodoForm onAdd={addTask} />
      </div>
      <TodoList
        tasks={tasks}
        onDelete={handleDeleteTask}
        onToggle={handleToggleTask}
      />
    </div>
  )
}

export default App

import { Header } from "./components/Header"
import TodoList from "./components/TodoList"
import type { Todo } from "./types/todo"

export function App() {
  const tasks: Todo[] = [
    { id: 1, title: "Learn HTML", completed: true, priority: "high" },
    { id: 2, title: "Learn CSS", completed: true, priority: "medium" },
    { id: 3, title: "Learn JavaScript", completed: false, priority: "high" },
    { id: 4, title: "Learn React", completed: false, priority: "medium" },
  ]

  const completedCount = tasks.filter((t: Todo) => t.completed).length

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gray-50 p-6">
      <Header
        title="My Todo App"
        taskCount={tasks.length}
        completedCount={completedCount}
      />
      <TodoList tasks={tasks} />
    </div>
  )
}

export default App

import { Header } from "./components/Header"
import TodoList from "./components/TodoList"
import AddTodoForm from "./components/AddTodoForm"
import FilterButtons from "./components/FilterButtons"

export function App() {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gray-50 p-6">
      <Header title="My Todo App" />
      <div className="mb-2">
        <FilterButtons />
      </div>

      <div className="mb-2">
        <AddTodoForm />
      </div>
      <TodoList />
    </div>
  )
}

export default App

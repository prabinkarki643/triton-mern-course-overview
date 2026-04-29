import { Header } from "./components/Header"
import TodoList from "./components/TodoList"
import AddTodoForm from "./components/AddTodoForm"
import FilterButtons from "./components/FilterButtons"
import { Card, CardContent } from "./components/ui/card"

export function App() {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gray-50 p-6">
      <Header title="My Todo App" />
      <Card>
        <CardContent>
          <div className="mb-2">
            <FilterButtons />
          </div>

          <div className="mb-2">
            <AddTodoForm />
          </div>
          <TodoList />
        </CardContent>
      </Card>
    </div>
  )
}

export default App

import { Header } from "./components/Header"
import AddTodoForm from "./components/AddTodoForm"
import { Card, CardContent } from "./components/ui/card"
import { TodosTable } from "./components/todos/todos-table"

export function App() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-gray-50 p-6">
      <Header title="My Todo App" />
      <Card>
        <CardContent>
          <div className="mb-2">
            <AddTodoForm />
            <hr className="mt-5" />
          </div>
          <TodosTable />
        </CardContent>
      </Card>
    </div>
  )
}

export default App

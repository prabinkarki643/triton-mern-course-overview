import { useTodos } from "@/hooks/useTodos"
import TodoItem from "./TodoItem"

function TodoList() {
  const { data, isLoading, isError, error } = useTodos()

  if (isLoading) {
    return <p className="text-center">Loading...</p>
  }

  if (isError) {
    return (
      <p className="text-center text-destructive">Error: {error.message}</p>
    )
  }

  const todoData = data?.data || []

  if (todoData.length === 0) {
    return <p className="py-8 text-center text-gray-500">No tasks yet!</p>
  }

  return (
    <ul className="space-y-2">
      {todoData.map((task) => (
        <TodoItem key={task._id} task={task} />
      ))}
    </ul>
  )
}

export default TodoList

import TodoItem from "./TodoItem"
import { useTodo } from "@/context/TodoContext"

function TodoList() {
  const { filteredTasks } = useTodo()
  if (filteredTasks.length === 0) {
    return <p className="py-8 text-center text-gray-500">No tasks yet!</p>
  }

  return (
    <ul className="space-y-2">
      {filteredTasks.map((task) => (
        <TodoItem key={task.id} task={task} />
      ))}
    </ul>
  )
}

export default TodoList

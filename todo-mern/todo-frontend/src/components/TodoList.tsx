import type { Todo } from "@/types/todo"
import TodoItem from "./TodoItem"

interface TodoListProps {
  tasks: Todo[]
  onToggle: (id: number) => void
  onDelete: (id: number) => void
}

function TodoList({ tasks, onDelete, onToggle }: TodoListProps) {
  if (tasks.length === 0) {
    return <p className="py-8 text-center text-gray-500">No tasks yet!</p>
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <TodoItem
          key={task.id}
          task={task}
          onDelete={onDelete}
          onToggle={onToggle}
        />
      ))}
    </ul>
  )
}

export default TodoList

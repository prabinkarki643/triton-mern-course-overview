import { useTodo } from "@/context/TodoContext"

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const { tasks, completedCount } = useTodo()
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {tasks.length} tasks | {completedCount} completed
      </p>
    </header>
  )
}

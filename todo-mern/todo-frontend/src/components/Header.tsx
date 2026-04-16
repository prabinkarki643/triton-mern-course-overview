interface HeaderProps {
  title: string
  taskCount?: number
  completedCount?: number
}

export function Header({ title, taskCount, completedCount }: HeaderProps) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {taskCount} tasks | {completedCount} completed
      </p>
    </header>
  )
}

// src/components/FilterButtons.tsx
import { useTodo } from "../context/TodoContext"
import { Button } from "@/components/ui/button"

function FilterButtons() {
  const { filter, setFilter } = useTodo()

  const filters: string[] = ["all", "active", "completed"]

  return (
    <div className="flex gap-1">
      {filters.map((f: string) => (
        <Button
          key={f}
          variant={filter === f ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter(f)}
        >
          {f.charAt(0).toUpperCase() + f.slice(1)}
        </Button>
      ))}
    </div>
  )
}

export default FilterButtons

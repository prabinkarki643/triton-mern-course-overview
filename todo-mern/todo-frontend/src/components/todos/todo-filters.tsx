// webapp/src/components/todos/todo-filters.tsx
import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTodosFilters } from "@/hooks/useTodosFilters"

export function TodoFilters() {
  const { filters, setFilter, resetFilters } = useTodosFilters()

  // Local input state so we can debounce
  const [searchInput, setSearchInput] = useState(filters.search ?? "")

  // Debounce: wait 300ms after the user stops typing, then update the URL
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== (filters.search ?? "")) {
        setFilter("search", searchInput || undefined)
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [searchInput]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep input in sync if the URL changes externally (e.g. user hits "Clear")
  //   useEffect(() => {
  //     setSearchInput(filters.search ?? "")
  //   }, [filters.search])

  const hasActiveFilters =
    !!filters.search || !!filters.priority || filters.completed !== undefined

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search by title..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="max-w-xs"
      />

      <Select
        value={filters.priority ?? "all"}
        onValueChange={(v) =>
          setFilter(
            "priority",
            v === "all" ? undefined : (v as "low" | "medium" | "high")
          )
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={
          filters.completed === undefined
            ? "all"
            : filters.completed
              ? "true"
              : "false"
        }
        onValueChange={(v) =>
          setFilter("completed", v === "all" ? undefined : v === "true")
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="false">Active</SelectItem>
          <SelectItem value="true">Completed</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <X className="mr-1 h-4 w-4" /> Clear
        </Button>
      )}
    </div>
  )
}

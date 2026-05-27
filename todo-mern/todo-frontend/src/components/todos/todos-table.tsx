// webapp/src/components/todos/todos-table.tsx
import { DataTable } from "@/components/ui/data-table"
import { TodoFilters } from "./todo-filters"
import { TodoPagination } from "./todo-pagination"
import { useTodoColumns } from "./todo-columns"
import { useTodos } from "@/hooks/useTodos"
import { useTodosFilters } from "@/hooks/useTodosFilters"

export function TodosTable() {
  const { filters } = useTodosFilters()
  const columns = useTodoColumns()
  const { data, isLoading } = useTodos(filters)

  return (
    <div className="space-y-4">
      <TodoFilters />
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        emptyMessage="No todos match your filters."
        pageCount={data?.meta.totalPages ?? 1}
        pageIndex={(filters.page ?? 1) - 1}
        pageSize={filters.limit ?? 10}
      />
      <TodoPagination meta={data?.meta} />
    </div>
  )
}

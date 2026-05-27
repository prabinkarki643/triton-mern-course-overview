// webapp/src/hooks/useTodosFilters.ts
import { useSearchParams } from 'react-router-dom';
import type { TodoFilters } from '../types/todo';

export function useTodosFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read each filter from the URL with sensible defaults
  const filters: TodoFilters = {
    page: Number(searchParams.get('page')) || 1,
    limit: Number(searchParams.get('limit')) || 10,
    search: searchParams.get('search') || undefined,
    priority: (searchParams.get('priority') as TodoFilters['priority']) || undefined,
    completed: searchParams.get('completed')
      ? searchParams.get('completed') === 'true'
      : undefined,
    sort: searchParams.get('sort') || undefined,
  };

  // Update one or more filters at once
  const setFilters = (updates: Partial<TodoFilters>) => {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === '' || value === null) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    }

    setSearchParams(next, { replace: true });
  };

  // Helper: change a filter and reset page to 1
  const setFilter = (key: keyof TodoFilters, value: TodoFilters[typeof key]) => {
    setFilters({ [key]: value, page: 1 });
  };

  const resetFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  return { filters, setFilters, setFilter, resetFilters };
}
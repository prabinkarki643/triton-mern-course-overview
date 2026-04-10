import type { FilterType } from "@/types/todo";
import { Button } from "@/components/ui/button";

interface FilterButtonsProps {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const filters: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

export function FilterButtons({ filter, onFilterChange }: FilterButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      {filters.map((f) => (
        <Button
          key={f.value}
          variant={filter === f.value ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(f.value)}
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}

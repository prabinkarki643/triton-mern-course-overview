import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { todoSchema, type TodoFormData } from "@/schemas/todoSchema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

interface AddTodoFormProps {
  onSubmit: (data: TodoFormData) => Promise<void>;
  isSubmitting: boolean;
}

export function AddTodoForm({ onSubmit, isSubmitting }: AddTodoFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TodoFormData>({
    resolver: zodResolver(todoSchema),
    defaultValues: {
      title: "",
      priority: "medium",
    },
  });

  const handleFormSubmit = async (data: TodoFormData) => {
    await onSubmit(data);
    reset();
  };

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              placeholder="What needs to be done?"
              {...register("title")}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="flex items-end gap-3">
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                {...register("priority")}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              {errors.priority && (
                <p className="text-xs text-destructive">
                  {errors.priority.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              <Plus className="size-4" />
              {isSubmitting ? "Adding..." : "Add Task"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// src/components/AddTodoForm.tsx
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface AddTodoFormProps {
  onAdd: (title: string) => void
}

function AddTodoForm({ onAdd }: AddTodoFormProps) {
  const [inputValue, setInputValue] = useState<string>("")

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (inputValue.trim() === "") {
      toast("Please enter a todo title")
      return
    }
    onAdd(inputValue.trim())
    setInputValue("")
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Enter your title..."
      />
      <Button type="submit">Add</Button>
    </form>
  )
}

export default AddTodoForm

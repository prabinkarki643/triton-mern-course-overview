import { Button } from "./components/ui/button"
import { Checkbox } from "./components/ui/checkbox"
import { Input } from "./components/ui/input"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card"

export function Example() {
  return (
    <div className="space-y-2">
      {/* Button - replaces <button> */}
      <Button>Click Me</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="destructive">Delete</Button>
      <Button size="sm">Small</Button>

      {/* Input - replaces <input> */}
      <Input placeholder="Type something..." />

      {/* Checkbox - replaces <input type="checkbox"> */}
      <div className="flex items-center gap-2">
        <Checkbox id="task" />
        <label htmlFor="task">Complete this task</label>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
          <CardAction>Card Action</CardAction>
        </CardHeader>
        <CardContent>
          <p>Card Content</p>
        </CardContent>
        <CardFooter>
          <p>Card Footer</p>
        </CardFooter>
      </Card>
    </div>
  )
}

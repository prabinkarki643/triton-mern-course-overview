// src/pages/HomePage.tsx

import { Link } from "react-router-dom"

function HomePage() {
  return (
    <div className="py-16 text-center">
      <h1 className="mb-4 text-4xl font-bold">Welcome to BookMyRoom</h1>
      <p className="text-lg text-muted-foreground">
        Find and book the perfect room for your next event.
      </p>
      <Link
        to="/todos"
        className="mt-4 text-primary underline hover:no-underline"
      >
        Check Todo App
      </Link>
    </div>
  )
}

export default HomePage

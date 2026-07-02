// src/pages/NotFoundPage.tsx
import { Link } from "react-router-dom"

function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="mb-4 text-6xl font-bold text-muted-foreground">404</h1>
      <p className="mb-8 text-xl">Page not found</p>
      <Link to="/" className="text-primary underline hover:no-underline">
        Go back home
      </Link>
    </div>
  )
}

export default NotFoundPage

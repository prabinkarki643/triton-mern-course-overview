import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { Toaster } from "./components/ui/sonner.tsx"
import { TodoProvider } from "./context/TodoContext.tsx"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter } from "react-router-dom"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // Data is fresh for 1 minute
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: true, // Refetch when tab regains focus
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TodoProvider>
          <ThemeProvider>
            <App />
            <Toaster />
          </ThemeProvider>
        </TodoProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)

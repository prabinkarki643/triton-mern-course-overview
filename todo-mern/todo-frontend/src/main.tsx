import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { Toaster } from "./components/ui/sonner.tsx"
import { TodoProvider } from "./context/TodoContext.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TodoProvider>
      <ThemeProvider>
        <App />
        <Toaster />
      </ThemeProvider>
    </TodoProvider>
  </StrictMode>
)

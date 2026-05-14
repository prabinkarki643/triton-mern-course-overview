// backend/src/index.ts
import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { connectDatabase } from "./database";
import todoRoutes from "./routes/todoRoutes";

const app = express();

const PORT = 4000;

// Middleware
app.use(cors()); // Allow requests from React app
app.use(express.json()); // Parse JSON request bodies

// Custom middleware - logs every request
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`);
  next(); // Pass to the next middleware/route
});

// A simple route
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Hello from the backend!",
  });
});

// Routes
// TODO APIS
app.use("/api/todos", todoRoutes);

// Error handling middleware (must have 4 parameters)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  // Handle Mongoose validation errors (just in case schema validation fails)
  if (err.name === "ValidationError") {
    res.status(400).json({ error: err.message });
    return;
  }

  // Handle invalid ObjectId errors
  if (err.name === "CastError") {
    res.status(400).json({ error: "Invalid ID format" });
    return;
  }

  res.status(500).json({
    error: err.message || "Something went wrong!",
  });
});

// Connect to database, then start server
connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});

// src/index.ts
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database";
import authRoutes from "./routes/authRoutes";

// Load environment variables BEFORE anything else
dotenv.config();

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 4001;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3002",
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Health check route
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", message: "BookMyRoom API is running" });
});

// Global error handler -- safety net for anything thrown outside a
// controller's try/catch (e.g. Mongoose ValidationError, CastError).
app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    console.error("Unhandled error:", err);

    if (err.name === "ValidationError") {
      res.status(400).json({ message: err.message });
      return;
    }

    if (err.name === "CastError") {
      res.status(400).json({ message: "Invalid ID format" });
      return;
    }

    res.status(500).json({ message: err.message || "Server error" });
  }
);

// Connect to database, then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

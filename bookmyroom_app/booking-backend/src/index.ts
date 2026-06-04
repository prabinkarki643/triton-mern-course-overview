// src/index.ts
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database";

// Load environment variables BEFORE anything else
dotenv.config();

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 4001;

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3001",
    credentials: true,
  })
);
app.use(express.json());

// Health check route
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", message: "BookMyRoom API is running" });
});

// Connect to database, then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
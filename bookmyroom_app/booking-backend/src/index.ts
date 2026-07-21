// src/index.ts
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import connectDB from "./config/database";
import { paths } from "./config/paths";
import authRoutes from "./routes/authRoutes";
import roomRoutes from "./routes/roomRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import { startCronJobs } from "./services/cronService";
import dns from "dns";

// Optional DNS override for MongoDB Atlas connections.
//
// The Atlas connection string uses the mongodb+srv:// scheme, which
// asks Node to resolve DNS SRV and TXT records for the cluster host.
// Some ISPs and campus/university networks filter or fail these
// lookups -- the driver then throws "querySrv ENOTFOUND" or
// "queryTxt ENODATA" and the app can't reach Mongo.
//
// dns.setServers() overrides Node's DNS resolver just for THIS
// process (nothing else on the machine changes) and points it at
// Google's Public DNS, which reliably serves SRV / TXT records.
// If you never hit Atlas resolution errors you can safely delete
// these two lines.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

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

// Serve uploaded room images from /uploads
app.use("/uploads", express.static(paths.uploads));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Health check route
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", message: "BookMyRoom API is running" });
});

// Global error handler -- safety net for anything thrown outside a
// controller's try/catch (Mongoose ValidationError, CastError, MulterError).
app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    console.error("Unhandled error:", err);

    // Multer errors (file size / count / unexpected field)
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res
          .status(400)
          .json({ message: "Each image must be under 5 MB" });
        return;
      }
      if (err.code === "LIMIT_FILE_COUNT") {
        res
          .status(400)
          .json({ message: "You can upload up to 5 images at a time" });
        return;
      }
      res.status(400).json({ message: err.message });
      return;
    }

    // File-filter rejection from upload.ts
    if (err.message === "Only .jpg, .png, and .webp image files are allowed") {
      res.status(400).json({ message: err.message });
      return;
    }

    // Mongoose validation
    if (err.name === "ValidationError") {
      res.status(400).json({ message: err.message });
      return;
    }

    // Invalid MongoDB ObjectId
    if (err.name === "CastError") {
      res.status(400).json({ message: "Invalid ID format" });
      return;
    }

    res.status(500).json({ message: err.message || "Server error" });
  }
);

// Connect to database, then start server + scheduled jobs
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startCronJobs();
  });
});

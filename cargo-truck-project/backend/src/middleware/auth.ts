// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "../models/User";

const JWT_SECRET: string = process.env.JWT_SECRET || "fallback-secret";

interface TokenPayload {
  userId: string;
  role: UserRole;
}

// Require authentication. Reads the JWT from the Authorization header,
// verifies it, attaches the decoded user to req.user, and calls next().
// On any failure responds 401.
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader: string | undefined = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const token: string = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Require a specific role. Use after requireAuth:
//   router.post("/", requireAuth, requireRole("transporter"), createTruck);
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: "You do not have permission to perform this action",
      });
      return;
    }

    next();
  };
};

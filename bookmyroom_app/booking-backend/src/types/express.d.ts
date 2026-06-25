// src/types/express.d.ts
// Extends the Express Request type so req.user is recognised everywhere

import "express";

declare module "express" {
  interface Request {
    user?: {
      userId: string;
      role: "owner" | "user";
    };
  }
}

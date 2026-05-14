// backend/src/middleware/validate-result.middleware.ts
import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

export const validateResult = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((err) => ({
        field: err.type === "field" ? err.path : "unknown",
        message: err.msg,
      })),
    });
    return;
  }

  next();
};
// src/validators/auth.validator.ts
import { body } from "express-validator";

// POST /api/auth/register
export const registerValidator = [
  body("name")
    .exists({ checkFalsy: true })
    .withMessage("Name is required")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be 2-50 characters"),

  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .exists({ checkFalsy: true })
    .withMessage("Password is required")
    .bail()
    .isLength({ min: 6, max: 100 })
    .withMessage("Password must be at least 6 characters"),

  body("phone")
    .exists({ checkFalsy: true })
    .withMessage("Phone number is required")
    .bail()
    .isString()
    .trim()
    .isLength({ min: 7 })
    .withMessage("Phone number must be at least 7 digits"),

  body("role")
    .optional()
    .isIn(["user", "owner"])
    .withMessage("Role must be user or owner"),
];

// POST /api/auth/login
export const loginValidator = [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email is required")
    .bail()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .exists({ checkFalsy: true })
    .withMessage("Password is required"),
];

// src/controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import User, { IUser } from "../models/User";

const JWT_SECRET: string = process.env.JWT_SECRET || "fallback-secret";
const JWT_OPTIONS: SignOptions = { expiresIn: "7d" };

interface TokenPayload {
  userId: string;
  role: "owner" | "user";
}

const generateToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: (user._id as { toString(): string }).toString(),
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, JWT_OPTIONS);
};

// Strip the password (and any future sensitive fields) before sending
// the user back to the client.
const toPublicUser = (user: IUser) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// POST /api/auth/register
// Validation handled by registerValidator + validateResult middleware
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Check if user already exists
    const existingUser: IUser | null = await User.findOne({ email });
    if (existingUser) {
      res
        .status(400)
        .json({ message: "A user with this email already exists" });
      return;
    }

    // Hash the password
    const saltRounds: number = 10;
    const hashedPassword: string = await bcrypt.hash(password, saltRounds);

    // Create the user
    const user: IUser = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: role || "user",
    });

    // Generate JWT
    const token: string = generateToken(user);

    res.status(201).json({
      data: {
        user: toPublicUser(user),
        token,
      },
    });
  } catch (error: unknown) {
    console.error("register error:", error);
    res.status(500).json({ message: "Failed to register user" });
  }
};

// POST /api/auth/login
// Validation handled by loginValidator + validateResult middleware
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user and explicitly include the password field
    const user: IUser | null = await User.findOne({ email }).select(
      "+password"
    );
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Compare passwords
    const isPasswordValid: boolean = await bcrypt.compare(
      password,
      user.password
    );
    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Generate JWT
    const token: string = generateToken(user);

    res.status(200).json({
      data: {
        user: toPublicUser(user),
        token,
      },
    });
  } catch (error: unknown) {
    console.error("login error:", error);
    res.status(500).json({ message: "Failed to log in" });
  }
};

// GET /api/auth/me
// Requires requireAuth middleware so req.user is set
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId: string = req.user!.userId;

    const user: IUser | null = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      data: toPublicUser(user),
    });
  } catch (error: unknown) {
    console.error("getMe error:", error);
    res.status(500).json({ message: "Failed to fetch current user" });
  }
};

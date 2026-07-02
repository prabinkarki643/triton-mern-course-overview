// src/config/paths.ts
import path from "path";

// __dirname here is src/config/, so go up twice to reach the backend project root.
// Every filesystem path in the app derives from this one anchor -- change it once,
// everywhere follows.
export const APP_ROOT: string = path.resolve(__dirname, "..", "..");

export const paths = {
  root: APP_ROOT,
  uploads: path.join(APP_ROOT, "uploads"),
  roomImages: path.join(APP_ROOT, "uploads", "rooms"),
} as const;

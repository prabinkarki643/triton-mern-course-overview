// src/middleware/upload.ts
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { paths } from "../config/paths";

// Where uploaded room images live on disk
const uploadDir: string = paths.roomImages;

// Make sure the directory exists on boot (Multer will not create it)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Disk storage: pick the destination + a unique filename
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Prefix with a timestamp so two uploads with the same name never collide
    const uniqueSuffix: string = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}`;
    const ext: string = path.extname(file.originalname).toLowerCase();
    const base: string = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();
    cb(null, `${uniqueSuffix}-${base}${ext}`);
  },
});

// Accept only jpg, png, and webp images
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const allowedMimeTypes: string[] = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];
  const allowedExtensions: string[] = [".jpg", ".jpeg", ".png", ".webp"];

  const mimeOk: boolean = allowedMimeTypes.includes(file.mimetype);
  const extOk: boolean = allowedExtensions.includes(
    path.extname(file.originalname).toLowerCase()
  );

  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpg, .png, and .webp image files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 5, // up to 5 files per request
  },
});

export default upload;

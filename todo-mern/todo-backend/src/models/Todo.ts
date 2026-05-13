// backend/src/models/Todo.ts
import mongoose, { Schema, Document } from 'mongoose';

// Interface defines the shape of a Todo document
export interface ITodo extends Document {
  title: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schema defines validation rules and defaults
const todoSchema = new Schema<ITodo>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title must be under 100 characters'],
      trim: true,
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Priority must be low, medium, or high',
      },
      default: 'medium',
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Model provides methods to query and manipulate documents
export const Todo = mongoose.model<ITodo>('Todo', todoSchema);
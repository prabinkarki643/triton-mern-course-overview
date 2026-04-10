import { Request, Response } from 'express';
import { Todo } from '../models/Todo';
import asyncHandler from '../middleware/asyncHandler';

// @desc    Get all todos
// @route   GET /api/todos
// @access  Public
export const getAllTodos = asyncHandler(async (req: Request, res: Response) => {
  const { completed, priority, search, sort } = req.query;

  // Build filter object
  const filter: Record<string, any> = {};

  if (completed !== undefined) {
    filter.completed = completed === 'true';
  }

  if (priority && ['low', 'medium', 'high'].includes(priority as string)) {
    filter.priority = priority;
  }

  if (search) {
    filter.title = { $regex: search as string, $options: 'i' };
  }

  // Build sort object
  let sortOption: Record<string, 1 | -1> = { createdAt: -1 };

  if (sort) {
    const sortField = (sort as string).startsWith('-')
      ? (sort as string).slice(1)
      : (sort as string);
    const sortOrder = (sort as string).startsWith('-') ? -1 : 1;
    sortOption = { [sortField]: sortOrder as 1 | -1 };
  }

  const todos = await Todo.find(filter).sort(sortOption);

  res.status(200).json({
    success: true,
    count: todos.length,
    data: todos,
  });
});

// @desc    Get a single todo by ID
// @route   GET /api/todos/:id
// @access  Public
export const getTodoById = asyncHandler(async (req: Request, res: Response) => {
  const todo = await Todo.findById(req.params.id);

  if (!todo) {
    res.status(404).json({
      success: false,
      message: 'Todo not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: todo,
  });
});

// @desc    Create a new todo
// @route   POST /api/todos
// @access  Public
export const createTodo = asyncHandler(async (req: Request, res: Response) => {
  const { title, priority } = req.body;

  if (!title || title.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Title is required',
    });
    return;
  }

  const todo = await Todo.create({
    title: title.trim(),
    priority: priority || 'medium',
  });

  res.status(201).json({
    success: true,
    data: todo,
  });
});

// @desc    Update a todo
// @route   PUT /api/todos/:id
// @access  Public
export const updateTodo = asyncHandler(async (req: Request, res: Response) => {
  const { title, priority, completed } = req.body;

  const updateData: Record<string, any> = {};

  if (title !== undefined) {
    if (title.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Title cannot be empty',
      });
      return;
    }
    updateData.title = title.trim();
  }

  if (priority !== undefined) {
    if (!['low', 'medium', 'high'].includes(priority)) {
      res.status(400).json({
        success: false,
        message: 'Priority must be low, medium, or high',
      });
      return;
    }
    updateData.priority = priority;
  }

  if (completed !== undefined) {
    updateData.completed = completed;
  }

  const todo = await Todo.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!todo) {
    res.status(404).json({
      success: false,
      message: 'Todo not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: todo,
  });
});

// @desc    Delete a todo
// @route   DELETE /api/todos/:id
// @access  Public
export const deleteTodo = asyncHandler(async (req: Request, res: Response) => {
  const todo = await Todo.findByIdAndDelete(req.params.id);

  if (!todo) {
    res.status(404).json({
      success: false,
      message: 'Todo not found',
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Todo deleted successfully',
    data: todo,
  });
});

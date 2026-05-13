// backend/src/routes/todoRoutes.ts
import { Router, Request, Response } from 'express';
import { Todo, ITodo } from '../models/Todo';

const todoRoutes = Router();

// GET all todos
todoRoutes.get('/', async (_req: Request, res: Response) => {
  try {
    const todos: ITodo[] = await Todo.find().sort({ createdAt: -1 });
    res.json({ data: todos });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// GET single todo
todoRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const todo: ITodo | null = await Todo.findById(req.params.id);
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json({ data: todo });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch todo' });
  }
});

// POST create todo
todoRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { title, priority } = req.body as {
      title: string;
      priority?: string;
    };

    const todo: ITodo = await Todo.create({
      title,
      priority: (priority || 'medium') as ITodo['priority'],
    });
    res.status(201).json({ data: todo });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create todo' });
    }
  }
});

// PUT update todo
todoRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const { title, priority, completed } = req.body as {
      title?: string;
      priority?: string;
      completed?: boolean;
    };

    const todo: ITodo | null = await Todo.findByIdAndUpdate(
      req.params.id,
      { title, priority, completed },
      { new: true, runValidators: true }
    );

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json({ data: todo });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ValidationError') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update todo' });
    }
  }
});

// DELETE todo
todoRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const todo: ITodo | null = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

export default todoRoutes;
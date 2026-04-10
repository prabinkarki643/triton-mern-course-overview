import { Router } from 'express';
import {
  getAllTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
} from '../controllers/todoController';

const router = Router();

router.route('/').get(getAllTodos).post(createTodo);

router.route('/:id').get(getTodoById).put(updateTodo).delete(deleteTodo);

export default router;

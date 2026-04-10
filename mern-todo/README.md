# MERN Todo App

A full-stack Todo application built with the MERN stack (MongoDB, Express, React, Node.js) using TypeScript throughout. This is the companion project for the course lessons 04-17.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, React Hook Form, Zod, React Query, Axios |
| **Backend** | Node.js, Express.js, TypeScript, Mongoose |
| **Database** | MongoDB (Atlas) |

## Project Structure

```
mern-todo/
├── frontend/          # React + Vite frontend
│   ├── src/
│   │   ├── api/       # Axios instance + API service
│   │   ├── components/# UI components (Header, TodoItem, etc.)
│   │   ├── hooks/     # Custom React Query hooks
│   │   ├── schemas/   # Zod validation schemas
│   │   └── types/     # TypeScript interfaces
│   └── .env.example
│
├── backend/           # Express + Mongoose API
│   ├── src/
│   │   ├── config/    # MongoDB connection
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/    # Mongoose schemas
│   │   └── routes/
│   └── .env.example
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas account (free tier) or local MongoDB

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB Atlas connection string
npm install
npm run dev
```

Server runs at `http://localhost:3001`

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App runs at `http://localhost:5173`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/todos` | List all todos (supports `?completed=true&priority=high&search=keyword&sort=-createdAt`) |
| GET | `/api/todos/:id` | Get single todo |
| POST | `/api/todos` | Create todo (`{ title, priority }`) |
| PUT | `/api/todos/:id` | Update todo (`{ title?, priority?, completed? }`) |
| DELETE | `/api/todos/:id` | Delete todo |
| GET | `/api/health` | Health check |

## Features

- Add tasks with title and priority (validated with Zod)
- Toggle completion with checkboxes
- Edit tasks via dialog
- Delete tasks
- Filter by All / Active / Completed
- Priority badges (Low, Medium, High)
- Task count and statistics
- Responsive design with Tailwind CSS
- Full TypeScript type safety
- Data persisted in MongoDB

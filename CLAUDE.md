# React & Node.js Beginner Teaching Project

## Project Identity
This is a **teaching/educational project** designed to guide complete beginners through building a web application with React JS. The instructor is Prabin, a senior full-stack developer teaching students who are new to web development.

## Project Purpose
Teach students to build functional web applications from scratch, progressing from HTML/CSS/JS fundamentals through to modern React applications with proper form handling, validation, UI components, authentication, file uploads, and payment integration. Students build two projects: a Todo app (beginner) and a Room Booking app (intermediate).

## Tech Stack
- **Frontend Framework**: React 18+ (via Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Form Handling**: React Hook Form
- **Validation**: Zod
- **Data Fetching**: React Query (TanStack Query)
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **State Management**: React Context API
- **Build Tool**: Vite
- **Runtime**: Node.js
- **Backend Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **File Uploads**: Multer
- **Authentication**: JWT + bcrypt
- **Payment Gateway**: eSewa
- **Package Manager**: npm

## Project Structure
```
react-node-beginer/
├── CLAUDE.md              # This file - project instructions
├── SUMMARY.md             # Teaching roadmap and curriculum overview
├── lessons/               # Individual lesson markdown files
│   ├── 01-html-basics.md              # (Optional prerequisite)
│   ├── 02-css-basics.md               # (Optional prerequisite)
│   ├── 03-javascript-essentials.md    # (Optional prerequisite)
│   ├── 04-typescript-basics.md
│   ├── 05-nodejs-basics.md
│   ├── 06-react-introduction.md
│   ├── 07-react-components-and-jsx.md
│   ├── 08-react-state-and-props.md
│   ├── 09-react-context-api.md
│   ├── 10-tailwind-css-setup.md
│   ├── 11-shadcn-ui-components.md
│   ├── 12-react-hook-form-and-zod.md
│   ├── 13-building-the-todo-app.md
│   ├── 14-express-introduction.md
│   ├── 15-mongodb-and-mongoose.md
│   ├── 16-building-the-todo-api.md
│   ├── 17-axios-and-react-query.md
│   ├── 18-react-router.md
│   ├── 19-booking-app-setup.md
│   ├── 20-auth-backend.md
│   ├── 21-auth-frontend.md
│   ├── 22-rooms-backend-and-multer.md
│   ├── 23-owner-portal.md
│   ├── 24-room-browsing.md
│   ├── 25-booking-system.md
│   ├── 26-payment-integration.md
│   ├── 27-dashboard-and-polish.md
│   └── 28-deployment.md
├── webapp/                # The Vite + React Todo frontend
├── backend/               # The Express.js + Mongoose Todo backend
├── booking-frontend/      # The Vite + React Booking app frontend
└── booking-backend/       # The Express.js + Mongoose Booking app backend
```

## Teaching Guidelines
- **Audience**: Complete beginners with no prior coding experience
- **Language**: Clear, simple English - avoid jargon unless explained
- **Approach**: Theory first, then hands-on code examples, then practice exercises
- **Pace**: Each lesson builds on the previous - never skip fundamentals
- **Code Examples**: Every concept must have a working code snippet
- **Exercises**: Each lesson ends with practice tasks for students

## Rules for Content Creation
1. Keep explanations simple and beginner-friendly
2. Use real-world analogies to explain programming concepts
3. Every code block must be complete and runnable
4. Include expected output or behaviour for each example
5. Lessons should take 30-60 minutes each
6. Include "What You Will Learn" at the start of each lesson
7. Include "Practice Exercises" at the end of each lesson
8. Use British English for all written content
9. No assumptions about prior knowledge - explain everything
10. Build incrementally - each lesson adds to previous knowledge

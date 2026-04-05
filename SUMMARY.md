# Full-Stack / MERN Stack Beginner Course - Teaching Summary

## Course Overview
A hands-on full-stack / MERN Stack (MongoDB, Express, React, Node.js) course that takes students from zero web development knowledge to building complete web applications using TypeScript, React, Tailwind CSS, shadcn/ui, React Hook Form, and Zod validation.

**Final Outcome**: Students build a fully functional Todo app and a Room Booking app (BookMyRoom) with React frontend AND Express.js backend, using MongoDB with Mongoose for data persistence.

---

## Phase 1: Web Fundamentals (Lessons 1-3)

### Lesson 1: HTML Basics
- [ ] What is HTML and how browsers render pages
- [ ] Document structure (`<!DOCTYPE>`, `<html>`, `<head>`, `<body>`)
- [ ] Common elements: headings, paragraphs, lists, links, images
- [ ] Forms and input elements (text, checkbox, button)
- [ ] Semantic HTML (`<header>`, `<main>`, `<footer>`, `<section>`)
- **Exercise**: Build a static Todo list page in pure HTML

### Lesson 2: CSS Basics
- [ ] What is CSS and how it connects to HTML
- [ ] Selectors: element, class, ID
- [ ] Box model: margin, padding, border
- [ ] Flexbox layout basics
- [ ] Responsive design with media queries
- [ ] Styling text, colours, and backgrounds
- **Exercise**: Style the HTML Todo list from Lesson 1

### Lesson 3: JavaScript Essentials
- [ ] Variables (`let`, `const`), data types
- [ ] Functions (regular and arrow functions)
- [ ] Arrays and array methods (`map`, `filter`, `find`, `forEach`)
- [ ] Objects and destructuring
- [ ] Template literals and spread operator
- [ ] DOM manipulation basics (`querySelector`, `addEventListener`)
- [ ] ES6 modules (`import`/`export`)
- **Exercise**: Add interactivity to the Todo list (add/remove items with JS)

---

## Phase 2: TypeScript & Node.js Tooling (Lessons 4-5)

### Lesson 4: TypeScript Basics
- [ ] What is TypeScript and why use it
- [ ] Type annotations: string, number, boolean, arrays
- [ ] Interfaces and type aliases
- [ ] Typing functions (parameters and return types)
- [ ] Generics basics
- [ ] Union types and optional properties
- [ ] TypeScript with React (props types, useState types)
- **Exercise**: Convert JavaScript Todo functions to TypeScript

### Lesson 5: Node.js Basics
- [ ] What is Node.js and why developers use it
- [ ] Installing Node.js and using the terminal
- [ ] Running JavaScript/TypeScript files with `node`
- [ ] npm: what it is, `package.json`, installing packages
- [ ] Understanding `node_modules` and `.gitignore`
- [ ] Introduction to Vite as a build tool
- **Exercise**: Create a simple Node.js script, initialise a project with npm

---

## Phase 3: React Fundamentals (Lessons 6-9)

### Lesson 6: React Introduction
- [ ] What is React and why use it (component-based thinking)
- [ ] Setting up a React project with shadcn preset: `npx shadcn@latest init --preset [CODE] --template vite`
- [ ] Project structure walkthrough (`.tsx` files, not `.jsx`)
- [ ] JSX/TSX syntax - HTML in TypeScript
- [ ] Running the dev server (`npm run dev`)
- **Exercise**: Create a "Hello World" React app, modify the default page

### Lesson 7: React Components and JSX
- [ ] What are components (building blocks of React)
- [ ] Function components
- [ ] Returning JSX from components
- [ ] Importing and using components
- [ ] Passing data with props
- [ ] Rendering lists with `.map()` and the `key` prop
- [ ] Conditional rendering (`&&`, ternary operator)
- **Exercise**: Break the Todo list into reusable components (TodoItem, TodoList, Header)

### Lesson 8: React State and Props
- [ ] What is state and why it matters
- [ ] `useState` hook - adding interactivity
- [ ] Updating state correctly (immutability)
- [ ] Lifting state up (parent to child communication)
- [ ] Event handling (`onClick`, `onChange`, `onSubmit`)
- [ ] Controlled inputs
- **Exercise**: Make the Todo list interactive (add, toggle complete, delete)

### Lesson 9: React Context API
- [ ] The problem: prop drilling
- [ ] What is Context and when to use it
- [ ] Creating a Context (`createContext`)
- [ ] Providing values with `<Provider>`
- [ ] Consuming context with `useContext`
- [ ] Building a TodoContext for global state
- **Exercise**: Refactor the Todo app to use Context API for state management

---

## Phase 4: Modern UI & Forms (Lessons 10-12)

### Lesson 10: Tailwind CSS Setup
- [ ] What is Tailwind CSS (utility-first approach)
- [ ] Tailwind comes pre-installed via the shadcn preset
- [ ] Utility classes: spacing, colours, typography, layout
- [ ] Flexbox and Grid with Tailwind
- [ ] Responsive design with Tailwind breakpoints
- [ ] Dark mode basics
- **Exercise**: Restyle the Todo app with Tailwind CSS

### Lesson 11: shadcn/ui Components
- [ ] What is shadcn/ui (not a component library - a collection)
- [ ] Installing and configuring shadcn/ui
- [ ] Using Button, Input, Card, Checkbox components
- [ ] Customising components with Tailwind
- [ ] Badge and Dialog components for the Todo app
- **Exercise**: Replace custom UI with shadcn/ui components

### Lesson 12: React Hook Form and Zod
- [ ] Why use a form library (validation, performance, UX)
- [ ] Installing React Hook Form and Zod
- [ ] Creating a form schema with Zod
- [ ] `useForm` hook and `register` function
- [ ] Connecting Zod to React Hook Form with `zodResolver`
- [ ] Displaying validation errors
- [ ] Handling form submission
- **Exercise**: Build the Todo input form with validation (min 3 chars, required fields)

---

## Phase 5: Putting It All Together (Lesson 13)

### Lesson 13: Building the Complete Todo App
- [ ] Planning the app structure and features
- [ ] Setting up the project with shadcn preset (Vite + React + Tailwind + shadcn/ui in one command)
- [ ] Creating the TodoContext with full CRUD operations
- [ ] Building the Add Todo form (React Hook Form + Zod)
- [ ] Building the Todo list with filter/search
- [ ] Adding edit and delete functionality
- [ ] Adding categories/priority with shadcn Badge
- [ ] Final styling and responsive design
- [ ] Building for production (`npm run build`)
- **Exercise**: Complete the Todo app with all features working

---

## Phase 6: Backend with Express & MongoDB (Lessons 14-17)

### Lesson 14: Express.js Introduction
- [ ] What is Express.js and REST APIs
- [ ] Setting up an Express project
- [ ] Creating routes (GET, POST, PUT, DELETE)
- [ ] Middleware basics (JSON parsing, CORS)
- [ ] Request and response objects
- [ ] Testing APIs with the browser and tools
- **Exercise**: Create a simple Express server with basic routes

### Lesson 15: MongoDB and Mongoose
- [ ] What is MongoDB (document database vs relational)
- [ ] Setting up MongoDB Atlas (cloud, free tier)
- [ ] What is Mongoose (ODM - Object Document Mapper)
- [ ] Defining Schemas and Models
- [ ] Schema types, validation, and options
- [ ] Basic CRUD with Mongoose
- **Exercise**: Create the Todo model and connect to MongoDB

### Lesson 16: Building the Todo API
- [ ] CRUD endpoints for todos (Create, Read, Update, Delete)
- [ ] Request validation on the backend
- [ ] Error handling and status codes
- [ ] Filtering and sorting endpoints
- [ ] Structuring the Express app (routes, controllers)
- **Exercise**: Build complete Todo REST API with all CRUD operations

### Lesson 17: Axios & React Query
- [ ] Why Axios over Fetch (interceptors, base URL, error handling)
- [ ] Installing and configuring Axios instance
- [ ] Introduction to React Query (TanStack Query)
- [ ] `useQuery` for fetching data (GET)
- [ ] `useMutation` for create/update/delete
- [ ] Cache invalidation with `invalidateQueries`
- [ ] Loading and error states with React Query
- [ ] Environment variables for API URLs
- **Exercise**: Connect the React Todo app to the Express API using Axios + React Query

---

## Phase 7: BookMyRoom - Full-Stack Build (Lessons 18-27)

### Lesson 18: React Router
- [ ] Why routing (multi-page apps)
- [ ] Installing React Router v6
- [ ] BrowserRouter, Routes, Route setup
- [ ] Link and NavLink for navigation
- [ ] Route parameters (`:id`) and `useParams`
- [ ] Nested routes with `<Outlet />`
- [ ] Layout component pattern
- [ ] `useNavigate` for programmatic navigation
- [ ] Catch-all 404 route
- **Exercise**: Build a multi-page shell with Home, Login, Register routes

### Lesson 19: Booking App - Project Setup & Data Models
- [ ] Introducing BookMyRoom (room/venue booking app)
- [ ] Feature overview: Owner portal + User portal + Auth + Payments
- [ ] Setting up `booking-frontend/` (Vite + React + shadcn preset)
- [ ] Setting up `booking-backend/` (Express + TypeScript)
- [ ] Defining three Mongoose models: User, Room, Booking
- [ ] MongoDB Atlas connection config
- **Exercise**: Set up both projects, define all models, verify DB connection

### Lesson 20: Authentication Backend
- [ ] Why authentication (owners vs users)
- [ ] Password hashing with bcrypt
- [ ] User registration endpoint with Zod validation
- [ ] User login endpoint (find user, compare password, generate JWT)
- [ ] JWT explained (header.payload.signature, expiry)
- [ ] Auth middleware (extract token, verify, attach `req.user`)
- [ ] Role-based middleware (`requireRole("owner")`)
- [ ] GET /api/auth/me endpoint
- **Exercise**: Build complete auth API (register, login, me) and test endpoints

### Lesson 21: Authentication Frontend
- [ ] AuthContext (user, token, login, register, logout)
- [ ] Storing JWT in localStorage
- [ ] Axios interceptor to auto-attach Authorization header
- [ ] Login page (React Hook Form + Zod)
- [ ] Register page with role selection (Owner / User)
- [ ] ProtectedRoute component (redirect if not authenticated)
- [ ] Role-based route protection (owner-only routes)
- [ ] Navbar with login/register or user info + logout
- **Exercise**: Complete auth flow - register, login, protected dashboard

### Lesson 22: Room Management Backend & File Uploads
- [ ] Room CRUD endpoints (owner-only for CUD, public for read)
- [ ] Setting up Multer for file uploads (storage, file filter, size limit)
- [ ] POST /api/rooms with `upload.array('images', 5)`
- [ ] Serving static files: `express.static("uploads")`
- [ ] GET /api/rooms with pagination, filtering, and search
- [ ] PUT /api/rooms/:id (owner only, optional new images)
- [ ] DELETE /api/rooms/:id (owner only, delete image files)
- **Exercise**: Complete Room API with image upload, test with Postman

### Lesson 23: Owner Portal Frontend
- [ ] Owner layout with sidebar navigation
- [ ] "My Rooms" page (list rooms with useQuery)
- [ ] "Add Room" page (React Hook Form + image upload + FormData)
- [ ] Image preview before upload
- [ ] "Edit Room" page (pre-fill form, update images)
- [ ] Delete room with confirmation dialog (shadcn AlertDialog)
- [ ] `useMutation` + `invalidateQueries` for all mutations
- **Exercise**: Complete owner portal - list, create, edit, delete rooms

### Lesson 24: User-Facing Room Browsing
- [ ] Home page with featured rooms grid (shadcn Card)
- [ ] Room listing with filter sidebar (location, price range, capacity)
- [ ] Search bar with debounce
- [ ] Room detail page (image gallery, amenities, pricing, "Book Now")
- [ ] Responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
- [ ] Loading skeletons and empty states
- **Exercise**: Complete browsing experience with filters and room detail

### Lesson 25: Booking System
- [ ] Backend: POST /api/bookings (validate dates, check conflicts, calculate price)
- [ ] Date conflict detection (overlapping bookings query)
- [ ] GET /api/bookings/my (user's bookings with populate)
- [ ] GET /api/bookings/owner (owner's booking requests with populate)
- [ ] PATCH /api/bookings/:id/status (owner confirms/cancels)
- [ ] Frontend: Booking form (date inputs, guest count, price preview)
- [ ] "My Bookings" page with status badges
- [ ] "Booking Requests" page for owners with Confirm/Cancel
- **Exercise**: Complete booking flow end-to-end

### Lesson 26: Payment Integration (eSewa & COD)
- [ ] Payment methods overview: eSewa (online) and COD (Cash on Delivery)
- [ ] COD flow (simple: create booking with paymentMethod "cod")
- [ ] eSewa service (simplified, single file, no factory pattern)
- [ ] HMAC-SHA256 signature generation
- [ ] eSewa payment flow (initiate → redirect → verify)
- [ ] Backend: POST /api/payments/initiate and /api/payments/verify
- [ ] Frontend: payment method selection, eSewa form auto-submit
- [ ] Success and failure pages
- **Exercise**: Complete payment flow for both eSewa (sandbox) and COD

### Lesson 27: Dashboards, Stats & Polish
- [ ] Owner dashboard: stats cards (total rooms, bookings, revenue)
- [ ] MongoDB aggregation pipeline for stats
- [ ] User dashboard: upcoming bookings, past bookings
- [ ] Toast notifications (shadcn Sonner)
- [ ] Confirmation dialogs for destructive actions
- [ ] Form loading states and error messages
- [ ] Mobile-responsive navigation (hamburger menu)
- **Exercise**: Add dashboard stats and polish the app

---

## Phase 8: Deployment (Lesson 28)

### Lesson 28: Deployment & What's Next
- [ ] Building React for production (`npm run build`)
- [ ] MongoDB Atlas for production database
- [ ] Deploying backend to Render (free tier)
- [ ] Deploying frontend to Vercel
- [ ] Environment variables in production
- [ ] Testing the deployed app
- [ ] What's next: WebSockets, email notifications, testing, Docker, CI/CD
- **Exercise**: Deploy BookMyRoom and share the live URL

---

## Quick Reference - Key Concepts Per Lesson

| Lesson | Key Concepts | Tools/Libraries |
|--------|-------------|-----------------|
| 1 | HTML elements, forms, semantic markup | Browser |
| 2 | CSS selectors, box model, flexbox | Browser |
| 3 | Variables, functions, arrays, DOM | Browser + JS |
| 4 | Type annotations, interfaces, generics | TypeScript |
| 5 | Node.js, npm, packages, Vite | Terminal, Node.js |
| 6 | React, TSX, shadcn preset setup | Vite, React, shadcn |
| 7 | Components, props, lists, conditionals | React |
| 8 | useState, events, controlled inputs | React |
| 9 | Context API, useContext, global state | React |
| 10 | Utility classes, responsive, dark mode | Tailwind CSS |
| 11 | Pre-built components, customisation | shadcn/ui |
| 12 | Form handling, schema validation | React Hook Form, Zod |
| 13 | Full Todo app build, all concepts combined | Everything above |
| 14 | REST APIs, routes, middleware | Express.js |
| 15 | Document DB, schemas, models, CRUD | MongoDB, Mongoose |
| 16 | CRUD operations, error handling | Express + Mongoose |
| 17 | HTTP client, server state caching | Axios, React Query |
| 18 | Client-side routing, navigation, layouts | React Router v6 |
| 19 | Project architecture, data modelling | Mongoose, TypeScript |
| 20 | Authentication, JWT, password hashing | JWT, bcrypt |
| 21 | Auth state, protected routes, interceptors | React Context, Axios |
| 22 | File uploads, image handling, pagination | Multer, Express.js |
| 23 | CRUD UI, image upload interface | React, shadcn/ui |
| 24 | Search, filtering, responsive grids | React Query, Tailwind |
| 25 | Date availability, booking status flow | Mongoose, date handling |
| 26 | Payment gateway, signature verification | eSewa API, crypto |
| 27 | Data aggregation, dashboards, UX polish | Mongoose aggregation |
| 28 | Cloud deployment, managed database | Render, Vercel, Atlas |

---

## Estimated Timeline

| Phase | Lessons | Classes | Weeks |
|-------|---------|---------|-------|
| Phase 1: Web Fundamentals | 1-3 | 3 | 1 week |
| Phase 2: TypeScript & Tooling | 4-5 | 2 | ~1 week |
| Phase 3: React Fundamentals | 6-9 | 4 | ~1.5 weeks |
| Phase 4: Modern UI & Forms | 10-12 | 3 | 1 week |
| Phase 5: Todo App Build | 13 | 2 | ~1 week |
| Phase 6: Backend & Integration | 14-17 | 5 | ~2 weeks |
| Phase 7: BookMyRoom Build | 18-27 | 12 | 4 weeks |
| Phase 8: Deployment | 28 | 1 | 1 day |
| **Total** | **1-28** | **~32** | **~10 weeks** |

*Schedule: 3 classes per week, 1 hour per class. Some complex lessons (13, 22, 25, 26) may require 2 classes.*

# Full-Stack / MERN Stack Web Development Course

## Course Overview

This MERN Stack (MongoDB, Express, React, Node.js) course takes students from foundational React knowledge through to building and deploying a complete full-stack web application. Starting with TypeScript and React fundamentals via a Todo App, students progress to backend development with Node.js, Express, and MongoDB, before tackling a real-world Room/Venue Booking application called **BookMyRoom**. By the end, students will have built, integrated, and deployed a production-ready full-stack application with authentication, file uploads, booking management, and payment processing.

**Level**: Intermediate (HTML, CSS, and JavaScript basics required)
**Project**: BookMyRoom -- a room and venue booking platform
**Schedule**: 3 classes per week, 1 hour per class (~12 weeks total)

---

## Instructor

| | |
|---|---|
| **Name** | Er. Prabin Karki |
| **Education** | Bachelor in Computer Science and Engineering |
| **Email** | prabinkarki643@gmail.com |
| **Portfolio** | [prabin-karki.com.np](https://prabin-karki.com.np) |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React 18+ (via Vite) | Component-based UI development |
| **Language** | TypeScript | Type safety across frontend and backend |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **UI Components** | shadcn/ui | Pre-built accessible component library |
| **Form Handling** | React Hook Form + Zod | Performant forms with schema validation |
| **Data Fetching** | React Query (TanStack Query) | Server state management and caching |
| **Routing** | React Router v6 | Client-side navigation and route protection |
| **HTTP Client** | Axios | API communication |
| **Backend Runtime** | Node.js | Server-side JavaScript execution |
| **Backend Framework** | Express.js (TypeScript) | REST API development |
| **Database** | MongoDB + Mongoose | Document-based data storage and ODM |
| **File Uploads** | Multer | Multipart form data and image handling |
| **Authentication** | JWT + bcrypt | Token-based auth with password hashing |
| **Payment** | eSewa + COD | Nepali payment gateway and cash on delivery |
| **Deployment** | Render / Vercel + MongoDB Atlas | Production hosting and managed database |

---

## Setup Requirements

Before starting the course, students need the following installed on their machine:

### Required Software

| Software | Version | Windows | Mac |
|----------|---------|---------|-----|
| **Node.js** (LTS) | 20+ | Download from [nodejs.org](https://nodejs.org) and run the installer | `brew install node` or download from [nodejs.org](https://nodejs.org) |
| **npm** | 10+ | Included with Node.js | Included with Node.js |
| **Git** | 2.40+ | Download from [git-scm.com](https://git-scm.com) | `brew install git` or Xcode Command Line Tools (`xcode-select --install`) |
| **VS Code** | Latest | Download from [code.visualstudio.com](https://code.visualstudio.com) | Download from [code.visualstudio.com](https://code.visualstudio.com) |
| **MongoDB** (local) | 7+ | Download Community Server from [mongodb.com/try/download](https://www.mongodb.com/try/download/community) and install as a service | `brew tap mongodb/brew && brew install mongodb-community` then `brew services start mongodb-community` |
| **MongoDB Compass** | Latest | Download from [mongodb.com/products/compass](https://www.mongodb.com/products/tools/compass) | Download from [mongodb.com/products/compass](https://www.mongodb.com/products/tools/compass) |

### Recommended VS Code Extensions

| Extension | Purpose |
|-----------|---------|
| ES7+ React/Redux/React-Native snippets | Quick React component snippets |
| Tailwind CSS IntelliSense | Autocomplete for Tailwind classes |
| Prettier | Automatic code formatting |
| Thunder Client | API testing (like Postman, built into VS Code) |
| MongoDB for VS Code | Browse and query MongoDB from VS Code |

### Accounts Needed

| Service | Purpose | URL |
|---------|---------|-----|
| **GitHub** | Code hosting and version control | [github.com](https://github.com) |
| **MongoDB Atlas** | Cloud database (free tier) | [cloud.mongodb.com](https://cloud.mongodb.com) |
| **Vercel** | Frontend deployment (free tier) | [vercel.com](https://vercel.com) |
| **Render** | Backend deployment (free tier) | [render.com](https://render.com) |

### Verify Installation

After installing, run these commands in the terminal to verify:

```bash
node --version      # Should show v20.x.x or higher
npm --version       # Should show 10.x.x or higher
git --version       # Should show 2.x.x or higher
mongod --version    # Should show 7.x.x or higher (if installed locally)
```

---

## Phase Breakdown

### Prerequisites (Optional)

| Lesson | Topic | Description |
|--------|-------|-------------|
| 01 | HTML Basics | Document structure, elements, semantic markup |
| 02 | CSS Basics | Selectors, box model, layout, responsive design |
| 03 | JavaScript Essentials | Variables, functions, arrays, objects, DOM manipulation |

*Students comfortable with HTML, CSS, and JavaScript may skip directly to Phase 1.*

---

### Phase 1: React Fundamentals (Lessons 04--13)

**Goal**: Build a fully functional Todo App with modern React tooling.

| Lesson | Topic | Key Concepts |
|--------|-------|-------------|
| 04 | TypeScript Basics | Types, interfaces, generics, type inference |
| 05 | Node.js & Tooling | npm, package.json, scripts, Vite project setup |
| 06 | React Introduction | JSX, virtual DOM, component model, dev server |
| 07 | Components & JSX | Functional components, props, composition, lists |
| 08 | State & Props | useState, event handling, lifting state, controlled inputs |
| 09 | Context API | Global state, useContext, provider pattern, reducers |
| 10 | Tailwind CSS Setup | Installation, utility classes, responsive design, theming |
| 11 | shadcn/ui Components | Component installation, customisation, theming |
| 12 | React Hook Form & Zod | Form registration, validation schemas, error handling |
| 13 | Building the Todo App | Complete Todo application combining all Phase 1 concepts |

**Outcome**: A polished, type-safe Todo App with form validation, global state, and a professional UI.

---

### Phase 2: Backend & Integration (Lessons 14--17)

**Goal**: Build a REST API and connect it to the React frontend.

| Lesson | Topic | Key Concepts |
|--------|-------|-------------|
| 14 | Express.js Introduction | Server setup, routing, middleware, error handling |
| 15 | MongoDB & Mongoose | Document model, schemas, CRUD operations, connections |
| 16 | Building the Todo API | RESTful endpoints, request validation, Mongoose integration |
| 17 | Connecting Frontend to Backend | Axios setup, React Query, loading/error states, data sync |

**Outcome**: A full-stack Todo App with persistent data storage and proper API communication.

---

### Phase 3: BookMyRoom -- Full-Stack Build (Lessons 18--27)

**Goal**: Build a complete room/venue booking application with authentication, role-based access, file uploads, and payments.

| Lesson | Topic | Key Concepts |
|--------|-------|-------------|
| 18 | React Router v6 | Route configuration, nested routes, navigation, URL parameters |
| 19 | Project Setup & Data Models | Folder structure, Mongoose models (User, Room, Booking), seed data |
| 20 | Auth Backend | User registration, login, JWT generation, bcrypt hashing, role-based middleware |
| 21 | Auth Frontend | AuthContext, login/register forms, token storage, protected routes |
| 22 | Room CRUD Backend | Room endpoints, Multer image uploads, validation, owner authorisation |
| 23 | Owner Portal | Room management dashboard, image upload UI, edit/delete functionality |
| 24 | User Portal | Room browsing, search, filters (location, price, capacity), room detail page |
| 25 | Booking System | Date availability checking, booking creation, status flow (pending/confirmed/cancelled) |
| 26 | Payment Integration | eSewa payment gateway (simplified), cash on delivery option, payment status tracking |
| 27 | Dashboard & Polish | Statistics overview, booking history, UI refinements, error boundaries |

**Outcome**: A deployable BookMyRoom application with owner and user portals, booking management, and payment processing.

---

### Phase 4: Deployment (Lesson 28)

**Goal**: Deploy the application to production.

| Lesson | Topic | Key Concepts |
|--------|-------|-------------|
| 28 | Production Deployment | Environment variables, production builds, MongoDB Atlas setup, Render (backend) + Vercel (frontend), domain configuration |

**Outcome**: A live, publicly accessible BookMyRoom application.

---

## Quick Reference

| Lesson | Key Concepts | Tools & Libraries |
|--------|-------------|-------------------|
| 01--03 | HTML structure, CSS layout, JS fundamentals | Browser, VS Code |
| 04 | Type annotations, interfaces, generics | TypeScript |
| 05 | Package management, project scaffolding | Node.js, npm, Vite |
| 06--07 | JSX, components, props, composition | React |
| 08--09 | State management, context, reducers | React (useState, useContext) |
| 10--11 | Utility-first styling, component library | Tailwind CSS, shadcn/ui |
| 12 | Form handling, schema validation | React Hook Form, Zod |
| 13 | Application architecture, feature integration | All Phase 1 tools |
| 14 | Server routing, middleware pipeline | Express.js |
| 15 | Document database, schema design | MongoDB, Mongoose |
| 16 | REST API design, CRUD endpoints | Express.js, Mongoose |
| 17 | HTTP client, server state caching | Axios, React Query |
| 18 | Client-side routing, navigation guards | React Router v6 |
| 19 | Project architecture, data modelling | Mongoose, TypeScript |
| 20 | Authentication, authorisation, hashing | JWT, bcrypt |
| 21 | Auth state, protected routes, token management | React Context, Axios interceptors |
| 22 | File uploads, image handling | Multer, Express.js |
| 23 | CRUD UI, image upload interface | React, shadcn/ui |
| 24 | Search, filtering, pagination | React Query, URL params |
| 25 | Availability logic, status management | Mongoose, date handling |
| 26 | Payment gateway integration | eSewa API, Axios |
| 27 | Analytics, data aggregation, UX polish | Mongoose aggregation, Recharts |
| 28 | Cloud deployment, managed database | Render, Vercel, MongoDB Atlas |

---

## Data Models Overview

### User

| Field | Type | Description |
|-------|------|-------------|
| name | String | Full name of the user |
| email | String | Unique email address (used for login) |
| password | String | Hashed password (bcrypt) |
| role | String | `user` or `owner` |
| phone | String | Contact number |
| createdAt | Date | Account creation timestamp |

### Room

| Field | Type | Description |
|-------|------|-------------|
| title | String | Room or venue name |
| description | String | Detailed description |
| location | String | Address or area |
| price | Number | Price per day (NPR) |
| capacity | Number | Maximum occupancy |
| amenities | [String] | List of available amenities |
| images | [String] | Uploaded image file paths |
| owner | ObjectId | Reference to User (owner) |
| isAvailable | Boolean | Whether the room is listed |
| createdAt | Date | Listing creation timestamp |

### Booking

| Field | Type | Description |
|-------|------|-------------|
| room | ObjectId | Reference to Room |
| user | ObjectId | Reference to User (booker) |
| checkIn | Date | Booking start date |
| checkOut | Date | Booking end date |
| totalPrice | Number | Calculated total (days x price) |
| status | String | `pending`, `confirmed`, or `cancelled` |
| paymentMethod | String | `esewa` or `cod` |
| paymentStatus | String | `unpaid`, `paid`, or `refunded` |
| createdAt | Date | Booking creation timestamp |

---

## What Students Will Build

### Todo App (Phases 1--2)
- Task creation with validated input fields
- Mark tasks as complete/incomplete
- Edit and delete tasks
- Filter tasks by status (all, active, completed)
- Persistent storage via REST API and MongoDB
- Clean, responsive UI with Tailwind CSS and shadcn/ui components

### BookMyRoom Application (Phases 3--4)
- **User registration and login** with JWT authentication
- **Role-based access**: separate Owner and User experiences
- **Owner portal**: create, edit, and delete room listings with image uploads
- **User portal**: browse rooms with search, location/price/capacity filters
- **Room detail page**: image gallery, amenity list, availability calendar
- **Booking system**: select dates, check availability, create bookings
- **Payment processing**: eSewa gateway integration and cash on delivery
- **Dashboard**: booking statistics, recent activity, revenue overview
- **Responsive design**: fully functional on mobile, tablet, and desktop
- **Production deployment**: live on Render and Vercel with MongoDB Atlas

---

## Estimated Timeline

| Phase | Lessons | Classes | Weeks |
|-------|---------|---------|-------|
| Prerequisites (optional) | 01--03 | 3 | 1 week |
| Phase 1: React Fundamentals | 04--13 | 12 | 4 weeks |
| Phase 2: Backend & Integration | 14--17 | 5 | ~2 weeks |
| Phase 3: BookMyRoom Build | 18--27 | 12 | 4 weeks |
| Phase 4: Deployment | 28 | 1 | 1 day |
| **Total** | **01--28** | **~36** | **~12 weeks** |

*Schedule: 3 classes per week, 1 hour per class. Some complex lessons (13, 22, 25, 26) may require 2 classes to complete.*

# Lesson 6: React Introduction

## What You Will Learn
- What React is and why it's popular
- Component-based thinking
- Setting up a React project with the shadcn/create preset
- Understanding JSX and TSX syntax
- Running and exploring the development server

---

## 6.1 What is React?

React is a **JavaScript library for building user interfaces**. Created by Facebook (now Meta), it's the most popular frontend library in the world.

### Why React?

**The Problem:** In vanilla JavaScript, updating the page is manual and painful. You have to find elements, change their content, manage state, and keep everything in sync. For a small Todo list it's manageable, but for a complex app with hundreds of interactive elements, it becomes a nightmare.

**React's Solution:** You describe **what the UI should look like** based on your data, and React handles updating the actual page. When data changes, React efficiently updates only the parts of the page that need to change.

### Component-Based Thinking

React breaks UIs into small, reusable pieces called **components**.

Think of a Todo app as building blocks:

```
┌──────────────────────────────────────┐
│  App                                 │
│  ┌──────────────────────────────┐    │
│  │  Header                      │    │
│  │  "My Todo List"              │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │  AddTodoForm                 │    │
│  │  [input] [Add Button]        │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │  TodoList                    │    │
│  │  ┌────────────────────────┐  │    │
│  │  │  TodoItem: "Learn HTML"│  │    │
│  │  └────────────────────────┘  │    │
│  │  ┌────────────────────────┐  │    │
│  │  │  TodoItem: "Learn CSS" │  │    │
│  │  └────────────────────────┘  │    │
│  │  ┌────────────────────────┐  │    │
│  │  │  TodoItem: "Learn JS"  │  │    │
│  │  └────────────────────────┘  │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │  Footer                      │    │
│  │  "3 tasks | 1 completed"     │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

Each box is a **component** - a self-contained piece that manages its own content. Components can be reused (like `TodoItem` appears 3 times with different data).

---

## 6.2 Setting Up a React Project

There are two ways to set up a React project with our full stack. Let's learn both.

> **Reference**: Official shadcn/ui Vite installation guide — [ui.shadcn.com/docs/installation/vite](https://ui.shadcn.com/docs/installation/vite)

### Method 1: Vite First, Then Add shadcn/ui (Recommended for Learning)

This approach teaches you the steps individually — you create a React project with Vite first, then add shadcn/ui on top. This is the approach we will use in class so you understand each layer.

**Step 1: Create a Vite + React + TypeScript project**

```bash
npm create vite@latest todo-app -- --template react-ts
cd todo-app
npm install
```

This gives you a clean React + TypeScript project with Vite. You can run `npm run dev` to see it working.

**Step 2: Add Tailwind CSS**

```bash
npm install tailwindcss @tailwindcss/vite
```

Update `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```

Replace the content of `src/index.css` with:

```css
@import "tailwindcss";
```

**Step 3: Add shadcn/ui**

Now add shadcn/ui to the project:

```bash
npx shadcn@latest init
```

It will ask you some questions:

```
Would you like to use TypeScript? Yes
Which style would you like to use? New York
Which color would you like to use as base color? Slate
Where is your global CSS file? src/index.css
Would you like to use CSS variables for colors? Yes
```

This configures shadcn/ui and creates:
- `components.json` — shadcn/ui configuration
- `src/lib/utils.ts` — utility functions (like `cn()` for merging class names)
- Updates to `src/index.css` with CSS variables for theming

Now you can add components as needed:

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
```

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

---

### Method 2: shadcn/create Preset (All-in-One)

If you want everything set up in a single command, use the **shadcn preset** approach.

**Step 1: Build Your Preset Visually**

1. Go to [https://ui.shadcn.com/create](https://ui.shadcn.com/create) in your browser
2. Choose your preferences:
   - **Style** — pick a visual style (e.g. Default or New York)
   - **Colours** — choose a colour theme
   - **Fonts** — pick your preferred font
   - **Icons** — choose an icon library
3. Click **"Create Project"**
4. The site gives you a command with a unique preset code

**Step 2: Run the Command**

```bash
npx shadcn@latest init --preset <YOUR_PRESET_CODE> --template vite
```

Replace `<YOUR_PRESET_CODE>` with the actual code from the shadcn/create website.

> **What does this single command set up?**
> - **Vite** — the fast build tool and dev server
> - **React** — the UI library
> - **TypeScript** — type-safe JavaScript
> - **Tailwind CSS** — utility-first CSS framework
> - **shadcn/ui** — pre-configured with your chosen theme

Then:

```bash
cd todo-app
npm install
npm run dev
```

---

### Which Method Should I Use?

| | Method 1 (Vite + shadcn) | Method 2 (shadcn/create) |
|--|--------------------------|--------------------------|
| **Best for** | Learning, understanding each layer | Quick project setup |
| **Control** | Full control over every step | Preset chooses defaults |
| **Understanding** | You learn Vite, Tailwind, shadcn separately | Everything arrives pre-configured |
| **In this course** | We use this in class | Great for future projects |

Both methods give you the same result — a React + TypeScript + Tailwind + shadcn/ui project. The difference is whether you set up each piece yourself or let the preset do it.

Open `http://localhost:5173` in your browser. You will see the welcome page.

---

## 6.3 Project Structure

```
todo-app/
├── node_modules/          # Installed packages
├── public/                # Static assets
│   └── vite.svg           # Vite logo
├── src/                   # YOUR CODE GOES HERE
│   ├── assets/            # Images, icons
│   ├── components/        # Your components
│   │   └── ui/            # shadcn/ui components (pre-configured)
│   ├── lib/               # Utility functions
│   │   └── utils.ts       # Tailwind merge helper
│   ├── App.tsx            # Main App component
│   ├── main.tsx           # Entry point - renders App
│   └── index.css          # Global styles (Tailwind is already here)
├── .gitignore
├── components.json        # shadcn/ui configuration
├── index.html             # The single HTML page
├── package.json           # Dependencies and scripts
├── tailwind.config.ts     # Tailwind CSS settings
├── tsconfig.json          # TypeScript settings
└── vite.config.ts         # Vite settings
```

Notice the file extensions: `.tsx` for React components (TypeScript + JSX) and `.ts` for plain TypeScript files. This is different from plain JavaScript where you would see `.jsx` and `.js`.

### The Important Files

**`index.html`** - The only HTML file. Contains a `<div id="root">` where React renders everything:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Vite + React + TS</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

**`src/main.tsx`** - The entry point. It mounts React into the `#root` div:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

Notice the `!` after `getElementById('root')`. This is TypeScript syntax that tells the compiler "I know this element exists, trust me." Without it, TypeScript would warn that the element might be `null`.

**`src/App.tsx`** - The main component. This is where you start building:

```tsx
function App() {
  return (
    <div>
      <h1>Hello React!</h1>
    </div>
  )
}

export default App
```

**`src/index.css`** - Already includes Tailwind CSS directives. You do not need to configure Tailwind separately - it is ready to use:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**`components.json`** - The shadcn/ui configuration file. This stores your chosen style, colours, and component settings. You rarely need to edit this directly.

---

## 6.4 Understanding JSX (and TSX)

JSX looks like HTML but it's actually JavaScript. React uses JSX to describe what the UI should look like. When you write it in a `.tsx` file, it's called **TSX** - the same thing but with TypeScript's type checking.

### JSX Rules

**1. Return a single parent element:**

```tsx
// WRONG - two root elements
function App() {
  return (
    <h1>Title</h1>
    <p>Paragraph</p>
  )
}

// CORRECT - wrapped in a single parent
function App() {
  return (
    <div>
      <h1>Title</h1>
      <p>Paragraph</p>
    </div>
  )
}

// ALSO CORRECT - use a Fragment (empty tags) to avoid extra divs
function App() {
  return (
    <>
      <h1>Title</h1>
      <p>Paragraph</p>
    </>
  )
}
```

**2. Use `className` instead of `class`:**

```tsx
// HTML
<div class="container">

// TSX (and JSX)
<div className="container">
```

With Tailwind CSS already set up, you can use utility classes straight away:

```tsx
<div className="max-w-2xl mx-auto p-4">
```

**3. Close all tags (including self-closing ones):**

```tsx
// HTML allows
<img src="photo.jpg">
<br>
<input type="text">

// TSX requires closing
<img src="photo.jpg" />
<br />
<input type="text" />
```

**4. Use `{}` for JavaScript expressions:**

```tsx
function App() {
  const name: string = "Student";
  const taskCount: number = 5;
  const isLoggedIn: boolean = true;

  return (
    <div>
      <h1>Hello, {name}!</h1>
      <p>You have {taskCount} tasks.</p>
      <p>Status: {isLoggedIn ? "Logged in" : "Logged out"}</p>
      <p>Today is {new Date().toLocaleDateString()}</p>
    </div>
  )
}
```

The curly braces `{}` let you embed any JavaScript expression inside TSX. The type annotations (`: string`, `: number`, `: boolean`) are TypeScript - they tell the compiler what type each variable should be.

---

## 6.5 Your First Custom Component

Let's replace the default content with our own.

**Replace the content of `src/App.tsx`:**

```tsx
function App() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-6">My Todo App</h1>
      <p className="text-lg text-muted-foreground">
        Welcome to our React Todo application!
      </p>
      <p className="text-lg text-muted-foreground">
        We will build this step by step.
      </p>
    </div>
  )
}

export default App
```

Because Tailwind CSS and shadcn/ui are already configured, we can use utility classes like `max-w-2xl`, `text-3xl`, and `font-bold` directly. The `text-muted-foreground` class comes from the shadcn theme you chose - it automatically uses the correct colour for secondary text.

**No need to write custom CSS.** No need to create separate stylesheet files. Tailwind handles it all through these utility classes.

Save and check the browser - it updates instantly.

---

## 6.6 How React Renders

When React runs:

1. `main.tsx` tells React to render the `<App />` component into the `#root` div
2. React calls the `App` function, which returns TSX
3. React converts the TSX into actual HTML elements and puts them on the page
4. When data changes, React re-runs the function and efficiently updates only what changed

**This is the key idea:** Your components are **functions that return UI**. When data changes, the function runs again and React updates the page.

```
Data changes → Component function runs → TSX returned → React updates the DOM
```

---

## Practice Exercises

### Exercise 1: Hello World
1. Set up a new project using the shadcn preset (visit [ui.shadcn.com/create](https://ui.shadcn.com/create) to build your command)
2. Replace the default content with your own welcome page
3. Display your name, today's date (using JavaScript), and a short bio
4. Use Tailwind utility classes for styling

### Exercise 2: Variable Display
Create an App component in `src/App.tsx` that:
1. Defines typed variables for: `appName: string`, `version: string`, `taskCount: number`, `isOnline: boolean`
2. Displays all of them in the TSX using `{}`
3. Shows "Online" or "Offline" using a ternary operator based on `isOnline`
4. Styles the online/offline text with different Tailwind colours (e.g. `text-green-500` and `text-red-500`)

### Exercise 3: Multiple Sections
Create an App component with:
1. A header section with the app name styled with `text-3xl font-bold`
2. A main section with a welcome message
3. A footer section with copyright text styled with `text-sm text-muted-foreground`
4. Use semantic HTML elements inside your TSX (`<header>`, `<main>`, `<footer>`)

---

## Key Takeaways
1. React builds UIs from **reusable components** - functions that return TSX
2. **TSX** looks like HTML but is TypeScript - use `className`, close all tags, wrap in one parent
3. Use `{}` in TSX to embed **JavaScript expressions**
4. The **shadcn preset** sets up Vite + React + TypeScript + Tailwind + shadcn/ui in one command
5. **Tailwind CSS** is pre-configured - style with utility classes directly in your TSX
6. All your code goes in the `src/` folder
7. `main.tsx` is the entry point, `App.tsx` is your main component
8. React efficiently updates only the parts of the page that change
9. TypeScript catches errors before your code runs - use `.tsx` for components and `.ts` for utilities

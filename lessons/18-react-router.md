# Lesson 18: React Router

## What You Will Learn
- Why multi-page navigation is essential for real applications
- Installing and setting up React Router v6
- Creating page components and defining routes
- Using Link and NavLink for navigation with active styling
- Route parameters and the `useParams()` hook
- Nested routes with `<Outlet />` and the layout pattern
- Programmatic navigation with `useNavigate()`
- Handling 404 pages with a catch-all route

---

## 18.1 Why Do We Need Routing?

Our Todo app was a **single-page application** -- everything lived on one screen. But real-world applications have multiple pages:

- A **Home** page
- An **About** page
- A **Login** and **Register** page
- A **Dashboard** that only logged-in users can see
- Individual item pages like `/rooms/42`

Without routing, you would need to show and hide components manually using state -- messy, hard to maintain, and the browser's back button would not work.

**React Router** solves this by:
1. Mapping URLs to components (e.g. `/about` shows the About page)
2. Letting users navigate without a full page reload
3. Making the browser's back/forward buttons work correctly
4. Supporting URL parameters like `/rooms/42`

Think of it like a receptionist in a building. When someone asks for "Room 42", the receptionist directs them to the right floor and door. React Router does the same thing for your application -- it looks at the URL and shows the correct component.

---

## 18.2 Installing React Router

In your Vite + React project, install React Router:

```bash
npm install react-router-dom
```

This gives you all the components and hooks you need for client-side routing.

---

## 18.3 Setting Up BrowserRouter

The first step is wrapping your entire application in a `BrowserRouter`. This component provides routing context to every component in your app.

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**What `BrowserRouter` does:** It listens to the browser's URL and tells React Router which route is currently active. Without it, none of the routing components will work.

---

## 18.4 Creating Page Components

Before defining routes, you need the pages they will point to. Create a `pages/` folder:

```
src/
├── pages/
│   ├── HomePage.tsx
│   ├── AboutPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   └── NotFoundPage.tsx
├── components/
├── App.tsx
└── main.tsx
```

### HomePage

```tsx
// src/pages/HomePage.tsx

function HomePage(): JSX.Element {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold mb-4">Welcome to BookMyRoom</h1>
      <p className="text-muted-foreground text-lg">
        Find and book the perfect room for your next event.
      </p>
    </div>
  );
}

export default HomePage;
```

### AboutPage

```tsx
// src/pages/AboutPage.tsx

function AboutPage(): JSX.Element {
  return (
    <div className="max-w-2xl mx-auto py-16">
      <h1 className="text-3xl font-bold mb-4">About BookMyRoom</h1>
      <p className="text-muted-foreground">
        BookMyRoom is a platform that connects room owners with people
        who need spaces for meetings, events, and gatherings.
      </p>
    </div>
  );
}

export default AboutPage;
```

### LoginPage

```tsx
// src/pages/LoginPage.tsx

function LoginPage(): JSX.Element {
  return (
    <div className="max-w-md mx-auto py-16">
      <h1 className="text-3xl font-bold mb-4">Login</h1>
      <p className="text-muted-foreground">Login form will go here.</p>
    </div>
  );
}

export default LoginPage;
```

### RegisterPage

```tsx
// src/pages/RegisterPage.tsx

function RegisterPage(): JSX.Element {
  return (
    <div className="max-w-md mx-auto py-16">
      <h1 className="text-3xl font-bold mb-4">Create Account</h1>
      <p className="text-muted-foreground">Registration form will go here.</p>
    </div>
  );
}

export default RegisterPage;
```

### NotFoundPage

```tsx
// src/pages/NotFoundPage.tsx
import { Link } from "react-router-dom";

function NotFoundPage(): JSX.Element {
  return (
    <div className="text-center py-16">
      <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
      <p className="text-xl mb-8">Page not found</p>
      <Link
        to="/"
        className="text-primary underline hover:no-underline"
      >
        Go back home
      </Link>
    </div>
  );
}

export default NotFoundPage;
```

---

## 18.5 Defining Routes

Now connect URLs to pages using `Routes` and `Route`:

```tsx
// src/App.tsx
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NotFoundPage from "./pages/NotFoundPage";

function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
```

### How It Works

| URL in Browser | Component Shown |
|----------------|-----------------|
| `/` | `<HomePage />` |
| `/about` | `<AboutPage />` |
| `/login` | `<LoginPage />` |
| `/register` | `<RegisterPage />` |
| `/anything-else` | `<NotFoundPage />` |

The `path="*"` is a **catch-all route**. It matches any URL that does not match the routes above it. This is how you create a 404 page.

---

## 18.6 Navigation with Link and NavLink

### The Problem with `<a>` Tags

In a normal HTML website, clicking an `<a href="/about">` tag causes a **full page reload**. The browser fetches the entire page from the server again. In a React app, this destroys all your component state and is slow.

### Link -- Basic Navigation

React Router's `<Link>` component navigates **without a page reload**:

```tsx
import { Link } from "react-router-dom";

function Navbar(): JSX.Element {
  return (
    <nav className="flex gap-4 p-4 border-b">
      <Link to="/" className="hover:text-primary">
        Home
      </Link>
      <Link to="/about" className="hover:text-primary">
        About
      </Link>
      <Link to="/login" className="hover:text-primary">
        Login
      </Link>
    </nav>
  );
}
```

**Rule of thumb:** Always use `<Link>` instead of `<a>` for internal navigation within your React app. Use `<a>` only for external links (other websites).

### NavLink -- Navigation with Active Styling

`NavLink` is like `Link`, but it knows when it is **active** (when the current URL matches its `to` prop). This lets you style the active page differently:

```tsx
import { NavLink } from "react-router-dom";

function Navbar(): JSX.Element {
  return (
    <nav className="flex gap-4 p-4 border-b">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          isActive
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-primary"
        }
      >
        Home
      </NavLink>
      <NavLink
        to="/about"
        className={({ isActive }) =>
          isActive
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-primary"
        }
      >
        About
      </NavLink>
      <NavLink
        to="/login"
        className={({ isActive }) =>
          isActive
            ? "text-primary font-bold"
            : "text-muted-foreground hover:text-primary"
        }
      >
        Login
      </NavLink>
    </nav>
  );
}

export default Navbar;
```

**The `end` prop on the Home NavLink:** Without `end`, the `/` route would match `/about`, `/login`, and every other route (because they all start with `/`). Adding `end` means it only matches exactly `/`.

**How `className` works with NavLink:** Instead of a plain string, you pass a **function** that receives `{ isActive }`. This boolean tells you whether the link matches the current URL, so you can return different class names.

---

## 18.7 Route Parameters with useParams

Sometimes you need dynamic URLs. For example, `/rooms/42` should show room number 42, and `/rooms/99` should show room number 99. You do not create a separate route for every room -- you use a **route parameter**.

### Defining a Route with a Parameter

```tsx
// In App.tsx
<Route path="/rooms/:id" element={<RoomDetailPage />} />
```

The `:id` part is the parameter. It matches any value:
- `/rooms/1` -- `id` is `"1"`
- `/rooms/42` -- `id` is `"42"`
- `/rooms/my-room` -- `id` is `"my-room"`

### Reading the Parameter with useParams

```tsx
// src/pages/RoomDetailPage.tsx
import { useParams } from "react-router-dom";

function RoomDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="max-w-2xl mx-auto py-16">
      <h1 className="text-3xl font-bold mb-4">Room Details</h1>
      <p className="text-muted-foreground">
        Showing details for room ID: <strong>{id}</strong>
      </p>
      {/* Later, you would fetch room data using this ID */}
    </div>
  );
}

export default RoomDetailPage;
```

**TypeScript note:** `useParams()` returns an object where every value is `string | undefined`. By passing the generic `<{ id: string }>`, you tell TypeScript which parameters to expect. The value is always a string -- if you need a number, convert it: `const roomId: number = Number(id);`

### Linking to Dynamic Routes

```tsx
// Somewhere in your room listing
import { Link } from "react-router-dom";

interface Room {
  id: number;
  title: string;
}

function RoomCard({ room }: { room: Room }): JSX.Element {
  return (
    <Link to={`/rooms/${room.id}`} className="block p-4 border rounded hover:shadow">
      <h3 className="font-bold">{room.title}</h3>
    </Link>
  );
}
```

---

## 18.8 Nested Routes and the Layout Pattern

Most applications have a consistent layout: a navbar at the top, content in the middle, and a footer at the bottom. Only the content changes when you navigate. This is the **layout pattern** using **nested routes**.

### Creating a Layout Component

```tsx
// src/layouts/MainLayout.tsx
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

function MainLayout(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4">
        <Outlet />
      </main>
      <footer className="border-t p-4 text-center text-muted-foreground text-sm">
        &copy; 2026 BookMyRoom. All rights reserved.
      </footer>
    </div>
  );
}

export default MainLayout;
```

**What is `<Outlet />`?** It is a placeholder that says "render the child route's component here". Think of it as a slot -- whatever page matches the current URL gets inserted where `<Outlet />` is.

### Setting Up Nested Routes

```tsx
// src/App.tsx
import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RoomDetailPage from "./pages/RoomDetailPage";
import NotFoundPage from "./pages/NotFoundPage";

function App(): JSX.Element {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/rooms/:id" element={<RoomDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
```

**How it works:**

1. The outer `<Route element={<MainLayout />}>` has no `path` -- it always renders
2. `MainLayout` renders the `Navbar`, `<Outlet />`, and `Footer`
3. The child routes render inside `<Outlet />`
4. When you navigate from `/` to `/about`, only the content inside `<Outlet />` changes -- the Navbar and Footer stay put

```
┌─────────────────────────────┐
│         Navbar              │  ← Always visible
├─────────────────────────────┤
│                             │
│       <Outlet />            │  ← Changes based on URL
│   (HomePage / AboutPage)    │
│                             │
├─────────────────────────────┤
│         Footer              │  ← Always visible
└─────────────────────────────┘
```

---

## 18.9 Programmatic Navigation with useNavigate

Sometimes you need to navigate in response to an action -- after submitting a form, after logging in, or when a button is clicked. You cannot use `<Link>` for this because you need to navigate from JavaScript code, not from a clickable element in JSX.

```tsx
import { useNavigate } from "react-router-dom";

function LoginPage(): JSX.Element {
  const navigate = useNavigate();

  const handleLogin = (): void => {
    // After successful login...
    console.log("Login successful!");

    // Redirect to the home page
    navigate("/");
  };

  const handleGoBack = (): void => {
    // Go back to the previous page (like pressing the back button)
    navigate(-1);
  };

  return (
    <div className="max-w-md mx-auto py-16">
      <h1 className="text-3xl font-bold mb-4">Login</h1>
      <button
        onClick={handleLogin}
        className="px-4 py-2 bg-primary text-primary-foreground rounded"
      >
        Login
      </button>
      <button
        onClick={handleGoBack}
        className="px-4 py-2 ml-2 border rounded"
      >
        Go Back
      </button>
    </div>
  );
}

export default LoginPage;
```

### Common useNavigate Patterns

```tsx
const navigate = useNavigate();

// Navigate to a specific page
navigate("/dashboard");

// Navigate with replace (cannot go back to the current page)
navigate("/dashboard", { replace: true });

// Go back one page
navigate(-1);

// Go forward one page
navigate(1);
```

**When to use `replace: true`:** After a login redirect, you usually do not want the user to press "back" and see the login page again. Using `replace: true` removes the login page from the browser history.

---

## 18.10 Putting It All Together

Here is the complete project structure with routing:

```
src/
├── components/
│   └── Navbar.tsx            # NavLink navigation
├── layouts/
│   └── MainLayout.tsx        # Navbar + Outlet + Footer
├── pages/
│   ├── HomePage.tsx
│   ├── AboutPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── RoomDetailPage.tsx
│   └── NotFoundPage.tsx
├── App.tsx                   # Route definitions
├── main.tsx                  # BrowserRouter wrapper
└── index.css
```

### Complete App.tsx with All Routes

```tsx
// src/App.tsx
import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RoomDetailPage from "./pages/RoomDetailPage";
import NotFoundPage from "./pages/NotFoundPage";

function App(): JSX.Element {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/rooms/:id" element={<RoomDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
```

### Complete Navbar with Active Styling

```tsx
// src/components/Navbar.tsx
import { NavLink } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About" },
  { to: "/login", label: "Login" },
  { to: "/register", label: "Register" },
];

function Navbar(): JSX.Element {
  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <NavLink to="/" className="text-xl font-bold text-primary">
          BookMyRoom
        </NavLink>
        <div className="flex gap-4">
          {navItems.map((item: NavItem) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground transition-colors"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
```

### Complete MainLayout

```tsx
// src/layouts/MainLayout.tsx
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

function MainLayout(): JSX.Element {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 flex-1">
        <Outlet />
      </main>
      <footer className="border-t p-4 text-center text-muted-foreground text-sm">
        &copy; 2026 BookMyRoom. All rights reserved.
      </footer>
    </div>
  );
}

export default MainLayout;
```

---

## Practice Exercises

### Exercise 1: Build the Multi-Page Shell
1. Install React Router: `npm install react-router-dom`
2. Create the five page components: Home, About, Login, Register, NotFound
3. Set up `BrowserRouter` in `main.tsx`
4. Define all routes in `App.tsx`
5. Create a `Navbar` with `NavLink` components
6. Create a `MainLayout` with `<Outlet />`
7. Test navigation -- click each link and verify the correct page shows
8. Test the 404 page -- type a random URL like `/xyz` in the browser

### Exercise 2: Add Route Parameters
1. Create a `RoomDetailPage` component
2. Add a route: `<Route path="/rooms/:id" element={<RoomDetailPage />} />`
3. Use `useParams()` to read the `id` from the URL
4. Create a simple room listing page with `Link` components pointing to `/rooms/1`, `/rooms/2`, `/rooms/3`
5. Click each link and verify the correct ID is displayed

### Exercise 3: Programmatic Navigation
1. Add a "Get Started" button on the Home page
2. Use `useNavigate()` to redirect to `/register` when clicked
3. Add a "Go Back" button on the NotFound page that uses `navigate(-1)`
4. On the Login page, simulate a login and redirect to `/` with `replace: true`

### Exercise 4: Multiple Layouts
1. Create a second layout called `AuthLayout` -- no navbar, just a centred card
2. Move the Login and Register routes under this new layout
3. Verify that Login and Register pages use the clean auth layout
4. Verify that Home and About still use the main layout with the navbar

---

## Key Takeaways
1. **React Router** maps URLs to components without full page reloads
2. **`BrowserRouter`** must wrap your entire application in `main.tsx`
3. **`Routes` and `Route`** define which component shows for each URL path
4. **`Link`** replaces `<a>` tags for internal navigation -- no page reload
5. **`NavLink`** extends `Link` with an `isActive` boolean for styling the current page
6. **Route parameters** (`:id`) create dynamic URLs, read with `useParams()`
7. **Nested routes** with `<Outlet />` enable the layout pattern -- shared Navbar and Footer with changing content
8. **`useNavigate()`** allows programmatic navigation from event handlers and effects
9. **`path="*"`** creates a catch-all 404 route for unmatched URLs
10. **`replace: true`** prevents users from navigating back to pages like login after redirecting

# Lesson 10: Using Tailwind CSS

## What You Will Learn
- What Tailwind CSS is and why it's popular
- How Tailwind was already set up during project creation in Lesson 6
- Essential utility classes for spacing, colours, typography, and layout
- Flexbox and Grid with Tailwind
- Responsive design with breakpoints
- Dark mode basics
- Hover and focus states

---

## 10.1 What is Tailwind CSS?

Tailwind CSS is a **utility-first CSS framework**. Instead of writing custom CSS classes, you apply pre-built utility classes directly to your HTML/TSX.

### Traditional CSS vs Tailwind

**Traditional approach:**
```css
/* styles.css */
.card {
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
```
```tsx
<div className="card">Content</div>
```

**Tailwind approach:**
```tsx
<div className="bg-white rounded-lg p-4 shadow-sm">Content</div>
```

No separate CSS file needed. Each class does one thing:
- `bg-white` → white background
- `rounded-lg` → border-radius
- `p-4` → padding (16px)
- `shadow-sm` → subtle shadow

### Why Tailwind?

1. **No naming** - no more inventing class names like `.card-wrapper-inner`
2. **No CSS files** to manage - styles live right in your TSX
3. **Consistent** - uses a design system (spacing scale, colour palette)
4. **Small bundle** - only includes classes you actually use
5. **Industry standard** - used by most modern React projects

---

## 10.2 Tailwind Is Already Set Up

When we created our project in Lesson 6 using the shadcn/ui preset:

```bash
npx shadcn@latest init --preset [CODE] --template vite
```

Tailwind CSS was **automatically installed and configured** for us. This means:

- The `tailwindcss` package and Vite plugin are already in your `package.json`
- Your `vite.config.ts` already includes the Tailwind plugin
- Your `src/index.css` already imports Tailwind

**You don't need to install or configure anything.** Tailwind is ready to use right now. The rest of this lesson focuses on learning the utility classes you'll use every day.

---

## 10.3 Spacing (Padding and Margin)

Tailwind uses a numeric scale where **1 unit = 4px** (0.25rem).

### Padding

```tsx
<div className="p-4">      {/* padding: 16px all sides */}
<div className="px-4">     {/* padding-left + padding-right: 16px */}
<div className="py-2">     {/* padding-top + padding-bottom: 8px */}
<div className="pt-6">     {/* padding-top: 24px */}
<div className="pb-2">     {/* padding-bottom: 8px */}
<div className="pl-4">     {/* padding-left: 16px */}
<div className="pr-4">     {/* padding-right: 16px */}
```

### Margin

Same pattern with `m` instead of `p`:

```tsx
<div className="m-4">      {/* margin: 16px all sides */}
<div className="mx-auto">  {/* margin-left + margin-right: auto (centres block) */}
<div className="mt-8">     {/* margin-top: 32px */}
<div className="mb-4">     {/* margin-bottom: 16px */}
```

### Common Sizes

| Class | Size |
|-------|------|
| `0` | 0px |
| `1` | 4px |
| `2` | 8px |
| `3` | 12px |
| `4` | 16px |
| `6` | 24px |
| `8` | 32px |
| `10` | 40px |
| `12` | 48px |
| `16` | 64px |
| `20` | 80px |

### Gap (for Flex/Grid)

```tsx
<div className="flex gap-4">  {/* 16px gap between flex children */}
<div className="flex gap-2">  {/* 8px gap */}
```

---

## 10.4 Colours

Tailwind has a complete colour palette. Each colour has shades from 50 (lightest) to 950 (darkest).

### Text Colour

```tsx
<p className="text-gray-900">   {/* almost black */}
<p className="text-gray-500">   {/* medium grey */}
<p className="text-blue-600">   {/* blue */}
<p className="text-red-500">    {/* red */}
<p className="text-green-600">  {/* green */}
<p className="text-white">      {/* white */}
```

### Background Colour

```tsx
<div className="bg-white">       {/* white */}
<div className="bg-gray-50">     {/* very light grey */}
<div className="bg-gray-100">    {/* light grey */}
<div className="bg-blue-500">    {/* blue */}
<div className="bg-red-50">      {/* very light red */}
```

### Border Colour

```tsx
<div className="border border-gray-200">    {/* light grey border */}
<div className="border border-blue-500">    {/* blue border */}
```

### Common Colour Names
`slate`, `gray`, `zinc`, `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`

---

## 10.5 Typography

```tsx
{/* Font size */}
<p className="text-xs">      {/* 12px */}
<p className="text-sm">      {/* 14px */}
<p className="text-base">    {/* 16px (default) */}
<p className="text-lg">      {/* 18px */}
<p className="text-xl">      {/* 20px */}
<p className="text-2xl">     {/* 24px */}
<p className="text-3xl">     {/* 30px */}

{/* Font weight */}
<p className="font-normal">   {/* 400 */}
<p className="font-medium">   {/* 500 */}
<p className="font-semibold"> {/* 600 */}
<p className="font-bold">     {/* 700 */}

{/* Text alignment */}
<p className="text-left">
<p className="text-center">
<p className="text-right">

{/* Line through (for completed tasks!) */}
<span className="line-through text-gray-400">Completed task</span>
```

---

## 10.6 Layout with Flexbox

```tsx
{/* Basic flex row */}
<div className="flex">

{/* Flex column */}
<div className="flex flex-col">

{/* Centre items */}
<div className="flex items-center justify-center">

{/* Space between items */}
<div className="flex items-center justify-between">

{/* Flex child takes remaining space */}
<span className="flex-1">This takes up remaining space</span>

{/* Flex wrap */}
<div className="flex flex-wrap gap-2">
```

### Practical Example: Todo Item

```tsx
<li className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
  <input type="checkbox" className="h-5 w-5" />
  <span className="flex-1 text-gray-800">Learn Tailwind CSS</span>
  <button className="text-sm text-red-500 hover:text-red-700">
    Delete
  </button>
</li>
```

---

## 10.7 Borders and Shadows

```tsx
{/* Borders */}
<div className="border">                    {/* 1px solid border */}
<div className="border-2">                  {/* 2px border */}
<div className="border border-gray-200">    {/* grey border */}
<div className="border-b border-gray-100">  {/* bottom border only */}

{/* Border radius */}
<div className="rounded">       {/* small rounding */}
<div className="rounded-md">    {/* medium rounding */}
<div className="rounded-lg">    {/* large rounding */}
<div className="rounded-xl">    {/* extra large */}
<div className="rounded-full">  {/* circle/pill shape */}

{/* Shadows */}
<div className="shadow-sm">     {/* subtle */}
<div className="shadow">        {/* normal */}
<div className="shadow-md">     {/* medium */}
<div className="shadow-lg">     {/* large */}
```

---

## 10.8 Width, Height, and Sizing

```tsx
{/* Width */}
<div className="w-full">       {/* 100% width */}
<div className="w-1/2">        {/* 50% width */}
<div className="w-64">         {/* 256px */}
<div className="max-w-md">     {/* max-width: 28rem */}
<div className="max-w-lg">     {/* max-width: 32rem */}
<div className="max-w-2xl">    {/* max-width: 42rem */}

{/* Height */}
<div className="h-10">         {/* 40px */}
<div className="h-screen">     {/* 100vh */}
<div className="min-h-screen">  {/* min-height: 100vh */}
```

---

## 10.9 Hover and Focus States

Tailwind uses prefixes for interactive states:

```tsx
{/* Hover */}
<button className="bg-blue-500 hover:bg-blue-600 text-white">
  Hover me
</button>

{/* Focus */}
<input className="border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none" />

{/* Active (while clicking) */}
<button className="bg-blue-500 active:bg-blue-700">

{/* Transition for smooth effects */}
<button className="bg-blue-500 hover:bg-blue-600 transition-colors">
```

---

## 10.10 Responsive Design

Tailwind uses a **mobile-first** approach. Breakpoint prefixes apply at that size **and above**.

| Prefix | Min Width | Device |
|--------|-----------|--------|
| (none) | 0px | Mobile (default) |
| `sm:` | 640px | Small tablet |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Laptop |
| `xl:` | 1280px | Desktop |

```tsx
{/* Stack on mobile, row on tablet+ */}
<div className="flex flex-col md:flex-row gap-4">

{/* Smaller text on mobile, larger on desktop */}
<h1 className="text-2xl md:text-3xl lg:text-4xl">

{/* Full width on mobile, constrained on desktop */}
<main className="w-full md:max-w-2xl md:mx-auto px-4">

{/* Hide on mobile, show on desktop */}
<div className="hidden md:block">Desktop only</div>

{/* Show on mobile, hide on desktop */}
<div className="block md:hidden">Mobile only</div>
```

---

## 10.11 Dark Mode

```tsx
{/* Dark mode variants */}
<div className="bg-white dark:bg-gray-900">
<p className="text-gray-800 dark:text-gray-200">
<div className="border-gray-200 dark:border-gray-700">
```

To enable dark mode based on system preference, Tailwind handles this automatically. The `dark:` prefix applies when the user's OS is in dark mode.

---

## 10.12 Styling Our Todo App with Tailwind

```tsx
// src/App.tsx
function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Header />
        <AddTodoForm />
        <FilterButtons />
        <TodoList />
      </div>
    </div>
  );
}
```

```tsx
// src/components/Header.tsx
function Header() {
  const { tasks, completedCount } = useTodo();

  return (
    <header className="text-center mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        My Todo App
      </h1>
      <p className="text-gray-500">
        {tasks.length} tasks | {completedCount} completed
      </p>
    </header>
  );
}
```

```tsx
// src/components/TodoItem.tsx
interface Task {
  id: number;
  title: string;
  completed: boolean;
}

interface TodoItemProps {
  task: Task;
}

function TodoItem({ task }: TodoItemProps) {
  const { toggleTask, deleteTask } = useTodo();

  return (
    <li className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => toggleTask(task.id)}
        className="h-5 w-5 rounded border-gray-300"
      />
      <span className={`flex-1 ${task.completed ? "line-through text-gray-400" : "text-gray-800"}`}>
        {task.title}
      </span>
      <button
        onClick={() => deleteTask(task.id)}
        className="text-sm text-red-500 hover:text-red-700 transition-colors"
      >
        Delete
      </button>
    </li>
  );
}
```

---

## Practice Exercises

### Exercise 1: Tailwind Card
Create a card component using only Tailwind classes:
- White background, rounded corners, shadow
- A title in bold, a description in grey
- A blue "Read More" button with hover effect

### Exercise 2: Restyle the Todo App
Replace all custom CSS in the Todo app with Tailwind classes. Make it look professional with:
- Clean spacing and typography
- Hover effects on interactive elements
- Proper colour scheme

### Exercise 3: Responsive Layout
Make the Todo app responsive:
- Full width on mobile with padding
- Centred with max-width on tablet and above
- Larger headings on desktop

---

## Key Takeaways
1. Tailwind was **already installed** when we created the project with shadcn/ui in Lesson 6
2. Tailwind applies **utility classes directly** in TSX - no separate CSS files
3. Spacing scale: `p-4` = 16px, `m-2` = 8px (1 unit = 4px)
4. Colours have shades: `text-gray-500`, `bg-blue-600`
5. Use `flex`, `items-center`, `justify-between`, `gap-4` for layout
6. Hover/focus states use prefixes: `hover:bg-blue-600`, `focus:ring-2`
7. Responsive: mobile-first with `md:`, `lg:` breakpoint prefixes
8. Dark mode: `dark:bg-gray-900`, `dark:text-white`

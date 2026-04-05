# Lesson 2: CSS Basics

## What You Will Learn
- What CSS is and how to connect it to HTML
- CSS selectors: element, class, and ID
- The box model (margin, padding, border)
- Flexbox for layout
- Responsive design with media queries
- Styling text, colours, and backgrounds

---

## 2.1 What is CSS?

CSS stands for **Cascading Style Sheets**. If HTML is the skeleton, CSS is the skin and clothing. It controls how your page **looks** - colours, spacing, layout, fonts, and more.

**Three ways to add CSS:**

### 1. External Stylesheet (Recommended)
Create a separate file called `style.css` and link it in your HTML:

```html
<!-- In your HTML <head> -->
<link rel="stylesheet" href="style.css">
```

```css
/* In style.css */
h1 {
    color: blue;
}
```

### 2. Internal Style (Inside HTML)
```html
<head>
    <style>
        h1 {
            color: blue;
        }
    </style>
</head>
```

### 3. Inline Style (Directly on element)
```html
<h1 style="color: blue;">Hello</h1>
```

**Always use external stylesheets** - they keep your code organised and reusable.

---

## 2.2 CSS Selectors

Selectors tell CSS **which elements** to style.

### Element Selector
Targets all elements of that type:

```css
p {
    color: grey;
    font-size: 16px;
}

h1 {
    color: darkblue;
}
```

### Class Selector
Targets elements with a specific class. Use a dot (`.`) before the name:

```html
<p class="highlight">This is highlighted.</p>
<p>This is not.</p>
<p class="highlight">This is also highlighted.</p>
```

```css
.highlight {
    background-color: yellow;
    font-weight: bold;
}
```

**Classes can be reused** on multiple elements.

### ID Selector
Targets one unique element. Use a hash (`#`) before the name:

```html
<h1 id="page-title">My App</h1>
```

```css
#page-title {
    text-align: center;
    color: darkgreen;
}
```

**IDs must be unique** - only one element per ID on a page.

### Combining Selectors

```css
/* Element with a class */
p.highlight {
    color: red;
}

/* Child selector - paragraphs inside a section */
section p {
    margin-bottom: 10px;
}

/* Multiple selectors sharing styles */
h1, h2, h3 {
    font-family: Arial, sans-serif;
}
```

---

## 2.3 The Box Model

Every HTML element is a rectangular box. The box model defines the space around and inside each element.

```
┌─────────────────────────────────────┐
│              MARGIN                  │
│   ┌─────────────────────────────┐   │
│   │          BORDER              │   │
│   │   ┌─────────────────────┐   │   │
│   │   │      PADDING         │   │   │
│   │   │   ┌─────────────┐   │   │   │
│   │   │   │   CONTENT    │   │   │   │
│   │   │   └─────────────┘   │   │   │
│   │   └─────────────────────┘   │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

- **Content** - The actual text/image
- **Padding** - Space between content and border
- **Border** - The edge of the element
- **Margin** - Space outside the border (between elements)

```css
.todo-item {
    /* Content width */
    width: 300px;

    /* Padding: space inside the box */
    padding: 16px;

    /* Border: the outline */
    border: 2px solid #ccc;
    border-radius: 8px; /* rounded corners */

    /* Margin: space outside the box */
    margin: 8px 0; /* 8px top/bottom, 0 left/right */
}
```

### Shorthand for padding and margin

```css
/* All four sides the same */
padding: 16px;

/* Vertical | Horizontal */
padding: 16px 24px;

/* Top | Right | Bottom | Left (clockwise) */
padding: 10px 20px 10px 20px;
```

### Box Sizing

By default, `width` only applies to the content. Padding and border are added on top. To make `width` include padding and border:

```css
/* Apply to all elements - best practice */
*, *::before, *::after {
    box-sizing: border-box;
}
```

---

## 2.4 Colours and Typography

### Colours

CSS accepts colours in several formats:

```css
.example {
    /* Named colours */
    color: red;
    color: tomato;
    color: darkslategrey;

    /* Hex codes (most common) */
    color: #ff0000;      /* red */
    color: #333333;      /* dark grey */
    color: #333;         /* shorthand for #333333 */

    /* RGB */
    color: rgb(255, 0, 0);       /* red */
    color: rgba(0, 0, 0, 0.5);   /* black at 50% opacity */
}
```

### Typography

```css
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 16px;
    line-height: 1.5;    /* 1.5 times the font size */
    color: #333;
}

h1 {
    font-size: 2rem;     /* rem = relative to root font size */
    font-weight: 700;    /* bold */
    letter-spacing: -0.5px;
}

.muted {
    color: #888;
    font-size: 0.875rem; /* 14px if root is 16px */
}
```

### Backgrounds

```css
.card {
    background-color: #f9f9f9;
    background-color: rgba(0, 0, 0, 0.05); /* slight grey overlay */
}

body {
    background-color: #ffffff;
}
```

---

## 2.5 Flexbox Layout

Flexbox is the most important layout tool in modern CSS. It arranges items in a row or column with powerful alignment options.

### Basic Flex Container

```css
.container {
    display: flex;
}
```

This puts all child elements in a **horizontal row** by default.

### Direction

```css
.container {
    display: flex;
    flex-direction: row;      /* default - horizontal */
    flex-direction: column;   /* stack vertically */
}
```

### Alignment

```css
.container {
    display: flex;

    /* Main axis alignment (horizontal for row) */
    justify-content: flex-start;    /* left (default) */
    justify-content: center;        /* centre */
    justify-content: flex-end;      /* right */
    justify-content: space-between; /* even space between items */

    /* Cross axis alignment (vertical for row) */
    align-items: flex-start;  /* top */
    align-items: center;      /* middle */
    align-items: flex-end;    /* bottom */
    align-items: stretch;     /* fill height (default) */
}
```

### Gap Between Items

```css
.container {
    display: flex;
    gap: 16px; /* space between flex children */
}
```

### Practical Example: Todo Item Layout

```html
<div class="todo-item">
    <input type="checkbox">
    <span class="todo-text">Learn CSS Flexbox</span>
    <button class="delete-btn">Delete</button>
</div>
```

```css
.todo-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
}

.todo-text {
    flex: 1; /* takes up all remaining space */
}

.delete-btn {
    background: #ff4444;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
}
```

---

## 2.6 Responsive Design

Responsive design makes your page look good on all screen sizes - mobile, tablet, and desktop.

### Media Queries

Media queries apply styles only when the screen matches certain conditions:

```css
/* Base styles (mobile first) */
.container {
    padding: 16px;
}

/* Tablet and above (768px+) */
@media (min-width: 768px) {
    .container {
        padding: 24px;
        max-width: 720px;
        margin: 0 auto;
    }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
    .container {
        max-width: 960px;
    }
}
```

### Common Responsive Patterns

```css
/* Centre the main content with a max width */
main {
    max-width: 600px;
    margin: 0 auto;
    padding: 0 16px;
}

/* Stack flex items on mobile, row on desktop */
.header {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

@media (min-width: 768px) {
    .header {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
}
```

---

## 2.7 Styling Our Todo List

Let's style the HTML Todo list from Lesson 1:

```css
/* Reset and base styles */
*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f5f5f5;
    color: #333;
    line-height: 1.6;
}

/* Header */
header {
    background-color: #4a90d9;
    color: white;
    padding: 20px;
    text-align: center;
}

header h1 {
    font-size: 1.8rem;
    margin-bottom: 8px;
}

nav {
    display: flex;
    justify-content: center;
    gap: 16px;
}

nav a {
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
}

nav a:hover {
    color: white;
}

/* Main content */
main {
    max-width: 600px;
    margin: 24px auto;
    padding: 0 16px;
}

/* Form section */
section {
    background: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

section h2 {
    font-size: 1.2rem;
    margin-bottom: 12px;
}

form {
    display: flex;
    gap: 8px;
}

form input[type="text"] {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
}

form input[type="text"]:focus {
    outline: none;
    border-color: #4a90d9;
    box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.2);
}

form button {
    padding: 10px 20px;
    background-color: #4a90d9;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
}

form button:hover {
    background-color: #3a7bc8;
}

/* Todo list */
ul {
    list-style: none;
}

li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #eee;
}

li:last-child {
    border-bottom: none;
}

li input[type="checkbox"]:checked + span {
    text-decoration: line-through;
    color: #999;
}

/* Footer */
footer {
    text-align: center;
    padding: 20px;
    color: #888;
    font-size: 0.9rem;
}
```

---

## Practice Exercises

### Exercise 1: Style a Card
Create a styled card component with:
- A white background
- Rounded corners
- A subtle shadow
- Padding inside
- A coloured border on the left side

### Exercise 2: Style the Todo List
Take the HTML Todo list from Lesson 1 and apply the CSS from section 2.7. Then customise:
- Change the header colour to your preference
- Add hover effects to the todo items
- Make the form responsive (stacks on mobile, row on desktop)

### Exercise 3: Flexbox Challenge
Create a navigation bar with:
- A logo on the left
- Navigation links centred
- A button on the right
- Use only Flexbox for layout

---

## Key Takeaways
1. CSS controls how HTML elements **look** - colours, spacing, layout
2. Use **external stylesheets** for clean, maintainable code
3. The **box model** (margin, padding, border, content) controls spacing
4. **Flexbox** is the go-to tool for arranging elements in rows and columns
5. **Media queries** make your design responsive across screen sizes
6. Always use `box-sizing: border-box` for predictable sizing

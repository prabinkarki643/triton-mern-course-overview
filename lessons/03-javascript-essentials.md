# Lesson 3: JavaScript Essentials

## What You Will Learn
- Variables, data types, and operators
- Functions (regular and arrow)
- Arrays and essential array methods
- Objects and destructuring
- Template literals and the spread operator
- DOM manipulation basics
- ES6 modules

---

## 3.1 What is JavaScript?

JavaScript makes web pages **interactive**. HTML gives structure, CSS gives style, JavaScript gives behaviour - clicking buttons, submitting forms, updating content without reloading the page.

To try JavaScript, open your browser, press `F12` (or `Cmd + Option + I` on Mac), and click the **Console** tab. You can type JavaScript directly here.

---

## 3.2 Variables and Data Types

Variables are containers that store values.

### Declaring Variables

```js
// const - value cannot be reassigned (use this by default)
const appName = "My Todo App";

// let - value can be reassigned
let taskCount = 0;
taskCount = 5; // this is fine

// Never use 'var' - it's the old way and has scoping issues
```

**Rule: Use `const` by default. Only use `let` when you need to reassign the value.**

### Data Types

```js
// String - text
const name = "Prabin";
const greeting = 'Hello';

// Number - integers and decimals
const age = 25;
const price = 9.99;

// Boolean - true or false
const isCompleted = false;
const isActive = true;

// Null - intentionally empty
const selectedTask = null;

// Undefined - not yet assigned
let result;
console.log(result); // undefined

// Array - ordered list of values
const tasks = ["Learn HTML", "Learn CSS", "Learn JS"];

// Object - key-value pairs
const task = {
    title: "Learn React",
    completed: false,
    priority: "high"
};
```

### Checking Types

```js
console.log(typeof "hello");    // "string"
console.log(typeof 42);         // "number"
console.log(typeof true);       // "boolean"
console.log(typeof [1, 2, 3]);  // "object" (arrays are objects)
```

---

## 3.3 Operators

```js
// Arithmetic
const sum = 10 + 5;       // 15
const diff = 10 - 5;      // 5
const product = 10 * 5;   // 50
const quotient = 10 / 3;  // 3.333...
const remainder = 10 % 3; // 1

// Comparison (always use === and !==)
console.log(5 === 5);     // true (strict equality)
console.log(5 === "5");   // false (different types)
console.log(5 !== 3);     // true
console.log(5 > 3);       // true
console.log(5 <= 5);      // true

// Logical
console.log(true && true);   // true (AND - both must be true)
console.log(true || false);  // true (OR - at least one true)
console.log(!true);          // false (NOT - reverses the value)
```

**Important:** Always use `===` (strict equality), never `==`. The double equals does type conversion which leads to confusing bugs.

---

## 3.4 Functions

Functions are reusable blocks of code.

### Regular Function

```js
function greet(name) {
    return "Hello, " + name + "!";
}

console.log(greet("Prabin")); // "Hello, Prabin!"
```

### Arrow Function (Modern Way)

```js
// Full arrow function
const greet = (name) => {
    return "Hello, " + name + "!";
};

// Short version (single expression - implicit return)
const greet = (name) => "Hello, " + name + "!";

// No parameters
const getTime = () => new Date().toLocaleTimeString();

// Single parameter (parentheses optional)
const double = num => num * 2;
```

### Practical Examples

```js
// Function that checks if a task is overdue
const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
};

// Function that formats a task for display
const formatTask = (task) => {
    const status = task.completed ? "Done" : "Pending";
    return `${task.title} - ${status}`;
};
```

---

## 3.5 Arrays and Array Methods

Arrays store ordered lists of items. These methods are **essential for React**.

### Creating and Accessing Arrays

```js
const fruits = ["apple", "banana", "cherry"];

console.log(fruits[0]);      // "apple" (index starts at 0)
console.log(fruits.length);  // 3
```

### map() - Transform Every Item

Creates a new array by transforming each item. **You will use this constantly in React.**

```js
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(num => num * 2);
console.log(doubled); // [2, 4, 6, 8, 10]

// Real-world: get just the titles from tasks
const tasks = [
    { title: "Learn HTML", completed: true },
    { title: "Learn CSS", completed: false },
    { title: "Learn JS", completed: false }
];

const titles = tasks.map(task => task.title);
console.log(titles); // ["Learn HTML", "Learn CSS", "Learn JS"]
```

### filter() - Keep Items That Match

Creates a new array with only the items that pass a test.

```js
const numbers = [1, 2, 3, 4, 5, 6];
const evens = numbers.filter(num => num % 2 === 0);
console.log(evens); // [2, 4, 6]

// Real-world: get incomplete tasks
const incomplete = tasks.filter(task => !task.completed);
console.log(incomplete);
// [{ title: "Learn CSS", completed: false }, { title: "Learn JS", completed: false }]
```

### find() - Get First Match

Returns the first item that passes the test (or `undefined` if none).

```js
const task = tasks.find(t => t.title === "Learn CSS");
console.log(task); // { title: "Learn CSS", completed: false }
```

### forEach() - Do Something With Each Item

Like `map()` but doesn't create a new array. Used for side effects (logging, etc.).

```js
tasks.forEach(task => {
    console.log(`Task: ${task.title}`);
});
```

### Other Useful Methods

```js
// Add to end
const newTasks = [...tasks, { title: "Learn React", completed: false }];

// Remove by index (creates new array without that item)
const withoutSecond = tasks.filter((_, index) => index !== 1);

// Check if any/all items pass a test
const anyComplete = tasks.some(t => t.completed);    // true
const allComplete = tasks.every(t => t.completed);   // false

// Find index
const index = tasks.findIndex(t => t.title === "Learn CSS"); // 1
```

---

## 3.6 Objects and Destructuring

### Objects

Objects store data as key-value pairs:

```js
const task = {
    id: 1,
    title: "Learn JavaScript",
    completed: false,
    priority: "high",
    tags: ["frontend", "fundamentals"]
};

// Accessing values
console.log(task.title);       // "Learn JavaScript"
console.log(task["priority"]); // "high"
```

### Destructuring

Destructuring extracts values from objects or arrays into variables. **Used everywhere in React.**

```js
// Object destructuring
const { title, completed, priority } = task;
console.log(title);    // "Learn JavaScript"
console.log(completed); // false

// With renaming
const { title: taskTitle } = task;
console.log(taskTitle); // "Learn JavaScript"

// With default values
const { category = "general" } = task;
console.log(category); // "general" (not in object, so uses default)

// Array destructuring
const colours = ["red", "green", "blue"];
const [first, second, third] = colours;
console.log(first);  // "red"
console.log(second); // "green"

// Skip items
const [, , lastColour] = colours;
console.log(lastColour); // "blue"
```

---

## 3.7 Template Literals and Spread Operator

### Template Literals

Use backticks (`` ` ``) for strings with variables and multi-line text:

```js
const name = "Prabin";
const taskCount = 5;

// Old way (concatenation)
const message1 = "Hello " + name + ", you have " + taskCount + " tasks.";

// Template literal (modern way)
const message2 = `Hello ${name}, you have ${taskCount} tasks.`;

// Multi-line
const html = `
    <div class="task">
        <h3>${name}'s Tasks</h3>
        <p>Total: ${taskCount}</p>
    </div>
`;
```

### Spread Operator (...)

Spreads the contents of an array or object:

```js
// Copying an array
const original = [1, 2, 3];
const copy = [...original];

// Adding to an array (without mutating)
const withFour = [...original, 4]; // [1, 2, 3, 4]

// Copying an object
const task = { title: "Learn JS", completed: false };
const taskCopy = { ...task };

// Updating an object (without mutating)
const updatedTask = { ...task, completed: true };
// { title: "Learn JS", completed: true }

// Merging objects
const defaults = { priority: "medium", category: "general" };
const custom = { priority: "high", title: "Urgent task" };
const merged = { ...defaults, ...custom };
// { priority: "high", category: "general", title: "Urgent task" }
```

**Why immutability matters:** In React, you must never directly modify state. Always create new arrays/objects using spread.

---

## 3.8 DOM Manipulation

The DOM (Document Object Model) is how JavaScript interacts with HTML.

### Selecting Elements

```js
// By ID (returns one element)
const title = document.getElementById("page-title");

// By CSS selector (returns first match)
const button = document.querySelector(".submit-btn");

// By CSS selector (returns all matches)
const allItems = document.querySelectorAll(".todo-item");
```

### Changing Content and Styles

```js
// Change text
title.textContent = "Updated Title";

// Change HTML
title.innerHTML = "<em>Updated</em> Title";

// Change styles
title.style.color = "blue";
title.style.fontSize = "24px";

// Add/remove CSS classes
title.classList.add("active");
title.classList.remove("hidden");
title.classList.toggle("completed");
```

### Event Listeners

```js
const button = document.querySelector("#add-btn");

button.addEventListener("click", () => {
    console.log("Button was clicked!");
});

// Form submission
const form = document.querySelector("form");

form.addEventListener("submit", (event) => {
    event.preventDefault(); // stop page from reloading
    const input = document.querySelector("#task-input");
    console.log("New task:", input.value);
    input.value = ""; // clear the input
});
```

### Practical Example: Interactive Todo List

```html
<form id="todo-form">
    <input type="text" id="task-input" placeholder="Add a task..." required>
    <button type="submit">Add</button>
</form>
<ul id="todo-list"></ul>
```

```js
const form = document.querySelector("#todo-form");
const input = document.querySelector("#task-input");
const list = document.querySelector("#todo-list");

form.addEventListener("submit", (event) => {
    event.preventDefault();

    // Create new list item
    const li = document.createElement("li");
    li.textContent = input.value;

    // Add click to remove
    li.addEventListener("click", () => {
        li.remove();
    });

    // Add to the list
    list.appendChild(li);

    // Clear input
    input.value = "";
    input.focus();
});
```

---

## 3.9 ES6 Modules

Modules let you split code into separate files and import what you need. This is how React projects are organised.

### Exporting

```js
// utils.js

// Named exports (can have many per file)
export const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-GB");
};

export const generateId = () => {
    return Date.now().toString(36);
};

// Default export (one per file)
const APP_NAME = "My Todo App";
export default APP_NAME;
```

### Importing

```js
// app.js

// Import named exports (must use exact names, with curly braces)
import { formatDate, generateId } from "./utils.js";

// Import default export (can use any name, no curly braces)
import APP_NAME from "./utils.js";

// Import both
import APP_NAME, { formatDate, generateId } from "./utils.js";

// Rename on import
import { formatDate as format } from "./utils.js";
```

---

## Practice Exercises

### Exercise 1: Array Practice
Given this array of tasks:
```js
const tasks = [
    { id: 1, title: "Buy groceries", completed: true, priority: "high" },
    { id: 2, title: "Clean house", completed: false, priority: "medium" },
    { id: 3, title: "Read book", completed: false, priority: "low" },
    { id: 4, title: "Exercise", completed: true, priority: "high" },
    { id: 5, title: "Cook dinner", completed: false, priority: "medium" }
];
```

Write code to:
1. Get an array of just the task titles
2. Get all incomplete tasks
3. Get all high-priority tasks
4. Count how many tasks are completed
5. Create a new array with task id:3 marked as completed (without mutating the original)

### Exercise 2: Interactive Todo List
Using the DOM manipulation concepts from section 3.8:
1. Build a working Todo list that can add and remove items
2. Add a checkbox to toggle completion (line-through text)
3. Display a count of total and completed tasks

### Exercise 3: Object Manipulation
Create a function `updateTask(tasks, id, updates)` that:
- Takes an array of tasks, an ID, and an updates object
- Returns a new array with the matching task updated
- Does NOT mutate the original array

```js
// Example usage:
const updated = updateTask(tasks, 2, { completed: true });
// tasks[1] should now have completed: true in the new array
```

---

## Key Takeaways
1. Use `const` by default, `let` when you need to reassign
2. **Arrow functions** are the modern way to write functions
3. `map()`, `filter()`, and `find()` are essential for React
4. **Destructuring** extracts values from objects and arrays cleanly
5. The **spread operator** creates copies without mutating the original
6. **Template literals** with `${}` are cleaner than string concatenation
7. **Never mutate data directly** - always create new copies (crucial for React)
8. ES6 **modules** organise code into separate, importable files

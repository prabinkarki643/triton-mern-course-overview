# Lesson 1: HTML Basics

## What You Will Learn
- What HTML is and how web pages work
- The structure of an HTML document
- Common HTML elements (headings, paragraphs, lists, links, images)
- How to create forms with input elements
- Semantic HTML for better structure

---

## 1.1 What is HTML?

HTML stands for **HyperText Markup Language**. It is the skeleton of every web page. Just like a building needs a frame before walls and paint, a website needs HTML before styling and interactivity.

**Think of it this way:**
- **HTML** = The structure (walls, rooms, doors)
- **CSS** = The decoration (paint, furniture, curtains)
- **JavaScript** = The functionality (light switches, plumbing, electricity)

When you visit any website, your browser downloads an HTML file and reads it to display the page.

---

## 1.2 Your First HTML Page

Create a file called `index.html` and type the following:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My First Web Page</title>
</head>
<body>
    <h1>Hello, World!</h1>
    <p>This is my very first web page.</p>
</body>
</html>
```

**What each part does:**

| Tag | Purpose |
|-----|---------|
| `<!DOCTYPE html>` | Tells the browser this is an HTML5 document |
| `<html>` | The root element - everything goes inside this |
| `<head>` | Contains metadata (title, character set) - not visible on page |
| `<title>` | The text shown in the browser tab |
| `<body>` | Everything visible on the page goes here |

**To view it:** Simply double-click the `index.html` file - it will open in your browser.

---

## 1.3 Common HTML Elements

### Headings

HTML has 6 levels of headings. `<h1>` is the largest, `<h6>` is the smallest.

```html
<h1>Main Title</h1>
<h2>Section Title</h2>
<h3>Sub-section Title</h3>
<h4>Smaller Heading</h4>
<h5>Even Smaller</h5>
<h6>Smallest Heading</h6>
```

**Rule of thumb:** Use only one `<h1>` per page (the main title). Use `<h2>` for sections, `<h3>` for sub-sections.

### Paragraphs and Text

```html
<p>This is a paragraph. It creates a block of text with space above and below.</p>
<p>This is another paragraph. Each <strong>bold text</strong> and <em>italic text</em> can be styled inline.</p>
```

| Tag | Result |
|-----|--------|
| `<strong>` | **Bold text** |
| `<em>` | *Italic text* |
| `<br>` | Line break (no closing tag needed) |

### Links

Links take users to other pages:

```html
<a href="https://www.google.com">Visit Google</a>
<a href="about.html">Go to About Page</a>
<a href="https://www.google.com" target="_blank">Open in New Tab</a>
```

- `href` = the URL or file path to navigate to
- `target="_blank"` = opens in a new tab

### Images

```html
<img src="photo.jpg" alt="A description of the image" width="300">
```

- `src` = the path to the image file
- `alt` = description shown if image fails to load (also helps accessibility)
- `width` = optional size control

### Lists

**Unordered list** (bullet points):
```html
<ul>
    <li>Buy groceries</li>
    <li>Walk the dog</li>
    <li>Finish homework</li>
</ul>
```

**Ordered list** (numbered):
```html
<ol>
    <li>First step</li>
    <li>Second step</li>
    <li>Third step</li>
</ol>
```

---

## 1.4 HTML Forms and Inputs

Forms are how users send data to a website - login forms, search bars, contact forms.

```html
<form>
    <label for="task">Task Name:</label>
    <input type="text" id="task" name="task" placeholder="Enter a task...">

    <label for="priority">Priority:</label>
    <select id="priority" name="priority">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
    </select>

    <label>
        <input type="checkbox" name="urgent"> Mark as urgent
    </label>

    <button type="submit">Add Task</button>
</form>
```

**Common input types:**

| Type | What It Creates |
|------|----------------|
| `text` | Single-line text box |
| `password` | Text box that hides characters |
| `email` | Text box that validates email format |
| `number` | Number input with up/down arrows |
| `checkbox` | A tick box |
| `radio` | A round option selector (pick one from a group) |
| `date` | A date picker |

**Key attributes:**
- `placeholder` = grey hint text inside the input
- `required` = the form won't submit without this field
- `id` = unique identifier (links to `<label>`)
- `name` = the key used when submitting data

---

## 1.5 Semantic HTML

Semantic elements describe their meaning. Instead of using `<div>` for everything, use elements that tell the browser (and other developers) what the content IS.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Todo App</title>
</head>
<body>
    <header>
        <h1>My Todo List</h1>
        <nav>
            <a href="#all">All</a>
            <a href="#active">Active</a>
            <a href="#completed">Completed</a>
        </nav>
    </header>

    <main>
        <section>
            <h2>Add a Task</h2>
            <form>
                <input type="text" placeholder="What needs to be done?" required>
                <button type="submit">Add</button>
            </form>
        </section>

        <section>
            <h2>Tasks</h2>
            <ul>
                <li>
                    <input type="checkbox">
                    <span>Learn HTML</span>
                </li>
                <li>
                    <input type="checkbox">
                    <span>Learn CSS</span>
                </li>
                <li>
                    <input type="checkbox" checked>
                    <span>Set up computer</span>
                </li>
            </ul>
        </section>
    </main>

    <footer>
        <p>3 tasks total | 1 completed</p>
    </footer>
</body>
</html>
```

**Semantic elements explained:**

| Element | Purpose |
|---------|---------|
| `<header>` | Top section of the page (logo, navigation) |
| `<nav>` | Navigation links |
| `<main>` | The primary content of the page |
| `<section>` | A thematic grouping of content |
| `<article>` | Self-contained content (blog post, comment) |
| `<footer>` | Bottom section (copyright, links) |
| `<aside>` | Side content (sidebar, related links) |

---

## 1.6 Divs and Spans

When no semantic element fits, use these generic containers:

- `<div>` = block-level container (takes full width, stacks vertically)
- `<span>` = inline container (flows within text)

```html
<div>
    <p>This paragraph is inside a div.</p>
    <p>So is this one. The div groups them together.</p>
</div>

<p>This has a <span>highlighted word</span> inside it.</p>
```

---

## Practice Exercises

### Exercise 1: Basic Page
Create an HTML file with:
- A heading with your name
- A paragraph about yourself
- A list of 3 hobbies
- A link to your favourite website

### Exercise 2: Static Todo List
Create a complete HTML page for a Todo list with:
- A `<header>` with the app title
- A `<form>` with a text input and submit button
- A `<section>` containing an unordered list of 5 tasks
- Each task should have a checkbox and task name
- A `<footer>` showing the task count

This is the page we will style in Lesson 2 and make interactive in Lesson 3.

---

## Key Takeaways
1. HTML provides the **structure** of a web page
2. Elements are written with **opening and closing tags**: `<p>content</p>`
3. **Attributes** add extra information to elements: `<a href="...">`
4. Use **semantic elements** to describe your content's meaning
5. **Forms** collect user input using various input types

# Lesson 5: Node.js Basics

## What You Will Learn
- What Node.js is and why developers use it
- Installing Node.js and using the terminal
- Running JavaScript outside the browser
- npm: packages, package.json, and node_modules
- TypeScript basics with Node.js
- Introduction to Vite as a build tool

---

## 5.1 What is Node.js?

Until Node.js came along, JavaScript could only run inside a web browser. **Node.js lets you run JavaScript on your computer** - outside the browser, directly in the terminal.

**Why does this matter for React?**
- React projects use **npm** (Node Package Manager) to install libraries
- Build tools like **Vite** run on Node.js
- The development server runs on Node.js
- You need Node.js to create and run any modern React project

**Think of it like this:**
- **Browser** = JavaScript playground for web pages
- **Node.js** = JavaScript playground for everything else (servers, tools, scripts)

---

## 5.2 Installing Node.js

### Check if Node.js is Already Installed

Open your terminal (Terminal on Mac, Command Prompt or PowerShell on Windows) and type:

```bash
node --version
```

If you see something like `v20.11.0`, it's already installed. If you get an error, you need to install it.

### Installing

1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** (Long Term Support) version
3. Run the installer - accept all defaults
4. Restart your terminal
5. Verify with `node --version` and `npm --version`

You should see version numbers for both.

---

## 5.3 Using the Terminal

The terminal is where you run commands. Here are the essential commands:

```bash
# Show current folder (directory)
pwd

# List files in current folder
ls          # Mac/Linux
dir         # Windows

# Change folder
cd Desktop              # go into Desktop folder
cd my-project           # go into my-project folder
cd ..                   # go up one folder
cd ~/Desktop            # go to Desktop from anywhere (Mac)

# Create a folder
mkdir my-project

# Create a file
touch index.ts          # Mac/Linux
echo. > index.ts        # Windows

# Clear the terminal
clear                   # Mac/Linux
cls                     # Windows
```

---

## 5.4 Running JavaScript with Node.js

### Running a File

Create a file called `hello.js`:

```js
const name = "Student";
console.log(`Hello, ${name}! Welcome to Node.js.`);

const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log("Doubled:", doubled);
```

Run it in the terminal:

```bash
node hello.js
```

**Output:**
```
Hello, Student! Welcome to Node.js.
Doubled: [ 2, 4, 6, 8, 10 ]
```

### Node.js REPL

You can also type JavaScript directly in the terminal:

```bash
node
```

This opens an interactive prompt where you can type JavaScript line by line:

```
> 2 + 2
4
> const greeting = "Hello"
undefined
> greeting
'Hello'
> .exit
```

Type `.exit` or press `Ctrl + C` twice to leave.

---

## 5.5 npm - Node Package Manager

npm is the tool that installs and manages JavaScript libraries (called **packages**). It comes bundled with Node.js.

### What is a Package?

A package is someone else's code that you can use in your project. Instead of writing everything from scratch, you install packages that solve common problems.

**Examples:**
- `react` - the React library
- `zod` - data validation
- `react-hook-form` - form handling
- `tailwindcss` - utility CSS framework

### Initialising a Project

Every project that uses npm starts with a `package.json` file:

```bash
mkdir my-first-project
cd my-first-project
npm init -y
```

The `-y` flag accepts all defaults. This creates a `package.json`:

```json
{
  "name": "my-first-project",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
```

**package.json is like a recipe card** - it lists everything your project needs.

### Installing Packages

```bash
# Install a package (adds to dependencies)
npm install lodash

# Install a dev-only package (only needed during development)
npm install --save-dev prettier

# Shorthand
npm i lodash
npm i -D prettier
```

After installing, two things happen:
1. The package is added to `package.json` under `dependencies` or `devDependencies`
2. The actual code is downloaded into the `node_modules` folder

### Understanding node_modules

The `node_modules` folder contains all installed package code. It can be **very large** (hundreds of MB).

**Important rules:**
- **Never edit** files inside `node_modules`
- **Never commit** `node_modules` to git
- Add it to `.gitignore`
- Anyone can recreate it by running `npm install`

### .gitignore

Create a `.gitignore` file in your project root:

```
node_modules
.env
```

This tells git to ignore these files/folders.

### npm Scripts

Scripts in `package.json` are custom commands:

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "vite",
    "build": "vite build"
  }
}
```

Run them with:

```bash
npm run dev
npm run build
npm start     # 'start' doesn't need 'run'
```

---

## 5.6 TypeScript with Node.js

TypeScript is JavaScript with **type safety**. It catches errors before your code runs, making your code more reliable and easier to work with.

### Why TypeScript?

```ts
// JavaScript - no error until runtime
function add(a, b) {
  return a + b;
}
add("hello", 5); // Returns "hello5" - probably not what you wanted!

// TypeScript - catches the error immediately
function add(a: number, b: number): number {
  return a + b;
}
add("hello", 5); // Error: Argument of type 'string' is not assignable to parameter of type 'number'
```

TypeScript tells you about mistakes **before** you run the code. Every modern React project uses TypeScript.

### Running TypeScript Files

To run `.ts` files directly in Node.js, install `tsx` (a fast TypeScript runner):

```bash
npm install -g tsx
```

Now you can run TypeScript files:

```bash
tsx hello.ts
```

Alternatively, you can install `ts-node` globally:

```bash
npm install -g ts-node
```

> **Note:** For React projects, you do not need `tsx` or `ts-node`. Vite handles TypeScript compilation automatically - you simply write `.ts` and `.tsx` files and Vite takes care of the rest.

### A Quick Look at tsconfig.json

Every TypeScript project has a `tsconfig.json` file that tells TypeScript how to behave. When you create a React project with the shadcn preset (covered in Lesson 6), this is generated for you automatically:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

**Key settings:**
- `"strict": true` - enables all type checking (recommended)
- `"jsx": "react-jsx"` - lets TypeScript understand JSX/TSX syntax
- `"paths"` - allows shortcut imports like `@/components/Button` instead of long relative paths

You do not need to memorise this. Just know it exists and what it does at a high level.

---

## 5.7 Understanding Vite

Vite (pronounced "veet", French for "fast") is a modern build tool that:

1. **Starts a development server** - shows your app in the browser
2. **Hot Module Replacement (HMR)** - updates the page instantly when you save a file
3. **Bundles your code** - packages everything into optimised files for production
4. **Handles TypeScript** - compiles `.ts` and `.tsx` files automatically, no extra setup needed

### Why Vite?

In the old days, React projects used Create React App (CRA). Vite is:
- **Much faster** to start up
- **Much faster** to update when you change code
- **Simpler** configuration
- **The modern standard** for new React projects
- **TypeScript-ready** out of the box

### Creating a React Project with the shadcn Preset

The easiest way to create a fully configured React + TypeScript project is using the **shadcn preset**:

```bash
npx shadcn@latest init --preset <YOUR_CODE> --template vite
```

This single command sets up **everything**: Vite + React + TypeScript + Tailwind CSS + shadcn/ui components. We will walk through this properly in Lesson 6 when we start with React.

---

## 5.8 Project Structure Preview

When you create a React project with the shadcn preset, you get:

```
my-react-app/
├── node_modules/        # Installed packages (gitignored)
├── public/              # Static files (favicon, images)
├── src/                 # Your source code goes here
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   ├── index.css        # Global styles (includes Tailwind)
│   └── components/      # UI components
│       └── ui/          # shadcn/ui components
├── index.html           # The single HTML page
├── package.json         # Project config and dependencies
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
├── tailwind.config.ts   # Tailwind CSS configuration
└── .gitignore           # Files to ignore in git
```

**Key insight:** React apps are **Single Page Applications (SPAs)**. There's only one `index.html` file. React dynamically updates the content using JavaScript.

Notice all the file extensions are now `.ts` and `.tsx` instead of `.js` and `.jsx`. That is TypeScript in action.

---

## Practice Exercises

### Exercise 1: Node.js Script
Create a file called `tasks.ts` that:
1. Defines a type for a task object (with title, completed, priority)
2. Creates an array of 5 task objects using that type
3. Uses `filter()` to get incomplete tasks
4. Uses `map()` to get just the titles of high-priority tasks
5. Logs the results using `console.log()`
6. Run it with `tsx tasks.ts`

### Exercise 2: npm Project
1. Create a new folder and initialise it with `npm init -y`
2. Install the `chalk` package (`npm install chalk`)
3. Create an `index.ts` that uses chalk to log colourful messages
4. Add a script in `package.json` to run your file
5. Run it with `npm start`

### Exercise 3: Explore a Vite Project
1. Create a project: `npx shadcn@latest init --template vite` (use the default preset)
2. Install dependencies and start the dev server
3. Open it in the browser
4. Edit `src/App.tsx` - change some text and save
5. Watch the browser update instantly (HMR)
6. Look through the project files and understand the structure
7. Open `tsconfig.json` and read through the settings

---

## Key Takeaways
1. **Node.js** lets you run JavaScript outside the browser
2. **npm** installs and manages packages (other people's code)
3. **package.json** lists your project's dependencies and scripts
4. **node_modules** contains installed code - never commit it to git
5. **TypeScript** adds type safety to JavaScript - every modern React project uses it
6. **Vite** is the modern build tool for React projects - fast, simple, and TypeScript-ready
7. **tsconfig.json** controls TypeScript behaviour - generated automatically by project templates
8. Always add `node_modules` to `.gitignore`
9. Run scripts with `npm run <script-name>`

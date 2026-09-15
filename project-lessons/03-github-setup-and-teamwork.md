# Project Lesson 03: GitHub Setup & Working as a Team

## What You Will Learn
- Authenticating once with the GitHub CLI so `git push` and `git pull` just work
- Creating a **private** repository for your project on GitHub
- Adding your group partner as a collaborator (and your supervisor)
- Turning your project folder into a git repository and connecting it to GitHub
- The git commands you will use every single day
- Working on **branches** and merging through **Pull Requests**
- Why you must never push straight to `main` when two people share a repository
- Handling merge conflicts without panicking

**Why this lesson matters for your marks.** Your examiner will look at your repository. A single commit called "final project" uploaded the night before tells them one person did everything at the last minute. Forty commits from two accounts across three months tells a completely different story. **Your git history is evidence of your work.**

---

## 3.1 The Tools

Two different things, easy to confuse:

| | What it is | What you use it for |
|---|-----------|--------------------|
| **git** | The version control program on your computer | `add`, `commit`, `push`, `pull`, `branch` — every day |
| **GitHub** | A website that hosts git repositories | Storing your code online, Pull Requests, collaboration |
| **GitHub CLI (`gh`)** | A helper program | **One job only: logging in.** Then you forget it exists |

We use `gh` for **authentication only**. Everything else — creating the repository, adding your partner, opening Pull Requests — you will do on the **GitHub website**, because that is where you can see what is happening.

---

## 3.2 Install and Authenticate (once per computer)

### Install the GitHub CLI

```bash
# macOS
brew install gh

# Windows
winget install --id GitHub.cli
```

Check it installed:

```bash
gh --version
```

### Log in

```bash
gh auth login
```

Answer the prompts:

| Prompt | Choose |
|--------|--------|
| What account do you want to log into? | **GitHub.com** |
| What is your preferred protocol for Git operations? | **HTTPS** |
| Authenticate Git with your GitHub credentials? | **Yes** ← do not skip this |
| How would you like to authenticate? | **Login with a web browser** |

It shows a one-time code, you press Enter, your browser opens, you paste the code and approve.

> **That third question is the important one.** Answering **Yes** tells git to use your GitHub login for pushing and pulling. Say no, and every `git push` will ask for a username and password — and GitHub stopped accepting account passwords for git years ago, so it will fail confusingly.

### Check it worked

```bash
gh auth status
```

```
github.com
  ✓ Logged in to github.com account your-username (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token: gho_************************************
```

**That is all we use `gh` for.** From here on, `git push` and `git pull` work without asking for anything, and the rest of this lesson happens in the browser.

### Tell git who you are

Only needed once per computer. This name appears on every commit you make:

```bash
git config --global user.name "Your Name"
git config --global user.email "your-github-email@example.com"
```

> **Use the same email as your GitHub account.** If it does not match, GitHub cannot link the commits to your profile — your contributions show as an anonymous author, and your examiner cannot see that you did the work.

---

## 3.3 Creating the Repository (on the website)

1. Go to **https://github.com/new**
2. **Repository name** — name it after your project title, lowercase with hyphens:
   - `futsal-ground-booking`
   - `restaurant-table-booking`
   - `doctor-appointment-system`
3. **Description** — one line: *"Final year project — futsal ground booking system built with Next.js, Express and MongoDB"*
4. **Select `Private`** ← important, see below
5. **Do not tick** "Add a README file", "Add .gitignore", or "Choose a license"
6. Click **Create repository**

GitHub then shows you a page of setup commands. **Keep that tab open** — you need the URL from it in section 3.5.

### Why private?

Your repository will contain your project before it is marked. A public repository can be found, copied and submitted by another student — and if two submissions match, **you both** end up in a plagiarism investigation. Keep it private until after your defence. You can make it public afterwards for your portfolio.

### Why no README or .gitignore from GitHub?

Because your folder already has files. Letting GitHub create a first commit means your local repository and the GitHub one have different histories, and your first `git push` gets rejected with a confusing error about unrelated histories. Start it empty and push your own files up.

---

## 3.4 Adding Your Partner as a Collaborator

Your partner cannot push to your private repository until you invite them.

1. Open your repository on GitHub
2. **Settings** (top bar, far right)
3. **Collaborators** in the left sidebar
4. Click **Add people**
5. Type your partner's **GitHub username** and select them
6. Click **Add ... to this repository**

They receive an email invitation and must accept it before they can push.

### Add your supervisor (optional but recommended)

Same steps, using the username:

```
prabinkarki643
```

This lets me see your progress, review your Pull Requests, and help when you are stuck — without you having to send me zip files.

> **Collaborator, not a fork.** Both group members work on the **same** repository as collaborators. Do not fork it — forks make combining your work far harder than it needs to be.

---

## 3.5 Connecting Your Project Folder to GitHub

You have a project folder from Lessons 01 and 02:

```
futsal-booking/
├── frontend/
└── backend/
```

### Step 1: Check your `.gitignore` FIRST

**Before your first commit.** Once a secret is committed it stays in the history forever, even if you delete the file later.

Create `.gitignore` in the **project root**:

```gitignore
# dependencies
node_modules/

# builds
dist/
.next/
build/

# environment files -- secrets!
.env
.env.local
.env.production

# but DO share the templates
!.env.example

# uploads
uploads/

# system files
.DS_Store
Thumbs.db

# logs
*.log
npm-debug.log*
```

The `!.env.example` line matters. Without it the `.env` rules swallow your template too, and your partner never learns which variables to set.

### Step 2: Initialise and push

From your **project root** (the folder containing `frontend/` and `backend/`):

```bash
git init
git add .
git commit -m "Initial commit: Next.js frontend and Express backend skeleton"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Replace the URL with the one from your repository page.

**What each line does:**

| Command | What it does |
|---------|-------------|
| `git init` | Turns this folder into a git repository |
| `git add .` | Stages every file (except what `.gitignore` excludes) |
| `git commit -m "..."` | Saves a snapshot with a message |
| `git branch -M main` | Names the branch `main` |
| `git remote add origin <url>` | Records where "origin" (GitHub) is |
| `git push -u origin main` | Uploads, and remembers the destination |

The `-u` means later pushes are just `git push`.

### Step 3: Verify your secrets did NOT go up

```bash
git status --short
```

Then, on GitHub, browse the files. **You must not see `.env` anywhere.** You should see `.env.example`.

```bash
# a direct check -- this should print nothing at all
git ls-files | grep "\.env$"
```

> **If `.env` did get committed:** remove it with `git rm --cached backend/.env`, commit, push — then **change your database password immediately**. The old one is in your history and must be treated as leaked.

### Step 4: Your partner gets a copy

Once they accept the invitation:

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO

cd backend && npm install && cp .env.example .env
cd ../frontend && npm install && cp .env.example .env.local
```

They fill in their own `.env` values. **Never send your `.env` over WhatsApp or email** — send the `.env.example` (already in the repo) and tell them to use their own MongoDB.

---

## 3.6 The Commands You Will Use Every Day

Ninety percent of your git use is these six commands.

### Checking what is going on

```bash
git status                  # what have I changed?
git diff                    # show me the actual changes
git log --oneline -10       # the last 10 commits
```

Run `git status` constantly. It is free and it tells you exactly where you are.

### Saving your work

```bash
git add .                   # stage everything you changed
git add src/app/page.tsx    # or stage one specific file

git commit -m "Add room listing page with search filter"

git push                    # send it to GitHub
```

### Getting your partner's work

```bash
git pull                    # download and merge their changes
```

**Pull before you start working, every single time.** Most painful conflicts come from working for three hours on an old copy of the code.

### Branches

```bash
git checkout -b feature/booking-form   # create a branch and switch to it
git checkout main                      # switch back to main
git branch                             # list branches, * marks current
```

### Writing commit messages

A commit message should finish the sentence *"applying this commit will…"*

| Poor | Good |
|------|------|
| `update` | `Add date validation to the booking form` |
| `fix` | `Fix double-booking when two users pick the same slot` |
| `asdf` | `Add owner dashboard with booking stats` |
| `final` | `Add pagination to the room listing API` |

Your examiner reads these. So does your partner, at midnight, trying to work out what you changed.

---

## 3.7 Branches and Pull Requests: How to Work Together

**This is the most important section in this lesson.**

### The rule: never push to `main`

With two people pushing to `main` directly, this happens on day one:

```
You:     edit BookingForm.tsx  → push to main  ✓
Partner: edit BookingForm.tsx  → push to main  ✗ REJECTED
         → panics, runs a command from the internet
         → your work disappears
```

Instead, each person works on their **own branch** and merges through a **Pull Request**.

### The daily cycle

**1. Start from an up-to-date main**

```bash
git checkout main
git pull
```

**2. Create a branch for what you are about to do**

```bash
git checkout -b feature/booking-form
```

Name it after the work:

| Type | Example |
|------|---------|
| New feature | `feature/room-search` |
| Bug fix | `fix/double-booking` |
| Styling | `style/mobile-navbar` |

**3. Work, and commit as you go**

```bash
git add .
git commit -m "Add booking form with date and slot validation"
```

Commit several times as you work. One giant commit at the end is harder to review and loses your history.

**4. Push your branch**

```bash
git push -u origin feature/booking-form
```

**5. Open a Pull Request on the website**

Go to your repository on GitHub. A yellow banner appears: **"feature/booking-form had recent pushes — Compare & pull request"**. Click it.

(No banner? Click the **Pull requests** tab → **New pull request** → set *base* `main`, *compare* `feature/booking-form`.)

Fill it in:

- **Title** — what the change does: *"Add booking form with slot validation"*
- **Description** — what you did, and anything your partner should look at:

  ```
  What this does:
  - Adds the booking form with date + time slot pickers
  - Validates that the slot is not already taken
  - Shows an error when the date is in the past

  To test:
  - Go to /rooms/[id] and try booking a slot that already exists

  Not done yet:
  - Payment step comes in the next PR
  ```

- **Reviewers** — on the right, request your partner (and your supervisor)

Click **Create pull request**.

**6. Your partner reviews it**

They open the **Files changed** tab, read the diff, and either leave comments or click **Review changes → Approve**.

**7. Merge it**

Click **Merge pull request** → **Confirm merge** → **Delete branch** (the button appears after merging — this only removes the branch, never your code).

**8. Everyone updates**

```bash
git checkout main
git pull
```

Now both of you are level, and you start the next branch from there.

### Why bother, when it is only two of you?

- **Nothing reaches `main` unseen.** Two pairs of eyes catch bugs before they become your demo failing
- **`main` always works.** When your supervisor asks for a demo, `main` is never half-finished
- **Your Pull Requests are evidence.** They show who built what, discussed across weeks — exactly what an examiner asking "which parts did you write?" wants to see
- **It is how every software company works.** Saying "we worked through PRs with reviews" in your defence lands well

### Optional: make the rule automatic

**Settings → Branches → Add branch protection rule**, branch name `main`, tick **Require a pull request before merging**. Now GitHub refuses a direct push to `main`, so nobody can do it by accident at 2am.

---

## 3.8 When Two People Edit the Same File

It will happen. It is normal, and it is fixable.

```bash
git pull
```

```
CONFLICT (content): Merge conflict in src/app/page.tsx
Automatic merge failed; fix conflicts and then commit the result.
```

Open the file. Git has marked the disagreement:

```
<<<<<<< HEAD
<h1>Book a Futsal Ground</h1>
=======
<h1>Find and Book Grounds Near You</h1>
>>>>>>> main
```

- Above `=======` — **your** version
- Below `=======` — **their** version

Decide what the file should say. Keep one, or combine them, then **delete all three marker lines**:

```tsx
<h1>Find and Book Grounds Near You</h1>
```

Then:

```bash
git add src/app/page.tsx
git commit -m "Resolve merge conflict in home page heading"
git push
```

**Rules that prevent most conflicts:**

1. `git pull` before you start work, every time
2. Push small changes often — not three days of work at once
3. Agree who owns which area. "You do the booking pages, I do the owner dashboard"
4. Talk to each other before both editing the same file

> **Never delete the repository and re-upload to "fix" a conflict.** You lose your entire history — the evidence of your work. Conflicts are a normal part of collaboration, not a disaster.

---

## 3.9 When Things Go Wrong

| Problem | What it means | Fix |
|---------|--------------|-----|
| `Authentication failed` on push | Not logged in, or you answered "no" to the git credentials question | Run `gh auth login` again, answer **Yes** to authenticating git |
| `Permission denied` / `403` | You are not a collaborator, or did not accept the invite | Check your email, accept the invitation |
| `Updates were rejected because the remote contains work...` | Your partner pushed while you were working | `git pull`, resolve anything flagged, then push |
| `refusing to merge unrelated histories` | GitHub created a README and your local repo has its own start | `git pull origin main --allow-unrelated-histories`, resolve, commit |
| `.env` is on GitHub | It was committed before `.gitignore` existed | `git rm --cached path/to/.env`, commit, push, **then change the password** |
| `node_modules` got pushed | Same cause | `git rm -r --cached node_modules`, commit, push |
| Commits not showing on your profile | Your git email does not match your GitHub account | `git config --global user.email "your-github-email"` — affects future commits |
| Pushed to the wrong branch | Happens to everyone | Tell your partner before doing anything, then fix it together |

---

## Practice Exercises

### Exercise 1: Set Up (do this in class)
1. Install `gh` and run `gh auth login`, answering **Yes** to authenticating git
2. Run `gh auth status` and confirm you are logged in
3. Set your `user.name` and `user.email` with the email on your GitHub account

### Exercise 2: Create and Connect
1. Create a **private** repository named after your project title
2. Add your partner as a collaborator, and `prabinkarki643`
3. Write your `.gitignore` **before** committing anything
4. `git init`, commit, add the remote, and push
5. On GitHub, confirm you can see `.env.example` and **cannot** see `.env`

### Exercise 3: Your First Pull Request
1. `git checkout -b feature/hello-world`
2. Change something small — a heading on your home page
3. Commit, push the branch, open a Pull Request on the website
4. Request your partner as reviewer
5. Have them approve and merge it
6. Both run `git checkout main && git pull`

### Exercise 4: Create a Conflict Deliberately
Do this **now**, while it costs nothing — not in exam week.

1. Both of you branch from `main`
2. Both edit the **same line** of the same file, differently
3. One merges their PR first
4. The second pulls `main` into their branch and resolves the conflict
5. Merge the second PR

Having done this once, the real one will not frighten you.

### Exercise 5: Agree Your Working Rules
Write these into your repository's README so you both remember:
- Who owns which parts of the project
- Branch naming you will use
- That `main` is only ever updated through a Pull Request
- How often you will pull (suggestion: every time you sit down)

---

## Key Takeaways
1. `gh` has **one job: `gh auth login`**. Answer **Yes** to authenticating git, then use plain git from there
2. Your repository must be **private** until after your defence
3. Both members are **collaborators on one repository** — never forks
4. Write `.gitignore` **before** your first commit. A committed secret is in the history forever
5. `git init` → `add` → `commit` → `git remote add origin <url>` → `git push -u origin main`
6. Six daily commands: `status`, `add`, `commit`, `push`, `pull`, `checkout -b`
7. **Never push to `main`.** Branch, push the branch, open a Pull Request, get it reviewed, merge
8. `git pull` before you start working — every time
9. Conflicts are normal. Edit the file, delete the `<<<<<<<` markers, commit
10. Commit messages should say what the change does — your examiner reads them
11. Your commit history and Pull Requests are **evidence of who did what**, and you will be asked

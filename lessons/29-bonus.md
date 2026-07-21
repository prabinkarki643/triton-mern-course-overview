# Lesson 29: Bonus -- The Real IT World

## What You Will Learn
- Why professional developers use so many tools you have not touched yet, and which of them actually matter early on
- A **Git cheat sheet** you can print and keep next to your keyboard
- What **domain names and DNS** are, and how you buy a `.com` from providers like GoDaddy or Namecheap
- What **Cloudflare** does and why almost every serious website sits behind it
- A quick tour of **AWS** -- what the popular services are actually for
- What **Docker** is and why you keep hearing about "containers"
- How to set up **automatic deploys with GitHub Actions** (CI/CD)
- How real teams handle **environment variables and secrets** so credentials never touch git
- How to catch bugs in production with **error tracking** (Sentry) and **uptime monitoring**
- The **testing pyramid** -- unit, integration, end-to-end -- and which tools do which
- **Code quality tools** every real repo has: ESLint, Prettier, Husky
- Alternatives to eSewa: **Stripe, Khalti, Fonepay** and when each is right
- Concrete **next projects** to build so this stops being "a course" and starts being "how you work"

---

## 29.1 About This Bonus Lesson

You have just built a full-stack booking application from scratch. That is a huge amount of ground to cover, and there is a temptation to feel like you are done. You are not done -- you are ready.

Every developer working professionally uses ten or twenty tools you have not touched yet. Not because our course was incomplete, but because you cannot possibly learn everything at once. This lesson is a **map**, not a manual. Each section is a "what is this thing, why should you care, where should you start" summary of a topic that could easily be a course on its own.

Read it once end-to-end so you know the shape of the landscape. Then come back to individual sections when a real project bumps into that tool.

> **A word of encouragement.** If a section makes you feel like there is too much to learn, that is normal. Even senior developers only know one or two of these deeply -- they know enough about the rest to have a productive conversation and search efficiently. That is your goal too. **Depth in a few, awareness in many.**

---

## 29.2 Git Cheat Sheet

Git is version control -- it remembers every change to your code so you can go back in time, share with teammates, and collaborate without overwriting each other's work. You have been using git throughout the course. Here are the commands you will actually use every day.

### Everyday flow

```bash
# See what has changed
git status

# See the actual line-by-line changes
git diff

# Stage files for the next commit
git add file1.ts file2.tsx        # specific files (safer)
git add .                          # everything in this folder

# Commit staged changes with a message
git commit -m "Add rating field to Room model"

# Push your commits to GitHub
git push

# Pull the latest changes from GitHub
git pull
```

### Branches

Branches let you work on a new feature without breaking the main version of the app.

```bash
# See what branch you are on
git branch

# Create a new branch and switch to it
git checkout -b feature/room-reviews

# Switch to an existing branch
git checkout main

# Delete a local branch (after merging)
git branch -d feature/room-reviews

# Merge another branch into your current branch
git merge feature/room-reviews
```

### Undoing things

```bash
# I wrote a bad message, let me redo it (only if I have not pushed yet)
git commit --amend -m "Better message"

# Discard uncommitted changes in a specific file
git checkout -- src/pages/HomePage.tsx

# Discard ALL uncommitted changes (dangerous)
git checkout -- .

# I committed something I did not mean to (soft: keeps the changes, unstages them)
git reset HEAD~1
```

### Looking at history

```bash
git log                            # full history
git log --oneline                  # compact -- one line per commit
git log --oneline -10              # only the last 10
git blame src/pages/BookingDetail.tsx    # who wrote each line and when
```

### The one thing that trips beginners up

If you and a teammate both changed the same lines and try to merge, git shows a **merge conflict**. Do not panic -- open the file, look for the `<<<<<<<` and `>>>>>>>` markers, decide which version to keep (or combine both), remove the markers, then `git add` and `git commit` to finish the merge.

> **Learn one advanced habit early: descriptive commit messages.** "fix" is a bad commit message. "Fix eSewa signature mismatch by aligning String(amount) on both sides" is a great one. Future-you will thank present-you when reading `git log` a year from now.

---

## 29.3 GitHub Beyond `git push`

Git is the tool; GitHub is the website that hosts your git repositories. Once your team is more than one person, most of the interesting collaboration happens **on GitHub**, not on your machine.

### Pull requests (PRs)

A **pull request** is how you propose a change. Instead of pushing straight to `main`, you push to a branch (like `feature/room-reviews`), then open a PR on GitHub asking "please review my change and merge it into `main`". Your teammate reads it, comments, requests changes, and clicks Merge when happy.

Why bother when you could just push to main?
- The PR page shows a nice diff you can read carefully
- Reviewers catch bugs before they hit production
- The PR becomes documentation of *why* a change was made

### Issues

An **issue** on GitHub is a ticket -- "there's a bug where the eSewa Retry button loops", or "we should add rating stars to rooms". Every serious project uses issues as its to-do list. You can reference issues in commit messages (`Fixes #42`) and GitHub links them together.

### GitHub Actions

Automation that runs on every push (see §29.7 CI/CD).

### GitHub CLI

Instead of clicking around github.com, you can drive GitHub from the terminal with `gh`:

```bash
brew install gh                              # macOS
gh auth login                                # one-time
gh pr create --title "Add room reviews" --body "..."
gh pr view 42
gh issue list --state open
```

---

## 29.4 Domain Names & DNS

Right now your deployed app lives at `bookmyroom-frontend.vercel.app`. That works, but "yourawesomeapp.com" is the difference between "student project" and "real service". Getting your own domain takes ten minutes and typically costs **£8-£15 per year**.

### Where you buy a domain

- **GoDaddy** -- oldest, biggest, most aggressive upsells. Fine but noisy checkout.
- **Namecheap** -- cheaper, cleaner UI, popular with developers.
- **Cloudflare Registrar** -- sells domains at wholesale cost (no markup). Requires a Cloudflare account (see §29.5).
- **Porkbun** -- another good developer-friendly option.

For a beginner in Nepal or the UK, **Namecheap** or **Cloudflare Registrar** are the best default choices. GoDaddy is fine too but you will have to click "no thanks" through ten upsell screens.

### What DNS actually does

The internet does not know what "bookmyroom.com" means. It only understands IP addresses like `76.76.21.21`. **DNS** (Domain Name System) is the world's address book -- when someone types `bookmyroom.com` into their browser, DNS translates that to the IP of the server that will actually serve the page.

You configure DNS by setting **records**. The ones you will meet:

| Record | What it does |
|---|---|
| **A** | Points a domain to an IPv4 address (`76.76.21.21`) |
| **AAAA** | Same but IPv6 |
| **CNAME** | Points a subdomain to another domain (e.g. `www.bookmyroom.com` -> `bookmyroom.com`) |
| **MX** | Where to deliver email for this domain |
| **TXT** | Free-form text -- used for domain verification (SPF, DKIM, DMARC for email) |
| **NS** | Which name servers are authoritative for this domain |

### Pointing your domain at Vercel

After you deploy BookMyRoom to Vercel (§28.6):

1. In Vercel, go to your project -> Settings -> Domains, and add `bookmyroom.com`. Vercel will tell you exactly which A or CNAME record to add.
2. Go to your domain registrar's DNS panel and add the record Vercel just gave you.
3. Wait 5-30 minutes for DNS to update globally ("propagation"). Vercel issues a free HTTPS certificate automatically.

Same idea for Render on the backend (`api.bookmyroom.com`).

---

## 29.5 Cloudflare

Cloudflare sits **between your users and your server**. Every request goes through Cloudflare first. That single position lets it do a surprising amount of useful work.

### What Cloudflare gives you (all on the free tier)

- **CDN (Content Delivery Network)** -- static files (images, CSS, JS) get cached in ~300 data centres around the world. A user in Kathmandu gets your CSS from Singapore rather than crossing the Atlantic to your Render server in Oregon. Faster and cheaper.
- **DDoS protection** -- if attackers try to flood your server with fake traffic, Cloudflare absorbs it. This is huge because DDoS is trivially cheap to launch.
- **HTTPS** -- free TLS certificate, auto-renewed. Your site gets the padlock icon.
- **DNS hosting** -- fast, free, and includes an API. Many developers use Cloudflare purely as a DNS provider.
- **Analytics** -- basic traffic dashboard without cookies.
- **Rate limiting** -- block someone hitting your login endpoint 100 times a second.

### Cloudflare products worth knowing

- **Cloudflare Pages** -- static site + Jamstack hosting (similar to Vercel). Free tier is generous.
- **Cloudflare Workers** -- run small pieces of code at the edge (all 300 data centres). Great for simple APIs or middleware.
- **R2** -- object storage (like AWS S3) with **no bandwidth charges**. Massive win for anyone serving lots of images.
- **D1** -- serverless SQLite for edge apps.
- **Tunnel** -- expose a service running on your laptop to the public internet without opening a port. Similar to ngrok (which we used for eSewa in §26.12) but free and permanent.

### The rule of thumb

If you own a domain and it is not behind Cloudflare, you are probably leaving performance and security on the table for no reason. Put it on Cloudflare on day one.

---

## 29.6 AWS -- The 15% You Actually Meet

**Amazon Web Services (AWS)** is the biggest cloud provider in the world. It has hundreds of services with confusing names, but 90% of real usage lands on a small handful. Here is the map.

### The services you meet first

| Service | What it is | Rough analogy |
|---|---|---|
| **S3** | Object storage -- upload files (images, PDFs, videos), get back a URL | Google Drive but for apps |
| **EC2** | A virtual server you rent by the hour | A DigitalOcean droplet |
| **RDS** | Managed relational databases (Postgres, MySQL, etc.) | Neon or Supabase |
| **Lambda** | Run a function without managing a server; pay only when it runs | Vercel serverless functions |
| **CloudFront** | AWS's own CDN | Cloudflare CDN |
| **Route 53** | DNS hosting + domain registration | Cloudflare DNS |
| **SES** | Send transactional email cheaply and reliably | Mailtrap for production |
| **IAM** | Users, roles, permissions | Employee access badges |
| **CloudWatch** | Logs, metrics, alarms | Grafana |

### What "cloud" actually means

Behind every AWS service is a physical building somewhere with racks of computers. AWS lets you rent slices of those computers by the second. You never touch hardware; you just click "give me a server" and one exists sixty seconds later.

### AWS versus everything else

AWS is powerful but **very** dense. For a beginner deploying a first project:

- **Vercel or Render** for hosting your app (easier)
- **MongoDB Atlas or Supabase** for the database (easier)
- **AWS SES** for sending real production email (still the cheapest and most reliable)
- **AWS S3** if you outgrow the local `uploads/` folder in `booking-backend`

Most people do not need EC2 or Lambda until they hit real scale. Do not feel behind for not using them yet.

### Free tier

AWS has a 12-month free tier that covers small experiments. **Set a budget alarm as your very first task** (Billing -> Budgets -> Create) -- unexpected charges from AWS are a rite of passage and a good reason not to leave things running.

---

## 29.7 Docker -- Containers, Simply

Every developer has heard the phrase "it works on my machine". Docker is the answer.

### The problem Docker solves

Your BookMyRoom backend needs Node 20, MongoDB 7, and a particular version of Multer. Your teammate has Node 18 and Mongo 6. The app breaks on their machine even though the code is identical. Now imagine that mismatch across ten servers in production.

### What a container is

A **container** is your app plus every dependency it needs, packaged into a single portable file. When you run the container it behaves identically on your laptop, a teammate's laptop, and the production server. Nothing on the host machine matters except that it can run Docker.

### The two files you meet

**Dockerfile** -- a recipe for building the container:

```dockerfile
# Start from a small Linux image with Node 20 already installed
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies first
# (Docker caches this layer if package.json has not changed)
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the app
COPY dist/ ./dist/

# Tell Docker what port the app listens on
EXPOSE 4001

# The command that runs when the container starts
CMD ["node", "dist/index.js"]
```

**docker-compose.yml** -- run multiple containers together (app + database + cache):

```yaml
services:
  backend:
    build: ./bookmyroom_app/booking-backend
    ports:
      - "4001:4001"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/bookmyroom
      - JWT_SECRET=dev-secret
    depends_on:
      - mongo

  mongo:
    image: mongo:7
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

Then `docker compose up` starts both the backend and MongoDB together. Everyone on the team gets exactly the same environment with one command.

### When to reach for Docker

- You want a teammate to run BookMyRoom without installing Node or MongoDB manually
- You are deploying to a platform that expects containers (Fly, Railway, AWS ECS, Kubernetes)
- You want your CI (§29.7) to test against the same versions as production

For a first project deployed on Vercel + Render, you do **not** need Docker yet. Learn it when a real project needs it.

---

## 29.8 CI/CD with GitHub Actions

**CI** stands for **Continuous Integration** -- every push automatically runs your tests and lints. **CD** stands for **Continuous Deployment** -- every merge to `main` automatically deploys the new code. Together they mean "if code lands on `main`, it is in production five minutes later with tests passing".

GitHub Actions is GitHub's built-in CI/CD, free for public repos and generous for private ones. You add a YAML file and GitHub runs it in a fresh Ubuntu VM whenever the trigger fires.

### A minimal test-on-push workflow

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, "**"]      # run on every push to any branch
  pull_request:
    branches: [main]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - working-directory: bookmyroom_app/booking-backend
        run: |
          npm ci
          npm run build
          # npm test    (once you add tests -- see §29.10)

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - working-directory: bookmyroom_app/booking-frontend
        run: |
          npm ci
          npm run build
```

Commit that file and push. GitHub shows a green tick next to every commit and PR that passes, and a red cross with logs when something fails. Once you get used to that feedback loop you will never go back.

Both Vercel and Render also **deploy automatically** on every push to `main` without you needing an Action -- their built-in git integration is already CD. GitHub Actions just adds the CI (tests, lint) side.

---

## 29.9 Environment Variables & Secrets

Every real app has secrets: database passwords, JWT signing keys, SMTP credentials, payment gateway API keys. **Never** put these in git.

You already know the pattern -- `.env` files, `.gitignore` them, use `process.env.THING`. Here is the wider picture.

### Levels of secret management

| Level | Where secrets live | When appropriate |
|---|---|---|
| **`.env` files** | Local files | Local development only |
| **Platform env vars** | Vercel / Render / Netlify dashboards | Small teams, small apps |
| **Hosted secrets vault** | Doppler, Infisical, dotenv-vault | Growing teams; audit trail matters |
| **Cloud secrets manager** | AWS Secrets Manager, GCP Secret Manager | Enterprise; strict compliance |

For a personal project or teaching lab, platform env vars (Render's dashboard, Vercel's dashboard) are exactly right.

### The rule you must not break

If a real secret ever gets committed to git, **it is public forever** -- even if you delete it in the next commit. Rotate the secret (change the password, regenerate the key) immediately. GitHub's secret scanner will catch obvious ones (AWS keys, Stripe keys, Slack tokens) and revoke them for you, but do not rely on that.

### Tools that help

- **direnv** -- automatically loads a `.envrc` file when you `cd` into the project
- **1Password / Bitwarden** -- share secrets safely between teammates
- **GitHub's secret scanning** -- catches known secret formats in pushes

---

## 29.10 Monitoring & Error Tracking

Once your app is live, you need to know when it breaks -- ideally **before** users email you.

### Error tracking

**Sentry** is the tool everyone uses. When your app throws an error in production, Sentry captures the stack trace, the browser, the URL, the user (if you tell it), and sends you an alert.

```typescript
// booking-frontend/src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});
```

Free tier covers 5,000 errors per month -- easily enough for a growing side project.

### Uptime monitoring

**Are you sure your API is up right now?** Uptime monitors hit your `/api/health` endpoint every minute or two and text you if it stops responding. Free options:

- **UptimeRobot** -- free for up to 50 monitors
- **Better Uptime** (now BetterStack) -- free tier + a nicer UI
- **Cronitor** -- also monitors cron jobs (like the L26.14 abandoned-booking sweep)

### Logs and metrics

For a full production system you also want:

- **Structured logs** in production (JSON, not `console.log`), searchable in a dashboard
- **Metrics** -- request rate, error rate, latency percentiles

Platforms like Grafana Cloud, Datadog, or New Relic sit at this level. For a hobby project, the built-in logs on Vercel and Render are usually enough.

---

## 29.11 The Testing Pyramid

Testing is a topic bigger than a course, but here is the shape.

```
        /\
       /  \
      /  E2E   \        few, slow, expensive -- test the real app in a browser
     /----------\
    /            \
   / Integration  \      medium -- test API endpoints or component + hook combos
  /----------------\
 /                  \
/       Unit         \    many, fast, cheap -- test one function in isolation
----------------------
```

You want lots of unit tests, some integration tests, and just a few E2E tests. The pyramid shape reminds you not to invert it.

### Tools you will meet

- **Vitest** -- unit test runner for Vite / React projects (fast successor to Jest)
- **Testing Library** -- render React components and assert on what a user would see
- **Supertest** -- fire HTTP requests at your Express app inside a test
- **Playwright** -- drive a real browser end-to-end (login, book a room, verify eSewa flow)

### A trivial Vitest example

```typescript
// booking-backend/src/services/esewaService.test.ts
import { describe, it, expect } from "vitest";
import { generateSignature } from "./esewaService";

describe("generateSignature", () => {
  it("produces the docs example signature", () => {
    const message =
      "total_amount=100,transaction_uuid=11-201-13,product_code=EPAYTEST";
    const signature = generateSignature(message);
    // Value taken verbatim from developer.esewa.com.np docs
    expect(signature).toBe("4Ov7pCI1zIOdwtV2BRMUNjz1upIlT/COTxfLhWvVurE=");
  });
});
```

Run it with `npx vitest`. Green tick means our signature logic matches the docs. If we ever break it, the test tells us instantly.

> **Start small.** You do not need 100% coverage on day one. Write a test the next time you fix a bug -- the test proves the fix and stops the bug coming back.

---

## 29.12 Code Quality Tools

Real repositories run these on every push:

- **ESLint** -- catches "this variable is unused", "this hook rule is broken", "this promise is not awaited". You already have one (`booking-frontend/eslint.config.js`).
- **Prettier** -- auto-formats code so nobody argues about semicolons.
- **TypeScript** -- static types (you have used it every lesson).
- **Husky** + **lint-staged** -- run ESLint / Prettier / tests **automatically before every commit**. Broken code never gets committed.

Setup, once per project:

```bash
npm install --save-dev husky lint-staged
npx husky init
```

Then in `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

And in `.husky/pre-commit`:

```bash
npx lint-staged
```

Now every `git commit` runs ESLint + Prettier on the files you changed. If ESLint finds a problem, the commit is refused. Feels annoying at first, feels essential after a week.

---

## 29.13 Payment Gateways Beyond eSewa

L26 taught eSewa. Real apps often need multiple gateways depending on the audience.

| Gateway | Best for | Where it works |
|---|---|---|
| **eSewa** | Nepali digital wallet users | Nepal only |
| **Khalti** | Same audience as eSewa, sometimes preferred by younger users | Nepal only |
| **Fonepay** | Bank transfers via QR (increasingly popular in Nepal) | Nepal only |
| **IME Pay** | Another Nepali wallet | Nepal only |
| **Stripe** | International cards (Visa, Mastercard, Amex, Apple Pay, Google Pay) | 40+ countries, not Nepal directly |
| **PayPal** | International customers who trust PayPal | Global |
| **Razorpay** | Indian customers | India |

### The integration pattern is always the same

Every gateway follows roughly the L26 shape:

1. Your backend builds a signed / authorised payload
2. Redirect or embed the gateway's page for the user to pay
3. Gateway calls back to your webhook / callback URL
4. Your backend verifies with the gateway's server-to-server status API
5. Update the booking / order and email the user

Once you have integrated one gateway well, adding a second is much faster.

### The compliance thing you should know about

If you take card payments **directly** (never touch cards -- use Stripe Elements, PayPal Checkout, etc.), you skip a set of rules called **PCI-DSS**. If you ever try to type a card number into your own form field, you have to comply with PCI-DSS. Do not do this. Always use the gateway's hosted / iframe fields.

---

## 29.14 What to Build Next

Reading is not learning. Building is learning. Here are five follow-on projects, ordered from smallest to biggest, that will reinforce what you know while pushing you slightly:

### 1. A tiny weather widget (weekend)

Fetch a public weather API (open-meteo is free, no key needed) and display today's weather for a city the user types in. Focus: pure React, `useQuery`, controlled input, loading and error states.

### 2. A URL shortener like bit.ly (1-2 weekends)

- Backend: `POST /shorten { url }` returns `{ short: "abc123" }`. `GET /:code` redirects to the original URL.
- Frontend: form to shorten, list of your shortened links.
- Bonus: click count per link -- your first "analytics" feature.

Great for practising database design (one table, one indexed field) and thinking about hash / random ID generation.

### 3. Your own portfolio site with a blog (1 week)

- Next.js + MDX for the blog posts
- Deploy on Vercel
- Add a custom domain (§29.4)
- Put it behind Cloudflare (§29.5)

Real dev job requirement in 2026: a portfolio site of your own that lives at your own domain. Now is the time.

### 4. Add real-time notifications to BookMyRoom (2 weeks)

Owners see new booking requests appear instantly without refreshing. Introduces Socket.io / WebSockets. Bonus: guest sees the owner confirm the booking in real time.

### 5. Clone a service you love (1-2 months)

Pick a small app you use every day (a habit tracker, a recipe manager, a linktree). Rebuild it. You will hit a hundred practical problems the course could not anticipate -- perfect for the "learn on demand" phase.

---

## 29.15 Where to Keep Learning

Habits, not resources, decide who becomes a good developer over the next two years. The habit is: **build something small, read source code of a tool you use, and repeat.**

### Free, high-quality learning

- **MDN Web Docs** (developer.mozilla.org) -- the reference for anything HTML / CSS / JavaScript
- **The Odin Project** (theodinproject.com) -- free, from-scratch full-stack curriculum
- **freeCodeCamp** (freecodecamp.org) -- courses + exercises + a big YouTube channel
- **JavaScript.info** -- excellent, deep JavaScript tutorial for after the basics
- **TypeScript Handbook** (typescriptlang.org/docs) -- official, well-written
- **Josh W. Comeau's blog** (joshwcomeau.com) -- world-class CSS and React explanations

### Read code, not just tutorials

Once you can read code well, you can learn any framework in a few days. Read the source of `shadcn/ui`, `tanstack/query`, or the `express` router. It will feel intimidating at first -- persevere.

### Communities

- Stack Overflow -- for pointed questions (search first, most things are answered)
- Reddit -- r/webdev, r/reactjs, r/node
- Discord -- Reactiflux, TypeScript community
- Local meetups -- Kathmandu has an active JavaScript community

### YouTube channels worth subscribing to

- **Theo -- t3.gg** -- React / Next.js / TypeScript, fast-paced
- **Web Dev Simplified** -- explanations for slightly-past-beginner
- **ByteByteGo** -- system design and architecture

---

## Practice Exercises

None of these are "compulsory" -- pick the ones that excite you.

1. **Print the Git cheat sheet.** Stick it above your desk. Use nothing but the commands on it for a week.

2. **Buy a domain.** Pick a name you like, buy it on Namecheap or Cloudflare Registrar for a year. Point it at your deployed BookMyRoom or a placeholder page.

3. **Put your domain behind Cloudflare.** Move nameservers to Cloudflare, turn on HTTPS ("Always Use HTTPS"), enable caching.

4. **Add a GitHub Actions workflow** to BookMyRoom that runs `npm run build` on both apps on every push. Watch the green tick appear on your commits.

5. **Set up Sentry** in the frontend. Trigger a deliberate error (e.g. `throw new Error("test")` in a button handler) and confirm it appears in the Sentry dashboard.

6. **Write your first Vitest test** for `generateSignature` in `booking-backend/src/services/esewaService.ts` matching the eSewa docs example. Watch it pass.

7. **Wire Husky + lint-staged** so every commit runs ESLint and Prettier. Make a deliberately messy edit, commit, watch it be reformatted.

8. **Write a `Dockerfile`** for the booking-backend. Build the image (`docker build -t bookmyroom-backend .`) and run it (`docker run -p 4001:4001 bookmyroom-backend`). Confirm the health endpoint responds.

9. **Read one open-source repo.** Pick a small tool you use (e.g. `axios`, `zod`, `sonner`). Clone it. Open `src/index.ts`. Read every function. Do not try to understand everything -- just get a feel for how professional code is structured.

10. **Ship a tiny project.** Anything. Deploy it. Send the link to a friend.

---

## Key Takeaways

- **You are a full-stack developer now.** You built a real MERN application with authentication, payments, dashboards, emails, and deployment. That is more than 80% of "junior developer" job descriptions ask for.
- **The tool landscape is huge but map-able.** Git, GitHub, DNS, Cloudflare, AWS, Docker, CI/CD, secrets, monitoring, testing, code quality, gateways -- twelve areas, none of which need to be mastered right now, but all of which you should recognise the next time a colleague mentions them.
- **Depth in a few, awareness in many.** Nobody is expert in everything. Pick one or two topics that excite you and go deep; skim the rest.
- **The next skill to grow is not more frameworks -- it is more shipping.** Build small things, deploy them, watch them break, fix them. That loop is where you become a professional.
- **Read code. Ask questions. Get comfortable being confused.** The developers who improve fastest are the ones who admit "I don't know" often and go find out.

---

## And Finally

Every senior developer you have ever admired started exactly where you are now. They Googled "what is git", they broke production once or twice, they googled error messages, they read other people's code, they built silly little apps that got two users.

The difference between them and someone still learning after five years is not talent. It is a stubborn refusal to stop shipping.

Ship. Break things. Fix them. Ship again.

Welcome to the industry. **Go build something.**

# Cargo Truck Project

A reference build for the final year project track, following the lessons in
[`../project-lessons/`](../project-lessons/). **CargoTruck** connects shippers
who need cargo moved with transporters who own trucks.

Two roles:

| Role | Does |
|------|------|
| `shipper` | Posts cargo, books trucks |
| `transporter` | Lists trucks, accepts loads |

## Built So Far

| Lesson | What is in the repo |
|--------|--------------------|
| [01](../project-lessons/01-nextjs-and-shadcn-setup.md) | `webapp/` — Next.js + TypeScript + Tailwind + shadcn/ui |
| [01.2](../project-lessons/01.2-mongodb-atlas-setup.md) | MongoDB Atlas connection |
| [02](../project-lessons/02-backend-skeleton.md) | `backend/` — Express + TypeScript + Mongoose skeleton |
| [04](../project-lessons/04-auth-with-cookies.md) | Auth: register, login, `/me`, JWT in a cookie, protected routes |

Next up: the truck and booking modules.

## Structure

```
cargo-truck-project/
├── backend/                      Express API (port 4001)
│   └── src/
│       ├── config/database.ts
│       ├── models/User.ts
│       ├── validators/auth.validator.ts
│       ├── controllers/authController.ts
│       ├── middleware/
│       │   ├── auth.ts           requireAuth, requireRole
│       │   └── validate.ts       validateResult
│       ├── routes/authRoutes.ts
│       ├── types/express.d.ts
│       └── index.ts
└── webapp/                       Next.js frontend (port 3000)
    └── src/
        ├── app/
        │   ├── layout.tsx        root: <Providers>
        │   ├── page.tsx          /            public landing
        │   ├── providers.tsx     React Query + Toaster
        │   ├── (auth)/           login, register -- redirects if logged in
        │   └── (protected)/      dashboard -- redirects if NOT logged in
        ├── components/layout/navbar.tsx
        ├── hooks/useAuth.ts
        ├── lib/auth.ts           the only place the cookie is touched
        ├── schemas/authSchema.ts
        ├── services/             api.ts, authApi.ts
        └── types/user.ts
```

## Running It

You need **Node.js 20.19+**, and a MongoDB Atlas connection string
([lesson 01.2](../project-lessons/01.2-mongodb-atlas-setup.md)).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Value |
|----------|-------|
| `PORT` | `4001` |
| `MONGODB_URI` | Your Atlas string, **with a database name and no trailing slash** before the `?` |
| `CLIENT_URL` | `http://localhost:3000` — CORS is locked to this |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |

```bash
npm run dev          # http://localhost:4001
```

You should see `MongoDB connected successfully`. Check
<http://localhost:4001/api/health>.

### 2. Frontend

In a second terminal:

```bash
cd webapp
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` must be `http://localhost:4001/api` — including the
`/api`, and matching the backend's port.

### Other commands

```bash
npm run typecheck    # both projects
npm run build        # both projects
npm run lint         # webapp
```

## Trying the Auth

Register at <http://localhost:3000/register>, choosing either role, and you
land on the dashboard (transporter) or home (shipper).

Things worth poking at:

- **The token is a cookie, not `localStorage`.** DevTools → Application →
  Cookies. That is what lets `(protected)/layout.tsx` and the dashboard read it
  on the server.
- **Visit `/dashboard` logged out** → redirected to `/login`.
- **Visit `/login` logged in** → redirected to `/`.
- **Edit the `token` cookie to `rubbish` and reload `/dashboard`** → the page
  loads (a cookie exists) but the API refuses it, so you get "Session expired".
  The frontend guards are for user experience; `requireAuth` on the backend is
  the actual security.
- **View source on the dashboard** → your name is in the HTML, because it was
  fetched on the server.

### API

```http
### Register
POST http://localhost:4001/api/auth/register
Content-Type: application/json

{
  "name": "Ram Bahadur",
  "email": "ram@example.com",
  "password": "secret123",
  "phone": "9800000000",
  "role": "transporter"
}

### Login
POST http://localhost:4001/api/auth/login
Content-Type: application/json

{ "email": "ram@example.com", "password": "secret123" }

### Current user
GET http://localhost:4001/api/auth/me
Authorization: Bearer PASTE_TOKEN_HERE
```

Successful responses are wrapped: `{ "data": { "user": {...}, "token": "..." } }`.
Errors are `{ "message": "..." }`, and validation failures add
`errors: [{ field, message }]`.

## Note for Students

This is a **reference build** — the answer key. Do not develop your own project
inside it. Copy it out first:

```bash
cp -R cargo-truck-project ~/Desktop/my-project
cd ~/Desktop/my-project
rm -rf backend/node_modules webapp/node_modules
```

Then `npm install` in each folder, create your own `.env` files, and
`git init` so your work has its own history.

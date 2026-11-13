# Full-stack to-do app

React + Node.js (Express) + PostgreSQL with Prisma, with user accounts and login.

- **Frontend:** React 18 with Vite
- **Backend:** Node.js and Express REST API
- **Database:** PostgreSQL, managed with Prisma ORM and migrations

## Features
Accounts: sign up and log in. Each user only sees and edits their own tasks.
Tasks with details: title, due date, priority (Low, Medium, High), and tag (Work, Dev, Design, Personal).
Workspace views: Inbox, Today, and Upcoming, plus Work, Personal, and Archive collections with live counts.
Productivity tools: progress bar, All/Active tabs, text filter, and sorting by priority or due date.
Notion-style UI: dark theme by default, light theme when your system prefers it, responsive layout.
Accessible: keyboard navigation, labelled controls, visible focus states.

## Requirements
Node.js 18 or newer, and a PostgreSQL database (Docker is the quickest way).

## Run it

**1. Start PostgreSQL**
```
docker compose up -d
```
No Docker? Install PostgreSQL locally, create a database, and put its connection string in `server/.env` in the next step.

**2. Start the API**
```
cd server
copy .env.example .env        (macOS/Linux: cp .env.example .env)
npm install
npx prisma migrate dev --name init
npm run dev
```
The API runs on http://localhost:4000.

Before starting it, open `server/.env` and set `JWT_SECRET` to a long random string. You can generate one with:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**3. Start the frontend** (new terminal)
```
cd client
npm install
npm run dev
```
Open http://localhost:5173.

## API

| Method | Route | Auth | What it does |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create an account (`email`, `password`), returns a token |
| POST | `/api/auth/login` | No | Log in, returns a token |
| GET | `/api/auth/me` | Yes | Current user |
| GET | `/api/tasks` | Yes | List your tasks |
| POST | `/api/tasks` | Yes | Create a task (`{ "title": "..." }`) |
| PATCH | `/api/tasks/:id` | Yes | Update `done` and/or `title` |
| DELETE | `/api/tasks/:id` | Yes | Delete one of your tasks |
| DELETE | `/api/tasks/completed` | Yes | Delete all your completed tasks |
| GET | `/api/health` | No | Health check |

Protected routes expect the header `Authorization: Bearer <token>`.

## Security notes
- Passwords are never stored in plain text, only bcrypt hashes.
- Every task query is filtered by the logged-in user's id, so users can't read or change each other's tasks.
- The token is kept in `localStorage`, which is simple but readable by any script on the page. For a production app, an httpOnly cookie is the safer choice.
- Not included yet: rate limiting on login and email verification.

## Project structure
```
server/
  prisma/schema.prisma   data model
  src/index.js           Express API (auth + tasks)
client/
  src/App.jsx            login state, chooses which screen to show
  src/AuthForm.jsx       login and sign-up form
  src/Tasks.jsx          task list UI
  src/api.js             API calls and token handling
```

## Screenshot
Add a screenshot here.

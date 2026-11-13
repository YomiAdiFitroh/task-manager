import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET. Add it to server/.env (see .env.example).");
  process.exit(1);
}

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Lets async route handlers pass errors to the error middleware (Express 4).
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (user) => ({ id: user.id, email: user.email });
const signToken = (user) => jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

function readCredentials(body) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  return { email, password };
}

function cleanTitle(value) {
  if (typeof value !== "string") return null;
  const title = value.trim();
  return title.length > 0 && title.length <= 120 ? title : null;
}

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

// Returns { value } when valid, or { error } when not.
function readDueDate(input) {
  if (input === undefined || input === null || input === "") return { value: null };
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return { error: "Due date must look like 2026-12-31." };
  }
  const date = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input) {
    return { error: "Due date is not a real date." };
  }
  return { value: date };
}

function readPriority(input) {
  return PRIORITIES.includes(input) ? input : null;
}

const TAGS = ["WORK", "DEV", "DESIGN", "PERSONAL"];

function readTag(input) {
  return TAGS.includes(input) ? input : null;
}

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid task id." });
    return null;
  }
  return id;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Please log in." });

  try {
    req.userId = jwt.verify(token, JWT_SECRET).userId;
    next();
  } catch (err) {
    res.status(401).json({ error: "Your session expired. Please log in again." });
  }
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ---------- auth ----------
app.post("/api/auth/register", wrap(async (req, res) => {
  const { email, password } = readCredentials(req.body);
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  // bcrypt only uses the first 72 bytes, so cap the length.
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: "Password must be 8 to 72 characters." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, passwordHash } });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

app.post("/api/auth/login", wrap(async (req, res) => {
  const { email, password } = readCredentials(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user && (await bcrypt.compare(password, user.passwordHash));

  // Same message for unknown email and wrong password, so emails can't be probed.
  if (!valid) return res.status(401).json({ error: "Incorrect email or password." });
  res.json({ token: signToken(user), user: publicUser(user) });
}));

app.get("/api/auth/me", requireAuth, wrap(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(401).json({ error: "Please log in." });
  res.json(publicUser(user));
}));

// ---------- tasks (every route is limited to the logged-in user) ----------
app.use("/api/tasks", requireAuth);

app.get("/api/tasks", wrap(async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "asc" },
  });
  res.json(tasks);
}));

app.post("/api/tasks", wrap(async (req, res) => {
  const title = cleanTitle(req.body.title);
  if (!title) {
    return res.status(400).json({ error: "Title is required (max 120 characters)." });
  }

  const due = readDueDate(req.body.dueDate);
  if (due.error) return res.status(400).json({ error: due.error });

  let priority = "MEDIUM";
  if (req.body.priority !== undefined) {
    priority = readPriority(req.body.priority);
    if (!priority) {
      return res.status(400).json({ error: "Priority must be LOW, MEDIUM, or HIGH." });
    }
  }

  let tag = "WORK";
  if (req.body.tag !== undefined) {
    tag = readTag(req.body.tag);
    if (!tag) {
      return res.status(400).json({ error: "Tag must be WORK, DEV, DESIGN, or PERSONAL." });
    }
  }

  const task = await prisma.task.create({
    data: { title, dueDate: due.value, priority, tag, userId: req.userId },
  });
  res.status(201).json(task);
}));

// Must be registered before "/api/tasks/:id" so "completed" isn't read as an id.
app.delete("/api/tasks/completed", wrap(async (req, res) => {
  await prisma.task.deleteMany({ where: { done: true, userId: req.userId } });
  res.status(204).end();
}));

app.patch("/api/tasks/:id", wrap(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const data = {};
  if (req.body.done !== undefined) {
    if (typeof req.body.done !== "boolean") {
      return res.status(400).json({ error: "done must be true or false." });
    }
    data.done = req.body.done;
  }
  if (req.body.title !== undefined) {
    const title = cleanTitle(req.body.title);
    if (!title) {
      return res.status(400).json({ error: "Title is required (max 120 characters)." });
    }
    data.title = title;
  }
  if (req.body.dueDate !== undefined) {
    const due = readDueDate(req.body.dueDate);
    if (due.error) return res.status(400).json({ error: due.error });
    data.dueDate = due.value;
  }
  if (req.body.priority !== undefined) {
    const priority = readPriority(req.body.priority);
    if (!priority) {
      return res.status(400).json({ error: "Priority must be LOW, MEDIUM, or HIGH." });
    }
    data.priority = priority;
  }
  if (req.body.tag !== undefined) {
    const tag = readTag(req.body.tag);
    if (!tag) {
      return res.status(400).json({ error: "Tag must be WORK, DEV, DESIGN, or PERSONAL." });
    }
    data.tag = tag;
  }
  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: "Nothing to update." });
  }

  // Matching on userId too means you can't edit someone else's task.
  const result = await prisma.task.updateMany({ where: { id, userId: req.userId }, data });
  if (result.count === 0) return res.status(404).json({ error: "Task not found." });

  res.json(await prisma.task.findUnique({ where: { id } }));
}));

app.delete("/api/tasks/:id", wrap(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const result = await prisma.task.deleteMany({ where: { id, userId: req.userId } });
  if (result.count === 0) return res.status(404).json({ error: "Task not found." });
  res.status(204).end();
}));

app.use((err, _req, res, _next) => {
  if (err.code === "P2002") {
    return res.status(409).json({ error: "An account with that email already exists." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));

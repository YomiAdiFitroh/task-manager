import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import Sidebar from "./Sidebar.jsx";

const PRIORITY_LABEL = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };
const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const TAG_LABEL = { WORK: "Work", DEV: "Dev", DESIGN: "Design", PERSONAL: "Personal" };

const SORTS = ["default", "priority", "date"];
const SORT_LABEL = { default: "Default", priority: "Priority", date: "Due date" };

const PAGES = {
  all: { icon: "✅", title: "Tasks", subtitle: "Organize your daily priorities, deadlines, and sprint deliverables." },
  today: { icon: "🌞", title: "Today", subtitle: "Everything that is due today." },
  upcoming: { icon: "🗓️", title: "Upcoming", subtitle: "Tasks due today or later." },
  work: { icon: "💼", title: "Work", subtitle: "Tasks tagged Work." },
  personal: { icon: "🌿", title: "Personal", subtitle: "Tasks tagged Personal." },
  archive: { icon: "📦", title: "Archive", subtitle: "Completed tasks kept for your records." },
};

// "YYYY-MM-DD" in the user's local time, offset by a number of days.
function dateString(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

const dueOf = (task) => (task.dueDate ? task.dueDate.slice(0, 10) : null);

function formatDue(due) {
  if (!due) return { label: "No date", tone: "none" };
  if (due === dateString(0)) return { label: "Today", tone: "today" };
  if (due === dateString(1)) return { label: "Tomorrow", tone: "tomorrow" };
  if (due === dateString(-1)) return { label: "Yesterday", tone: "late" };
  const label = new Date(`${due}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return { label, tone: due < dateString(0) ? "late" : "later" };
}

function matchesPage(task, page, today) {
  const due = dueOf(task);
  switch (page) {
    case "today":
      return due === today;
    case "upcoming":
      return due !== null && due >= today;
    case "work":
      return task.tag === "WORK";
    case "personal":
      return task.tag === "PERSONAL";
    case "archive":
      return task.done;
    default:
      return true;
  }
}

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function TaskRow({ task, onToggle, onDelete }) {
  const due = formatDue(dueOf(task));
  return (
    <li className={"row" + (task.done ? " is-done" : "")}>
      <div className="row-title">
        <input
          type="checkbox"
          className="checkbox"
          checked={task.done}
          onChange={() => onToggle(task)}
          aria-label={`Mark “${task.title}” as done`}
        />
        <span className="row-text">{task.title}</span>
      </div>
      <span className={"badge tag-" + task.tag.toLowerCase()}>{TAG_LABEL[task.tag]}</span>
      <span className={"badge priority-" + task.priority.toLowerCase()}>
        {PRIORITY_LABEL[task.priority]}
      </span>
      <span className={"due due-" + due.tone}>
        {due.tone !== "none" && <CalendarIcon />}
        {due.label}
      </span>
      <button
        type="button"
        className="delete"
        onClick={() => onDelete(task.id)}
        aria-label={`Delete “${task.title}”`}
      >
        ✕
      </button>
    </li>
  );
}

export default function Tasks({ user, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(dateString(0));
  const [priority, setPriority] = useState("MEDIUM");
  const [tag, setTag] = useState("WORK");
  const titleRef = useRef(null);

  useEffect(() => {
    api.list()
      .then(setTasks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function run(action) {
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err.message);
    }
  }

  function addTask(event) {
    event.preventDefault();
    const text = title.trim();
    if (!text) {
      setError("Type a task before adding it.");
      titleRef.current?.focus();
      return;
    }
    run(async () => {
      const created = await api.create({ title: text, dueDate: dueDate || null, priority, tag });
      setTasks((prev) => [...prev, created]);
      setTitle("");
    });
  }

  const toggleTask = (task) =>
    run(async () => {
      const updated = await api.update(task.id, { done: !task.done });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    });

  const deleteTask = (id) =>
    run(async () => {
      await api.remove(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    });

  const today = dateString(0);

  // Sidebar counts: open tasks per view, and completed tasks for the archive.
  const counts = {};
  for (const key of Object.keys(PAGES)) {
    counts[key] = tasks.filter(
      (t) => (key === "archive" ? t.done : !t.done) && matchesPage(t, key, today)
    ).length;
  }

  const needle = query.trim().toLowerCase();
  const visible = tasks.filter(
    (t) =>
      matchesPage(t, page, today) &&
      (status === "all" || !t.done) &&
      t.title.toLowerCase().includes(needle)
  );
  if (sort === "priority") {
    visible.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  } else if (sort === "date") {
    visible.sort((a, b) => (dueOf(a) || "9999-99-99").localeCompare(dueOf(b) || "9999-99-99"));
  }

  const name = user.email.split("@")[0];
  const meta = PAGES[page];
  const doneCount = tasks.filter((t) => t.done).length;
  const openHigh = tasks.filter((t) => !t.done && t.priority === "HIGH").length;
  const openMedium = tasks.filter((t) => !t.done && t.priority === "MEDIUM").length;
  const percent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const remaining = counts.all;

  function cycleSort() {
    setSort(SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length]);
  }

  return (
    <div className="shell">
      <Sidebar user={user} page={page} counts={counts} onSelect={setPage} onLogout={onLogout} />

      <main className="content">
        <div className="topbar">
          <span>{name}’s Workspace / {meta.icon} {meta.title}</span>
          <span className="pill" aria-live="polite">
            {remaining === 1 ? "1 task left" : `${remaining} tasks left`}
          </span>
        </div>

        <div className="page">
          <div className="page-icon" aria-hidden="true">{meta.icon}</div>
          <h1 className="page-title">{meta.title}</h1>
          <p className="page-subtitle">{meta.subtitle}</p>

          <div className="progress">
            <span>{doneCount} of {tasks.length} completed</span>
            <div className="progress-bar" role="progressbar" aria-valuenow={percent}
              aria-valuemin="0" aria-valuemax="100" aria-label="Completed tasks">
              <div className="progress-fill" style={{ width: `${percent}%` }} />
            </div>
            {openHigh > 0 && <span><i className="dot dot-high" />{openHigh} High</span>}
            {openMedium > 0 && <span><i className="dot dot-medium" />{openMedium} Medium</span>}
          </div>

          <div className="toolbar">
            <div className="tabs" role="group" aria-label="Show tasks">
              {["all", "active"].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={"tab" + (status === s ? " is-active" : "")}
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                >
                  {s === "all" ? "All" : "Active"}
                </button>
              ))}
            </div>
            <div className="tools">
              <label htmlFor="search" className="visually-hidden">Filter tasks</label>
              <input
                id="search"
                className="search"
                placeholder="Filter tasks..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="button" className="tab" onClick={cycleSort}>
                ⇅ {SORT_LABEL[sort]}
              </button>
            </div>
          </div>

          <form className="quick-add" onSubmit={addTask} autoComplete="off">
            <label htmlFor="task-title" className="visually-hidden">New task</label>
            <input
              id="task-title"
              ref={titleRef}
              className="title-input"
              placeholder="What needs doing?"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
            />
            <label htmlFor="task-due" className="visually-hidden">Due date</label>
            <input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <label htmlFor="task-priority" className="visually-hidden">Priority</label>
            <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
            <label htmlFor="task-tag" className="visually-hidden">Tag</label>
            <select id="task-tag" value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="WORK">Work</option>
              <option value="DEV">Dev</option>
              <option value="DESIGN">Design</option>
              <option value="PERSONAL">Personal</option>
            </select>
            <button type="submit" className="add-button">Add</button>
          </form>
          {error && <p className="error" role="alert">{error}</p>}

          <div className="table">
            <div className="table-head" aria-hidden="true">
              <span>Task name</span>
              <span>Tag</span>
              <span>Priority</span>
              <span>Due date</span>
              <span />
            </div>

            {loading && <p className="empty">Loading tasks…</p>}

            <ul className="table-body">
              {visible.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
              ))}
            </ul>

            {!loading && visible.length === 0 && (
              <div className="empty">
                <p>No tasks match this view.</p>
                <p className="empty-sub">Add a task above or clear your filters.</p>
              </div>
            )}

            <button type="button" className="new-row" onClick={() => titleRef.current?.focus()}>
              + New task
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

const VIEWS = [
  { key: "all", label: "Tasks (Inbox)", icon: "✅" },
  { key: "today", label: "Today", icon: "🌞" },
  { key: "upcoming", label: "Upcoming", icon: "🗓️" },
];

const COLLECTIONS = [
  { key: "work", label: "Work", icon: "💼" },
  { key: "personal", label: "Personal", icon: "🌿" },
  { key: "archive", label: "Archive", icon: "📦" },
];

export default function Sidebar({ user, page, counts, onSelect, onLogout }) {
  const name = user.email.split("@")[0];
  const initial = name[0].toUpperCase();

  function renderItem(entry) {
    const active = page === entry.key;
    return (
      <button
        key={entry.key}
        type="button"
        className={"nav-item" + (active ? " is-active" : "")}
        aria-current={active ? "page" : undefined}
        onClick={() => onSelect(entry.key)}
      >
        <span className="nav-label">
          <span className="nav-icon" aria-hidden="true">{entry.icon}</span>
          {entry.label}
        </span>
        <span className="nav-count">{counts[entry.key]}</span>
      </button>
    );
  }

  return (
    <aside className="sidebar">
      <div className="workspace">
        <span className="workspace-logo" aria-hidden="true">{initial}</span>
        <span className="workspace-name">{name}’s Workspace</span>
      </div>

      <nav aria-label="Workspace">
        <p className="nav-heading">Workspace</p>
        {VIEWS.map(renderItem)}
        <p className="nav-heading">Collections</p>
        {COLLECTIONS.map(renderItem)}
      </nav>

      <div className="account">
        <span className="avatar" aria-hidden="true">{initial}</span>
        <span className="account-text">
          <span className="account-name">{name}</span>
          <span className="account-email">{user.email}</span>
        </span>
        <button type="button" className="link-button" onClick={onLogout}>
          Log out
        </button>
      </div>
    </aside>
  );
}

import React, { useState, useMemo } from 'react';
import ProjectGroup from './ProjectGroup.jsx';
import ChatListItem from './ChatListItem.jsx';

export default function ChatSidebar({
  projects,
  conversations,
  activeId,
  collapsed,
  onToggleCollapsed,
  onSelect,
  onNewChat,
  onCreateProject,
  onDelete,
  width,
}) {
  const [collapsedProjects, setCollapsedProjects] = useState({});
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('');

  const byProject = useMemo(() => {
    const map = new Map(projects.map((p) => [p.id, []]));
    const loose = [];
    // Newest first, so the sidebar answers "what was I just doing".
    const sorted = [...conversations].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
    for (const c of sorted) {
      if (c.projectId && map.has(c.projectId)) map.get(c.projectId).push(c);
      else loose.push(c);
    }
    return { map, loose };
  }, [projects, conversations]);

  const toggleProject = (id) =>
    setCollapsedProjects((prev) => ({ ...prev, [id]: !prev[id] }));

  const submitProject = () => {
    const name = draftName.trim();
    if (name) onCreateProject(name);
    setDraftName('');
    setCreating(false);
  };

  if (collapsed) {
    return (
      <aside className="chat-side chat-side--collapsed">
        <button
          type="button"
          className="chat-side__expand"
          onClick={onToggleCollapsed}
          title="Show chats"
          aria-label="Show chats"
        >
          ☰
        </button>
      </aside>
    );
  }

  return (
    <aside className="chat-side" style={{ flexBasis: `${width}px` }}>
      <div className="chat-side__top">
        <button type="button" className="chat-side__new" onClick={() => onNewChat(null)}>
          + New chat
        </button>
        <button
          type="button"
          className="chat-side__collapse"
          onClick={onToggleCollapsed}
          title="Hide chats"
          aria-label="Hide chats"
        >
          ⟨
        </button>
      </div>

      <div className="chat-side__scroll">
        <div className="chat-side__section-head">
          <span>Projects</span>
          <button
            type="button"
            className="chat-side__section-add"
            onClick={() => setCreating(true)}
            title="New project"
            aria-label="New project"
          >
            +
          </button>
        </div>

        {creating && (
          <input
            className="chat-side__project-input"
            autoFocus
            placeholder="Project name"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={submitProject}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitProject();
              if (e.key === 'Escape') { setDraftName(''); setCreating(false); }
            }}
          />
        )}

        {projects.length === 0 && !creating && (
          <p className="chat-side__empty-group">No projects yet</p>
        )}

        {projects.map((p) => (
          <ProjectGroup
            key={p.id}
            project={p}
            conversations={byProject.map.get(p.id) ?? []}
            collapsed={!!collapsedProjects[p.id]}
            activeId={activeId}
            onToggle={toggleProject}
            onSelect={onSelect}
            onNewChat={onNewChat}
            onDelete={onDelete}
          />
        ))}

        {/* Loose chats are the norm, not an edge case -- most conversations
            never get filed anywhere. */}
        <div className="chat-side__section-head chat-side__section-head--plain">
          <span>Recent</span>
        </div>
        <div className="chat-side__items">
          {byProject.loose.length === 0 ? (
            <p className="chat-side__empty-group">Nothing unfiled</p>
          ) : (
            byProject.loose.map((c) => (
              <ChatListItem
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

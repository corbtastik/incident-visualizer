import React, { useRef, useEffect, useState, useCallback } from 'react';

import { useChatStream } from '../hooks/useChatStream.js';

import MessageList from '../components/chat/MessageList.jsx';
import Composer from '../components/chat/Composer.jsx';
import ProviderSelector from '../components/chat/ProviderSelector.jsx';
import ChatSidebar from '../components/chat/ChatSidebar.jsx';
import SidebarResizer, {
  SIDEBAR_DEFAULT,
  clampSidebarWidth,
} from '../components/chat/SidebarResizer.jsx';
import { DEFAULT_PROVIDER } from '../components/chat/providers.js';
import { SAMPLE_PROJECTS, SAMPLE_CONVERSATIONS } from '../components/chat/conversations.js';

// Phase 1 is the shell: layout, styling and scroll behaviour, driven by a
// static transcript. The streaming hook replaces this in phase 2, so the
// shape here is the shape the real messages will have -- one retrieval entry
// and one assistant turn per exchange, never merged into a single blob.
const SAMPLE_TRANSCRIPT = [
  {
    id: 'm1',
    role: 'user',
    text: 'What is going on with fiber in Dallas?',
  },
  {
    id: 'm2',
    role: 'assistant',
    provider: 'orbit',
    model: 'orbit-1',
    retrieval: {
      tool: 'search_incidents',
      mode: 'vector',
      index: 'narrative_autoembed_index',
      query: 'fiber cut Dallas',
      count: 12,
    },
    text:
      'There are 12 open fiber incidents in the Dallas area, and 9 of them ' +
      'share a root cause of third-party dig damage along the same plant ' +
      'segment. The earliest was reported 42 minutes ago; the rest followed ' +
      'within the next 15 minutes, which is consistent with a single ' +
      'upstream break rather than unrelated failures.',
    citations: [
      { id: 'c1', ticketRef: 'INC-48210', city: 'Dallas', category: 'infrastructure' },
      { id: 'c2', ticketRef: 'INC-48214', city: 'Dallas', category: 'infrastructure' },
      { id: 'c3', ticketRef: 'INC-48219', city: 'Irving', category: 'infrastructure' },
    ],
  },
];

const SAMPLE_FOLLOW_UP = [
  {
    id: 'm3',
    role: 'user',
    text: 'Ask Claude the same thing.',
  },
  {
    id: 'm4',
    role: 'assistant',
    provider: 'claude',
    model: 'claude-opus-5',
    retrieval: {
      tool: 'search_incidents',
      mode: 'hybrid',
      index: 'incident_events_lexical + narrative_autoembed_index',
      query: 'fiber Dallas cascading',
      count: 14,
    },
    text:
      'I see the same cluster, plus two earlier reports in Grand Prairie ' +
      'that look like the leading edge of it. The dig damage explanation ' +
      'holds: all 11 affected segments trace back to one conduit run, and ' +
      'the two Grand Prairie tickets were filed 6 minutes before the first ' +
      'Dallas one.',
    citations: [
      { id: 'c4', ticketRef: 'INC-48196', city: 'Grand Prairie', category: 'infrastructure' },
      { id: 'c5', ticketRef: 'INC-48201', city: 'Grand Prairie', category: 'infrastructure' },
    ],
  },
];

const EXAMPLE_PROMPTS = [
  'Which city has the most open incidents right now?',
  'Summarise the infrastructure incidents from the last hour',
  'Are any of these incidents related to each other?',
  'Show me incidents with photos attached',
];

// Remembered across reloads: a width you chose once should not be something
// you re-drag every session.
const WIDTH_KEY = 'incident.chat.sidebarWidth';

function readStoredWidth() {
  try {
    const raw = window.localStorage.getItem(WIDTH_KEY);
    return raw ? clampSidebarWidth(Number(raw)) : SIDEBAR_DEFAULT;
  } catch {
    return SIDEBAR_DEFAULT;
  }
}

let nextId = 1;
const newId = (prefix) => `${prefix}-new-${nextId++}`;

export default function ChatView() {
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [conversations, setConversations] = useState(SAMPLE_CONVERSATIONS);
  const [activeId, setActiveId] = useState('c-1');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(readStoredWidth);
  const [draft, setDraft] = useState('');
  // Switching provider changes what the *next* turn uses. The transcript is
  // deliberately untouched: a conversation that spans several models is the
  // interesting case, not an accident to guard against.
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const scrollRef = useRef(null);

  const { messages, isStreaming, error, send, stop, reset } = useChatStream({
    provider,
    initialMessages: [...SAMPLE_TRANSCRIPT, ...SAMPLE_FOLLOW_UP],
  });

  // Pinned while the reader is at the bottom; released the moment they scroll
  // away. Dragging someone back down mid-sentence is the worst thing a
  // streaming transcript can do.
  const [pinned, setPinned] = useState(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setPinned(distance < 48);
  }, []);

  const jumpToLatest = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setPinned(true);
  }, []);

  useEffect(() => {
    if (!pinned) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pinned]);

  const handleResize = (px) => {
    setSidebarWidth(px);
    try { window.localStorage.setItem(WIDTH_KEY, String(px)); } catch { /* private mode */ }
  };

  // Only the seeded conversation has a transcript. Selecting any other shows
  // an empty one, which is honest until conversations are actually stored.
  const handleSelect = (id) => {
    setActiveId(id);
    reset(id === 'c-1' ? [...SAMPLE_TRANSCRIPT, ...SAMPLE_FOLLOW_UP] : []);
    setPinned(true);
  };

  const handleNewChat = (projectId) => {
    const conversation = {
      id: newId('c'),
      title: 'New chat',
      projectId: projectId ?? null,
      updatedAt: new Date().toISOString(),
      provider,
      messageCount: 0,
    };
    setConversations((prev) => [conversation, ...prev]);
    setActiveId(conversation.id);
    reset([]);
    setDraft('');
    setPinned(true);
  };

  // Deleting the open conversation has to leave something selected, or the
  // view shows a transcript belonging to nothing.
  const handleDeleteChat = (id) => {
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (id === activeId) {
        const next = remaining[0] ?? null;
        setActiveId(next?.id ?? null);
        reset(next?.id === 'c-1' ? [...SAMPLE_TRANSCRIPT, ...SAMPLE_FOLLOW_UP] : []);
      }
      return remaining;
    });
  };

  const handleCreateProject = (name) => {
    setProjects((prev) => [...prev, { id: newId('p'), name }]);
  };

  const handleSubmit = (text) => {
    setDraft('');
    setPinned(true);
    send(text);

    // Keep the sidebar honest: a conversation's title and recency come from
    // what was actually said in it.
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              title: c.messageCount === 0 ? text.slice(0, 48) : c.title,
              updatedAt: new Date().toISOString(),
              messageCount: c.messageCount + 2,
              provider,
            }
          : c
      )
    );
  };

  return (
    <div className="chat-view">
      <ChatSidebar
        projects={projects}
        conversations={conversations}
        activeId={activeId}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        onSelect={handleSelect}
        onNewChat={handleNewChat}
        onCreateProject={handleCreateProject}
        onDelete={handleDeleteChat}
        width={sidebarWidth}
      />

      {!sidebarCollapsed && (
        <SidebarResizer
          width={sidebarWidth}
          onResize={handleResize}
          onReset={() => handleResize(SIDEBAR_DEFAULT)}
        />
      )}

      <div className="chat__main">
      <header className="chat__header">
        <div>
          <h1>Incident Assistant</h1>
          <p className="chat__subtitle">
            Ask about live incidents, repairs and media across the fleet
          </p>
        </div>
        <div className="chat__header-controls">
          <div className="chat__context" title="What the assistant can search">
            <span className="chat__context-dot" />
            incidents · fix events · media
          </div>
          <ProviderSelector value={provider} onChange={setProvider} />
        </div>
      </header>

      <div className="chat__transcript" ref={scrollRef} onScroll={handleScroll}>
        {messages.length === 0 ? (
          <div className="chat__empty">
            <h2>Ask about the incident data</h2>
            <p>Nobody knows what to ask a new chat box. Try one of these:</p>
            <ul className="chat__examples">
              {EXAMPLE_PROMPTS.map((p) => (
                <li key={p}>
                  <button type="button" onClick={() => setDraft(p)}>{p}</button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>

      {!pinned && messages.length > 0 && (
        <button type="button" className="chat__jump" onClick={jumpToLatest}>
          Jump to latest ↓
        </button>
      )}

      {error && (
        <div className="chat__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => send(messages.at(-2)?.text ?? '')}>
            Retry
          </button>
        </div>
      )}

      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={handleSubmit}
        disabled={isStreaming}
        streaming={isStreaming}
        onStop={stop}
      />
      </div>
    </div>
  );
}

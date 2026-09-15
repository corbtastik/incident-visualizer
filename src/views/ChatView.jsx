import React, { useRef, useEffect, useState } from 'react';

import MessageList from '../components/chat/MessageList.jsx';
import Composer from '../components/chat/Composer.jsx';
import ProviderSelector from '../components/chat/ProviderSelector.jsx';
import { DEFAULT_PROVIDER } from '../components/chat/providers.js';

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

export default function ChatView() {
  const [messages] = useState([...SAMPLE_TRANSCRIPT, ...SAMPLE_FOLLOW_UP]);
  const [draft, setDraft] = useState('');
  // Switching provider changes what the *next* turn uses. The transcript is
  // deliberately untouched: a conversation that spans several models is the
  // interesting case, not an accident to guard against.
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const scrollRef = useRef(null);

  // Pin to the newest turn on mount. Phase 2 makes this conditional on the
  // reader not having scrolled away mid-stream.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSubmit = (text) => {
    // Wired to the streaming hook in phase 2.
    console.info('[chat] submit (not yet wired):', { provider, text });
    setDraft('');
  };

  return (
    <div className="chat-view">
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

      <div className="chat__transcript" ref={scrollRef}>
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

      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={handleSubmit}
        disabled={false}
      />
    </div>
  );
}

// Sample sidebar data. The shape is the one persistence will use, so the
// components do not change when this stops being static:
//
//   project      { id, name }
//   conversation { id, title, projectId, updatedAt, provider, messageCount }
//
// projectId === null means the conversation is loose -- not in any project.
// That is a real state, not a placeholder: most chats never get filed.

export const SAMPLE_PROJECTS = [
  { id: 'p-dallas', name: 'Dallas fiber event' },
  { id: 'p-weekly', name: 'Weekly review' },
];

export const SAMPLE_CONVERSATIONS = [
  {
    id: 'c-1',
    title: 'Fiber incidents in Dallas',
    projectId: 'p-dallas',
    updatedAt: '2026-09-15T14:22:00Z',
    provider: 'claude',
    messageCount: 4,
  },
  {
    id: 'c-2',
    title: 'Which segments share a conduit run?',
    projectId: 'p-dallas',
    updatedAt: '2026-09-15T13:58:00Z',
    provider: 'orbit',
    messageCount: 6,
  },
  {
    id: 'c-3',
    title: 'Open incidents by category',
    projectId: 'p-weekly',
    updatedAt: '2026-09-14T09:10:00Z',
    provider: 'gemini',
    messageCount: 2,
  },
  {
    id: 'c-4',
    title: 'Repair crews dispatched today',
    projectId: null,
    updatedAt: '2026-09-15T11:04:00Z',
    provider: 'openai',
    messageCount: 3,
  },
  {
    id: 'c-5',
    title: 'Anything with photos attached?',
    projectId: null,
    updatedAt: '2026-09-13T16:45:00Z',
    provider: 'claude',
    messageCount: 8,
  },
];

// Short, relative, and stable enough to read at a glance. Absolute dates in a
// sidebar are noise; the only question being asked is "how recent".
export function relativeTime(iso, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.round((now - then) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

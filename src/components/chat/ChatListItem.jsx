import React, { useState } from 'react';
import { relativeTime } from './conversations.js';
import { providerLabel } from './providers.js';

// The row is a wrapper rather than a single button: a delete control cannot
// be nested inside the select button, and making the whole row a div with a
// click handler would lose keyboard and focus behaviour.
export default function ChatListItem({ conversation, active, onSelect, onDelete }) {
  const { id, title, updatedAt, provider } = conversation;
  const [confirming, setConfirming] = useState(false);

  // Two steps rather than one. A mis-click in a list is easy, and a deleted
  // conversation is not recoverable -- but a modal for this is far too heavy.
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (confirming) {
      onDelete(id);
    } else {
      setConfirming(true);
    }
  };

  return (
    <div
      className={`chat-side__row ${active ? 'chat-side__row--active' : ''} ${confirming ? 'chat-side__row--confirming' : ''}`}
      onMouseLeave={() => setConfirming(false)}
    >
      <button
        type="button"
        className="chat-side__item"
        onClick={() => onSelect(id)}
        title={`${title} · ${providerLabel(provider)}`}
      >
        <span className={`chat-side__dot chat-msg__provider-dot--${provider}`} />
        <span className="chat-side__item-title">
          {confirming ? 'Delete this chat?' : title}
        </span>
        {!confirming && <span className="chat-side__item-time">{relativeTime(updatedAt)}</span>}
      </button>

      <button
        type="button"
        className={`chat-side__delete ${confirming ? 'chat-side__delete--confirm' : ''}`}
        onClick={handleDeleteClick}
        title={confirming ? 'Confirm delete' : 'Delete chat'}
        aria-label={confirming ? `Confirm delete ${title}` : `Delete ${title}`}
      >
        {confirming ? '✓' : '✕'}
      </button>
    </div>
  );
}

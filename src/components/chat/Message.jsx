import React from 'react';
import RetrievalCard from './RetrievalCard.jsx';
import ResultChips from './ResultChips.jsx';

export default function Message({ message }) {
  const { role, text, retrieval, citations, streaming } = message;

  if (role === 'user') {
    return (
      <div className="chat-msg chat-msg--user">
        <div className="chat-msg__bubble">{text}</div>
      </div>
    );
  }

  return (
    <div className="chat-msg chat-msg--assistant">
      {/* Retrieval renders above the prose on purpose: seeing the lookup
          happen first is what distinguishes this from a chat box that
          guesses. */}
      {retrieval && <RetrievalCard retrieval={retrieval} />}

      <div className="chat-msg__text">
        {text}
        {streaming && <span className="chat-msg__caret" aria-hidden="true" />}
      </div>

      {citations?.length > 0 && <ResultChips citations={citations} />}
    </div>
  );
}

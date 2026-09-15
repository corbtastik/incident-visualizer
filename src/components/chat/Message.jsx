import React from 'react';
import RetrievalCard from './RetrievalCard.jsx';
import { providerLabel } from './providers.js';
import ResultChips from './ResultChips.jsx';

export default function Message({ message }) {
  const { role, text, retrieval, citations, streaming, provider, model, stopped, failed } = message;

  if (role === 'user') {
    return (
      <div className="chat-msg chat-msg--user">
        <div className="chat-msg__bubble">{text}</div>
      </div>
    );
  }

  return (
    <div className="chat-msg chat-msg--assistant">
      {/* Which model answered has to survive scrollback. Switching provider
          keeps the transcript, so a conversation can hold answers from
          several -- and comparing them is half the point. */}
      {provider && (
        <div className="chat-msg__provider">
          <span className={`chat-msg__provider-dot chat-msg__provider-dot--${provider}`} />
          {providerLabel(provider)}
          {model && <span className="chat-msg__model">{model}</span>}
        </div>
      )}

      {/* Retrieval renders above the prose on purpose: seeing the lookup
          happen first is what distinguishes this from a chat box that
          guesses. */}
      {retrieval && <RetrievalCard retrieval={retrieval} />}

      <div className="chat-msg__text">
        {text}
        {streaming && <span className="chat-msg__caret" aria-hidden="true" />}
        {stopped && <span className="chat-msg__note">stopped</span>}
        {failed && <span className="chat-msg__note chat-msg__note--failed">incomplete</span>}
      </div>

      {citations?.length > 0 && <ResultChips citations={citations} />}
    </div>
  );
}

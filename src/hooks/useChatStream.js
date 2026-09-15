import { useState, useRef, useCallback } from 'react';
import { mockTransport } from '../components/chat/transports/mock.js';

let seq = 0;
const nextId = () => `m-${Date.now().toString(36)}-${seq++}`;

/**
 * The seam. Everything above this hook is provider-agnostic; this is the only
 * file that knows how a reply arrives.
 *
 * Swapping the mock for a real transport is a one-line change here, because
 * both yield the same event shapes.
 */
export function useChatStream({ provider, transport = mockTransport, initialMessages = [] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [isStreaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const patchLast = useCallback((patch) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const last = next[next.length - 1];
      next[next.length - 1] = typeof patch === 'function' ? patch(last) : { ...last, ...patch };
      return next;
    });
  }, []);

  const send = useCallback(async (text) => {
    if (isStreaming) return;
    setError(null);

    // Both turns are appended before the transport is touched. Waiting for the
    // server to confirm before showing what the user typed makes the UI feel
    // broken on a slow connection, and the placeholder is what the retrieval
    // card and the streaming caret attach to.
    const userTurn = { id: nextId(), role: 'user', text };
    const assistantTurn = {
      id: nextId(),
      role: 'assistant',
      provider,
      text: '',
      streaming: true,
    };
    setMessages((prev) => [...prev, userTurn, assistantTurn]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const event of transport({ prompt: text, provider, signal: controller.signal })) {
        switch (event.type) {
          case 'retrieval':
            patchLast({ retrieval: event.retrieval });
            break;
          case 'token':
            // Appended rather than replaced, so React re-renders one growing
            // string instead of rebuilding the turn on every token.
            patchLast((last) => ({ ...last, text: last.text + event.text }));
            break;
          case 'citations':
            patchLast({ citations: event.citations });
            break;
          case 'done':
            patchLast({ streaming: false, model: event.model });
            break;
          default:
            break;
        }
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        // Stopping is a choice, not a failure. The partial answer stays.
        patchLast({ streaming: false, stopped: true });
      } else {
        setError(err?.message ?? 'something went wrong');
        patchLast({ streaming: false, failed: true });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, provider, transport, patchLast]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback((next = []) => {
    abortRef.current?.abort();
    setMessages(next);
    setError(null);
  }, []);

  return { messages, isStreaming, error, send, stop, reset };
}

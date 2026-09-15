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

    // Accumulated locally as well as in state: the caller needs the finished
    // turns to persist them, and reading them back out of state after an
    // await would see whatever the closure captured, not the final value.
    let assistant = { ...assistantTurn };
    const track = (patch) => {
      assistant = typeof patch === 'function' ? patch(assistant) : { ...assistant, ...patch };
      patchLast(patch);
    };

    try {
      for await (const event of transport({ prompt: text, provider, signal: controller.signal })) {
        switch (event.type) {
          case 'retrieval':
            track({ retrieval: event.retrieval });
            break;
          case 'token':
            // Appended rather than replaced, so React re-renders one growing
            // string instead of rebuilding the turn on every token.
            track((last) => ({ ...last, text: last.text + event.text }));
            break;
          case 'citations':
            track({ citations: event.citations });
            break;
          case 'done':
            track({ streaming: false, model: event.model });
            break;
          default:
            break;
        }
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        // Stopping is a choice, not a failure. The partial answer stays.
        track({ streaming: false, stopped: true });
      } else {
        setError(err?.message ?? 'something went wrong');
        track({ streaming: false, failed: true });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }

    return { user: userTurn, assistant };
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

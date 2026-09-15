// A fake transport, so the whole chat UI can be finished before any provider
// exists.
//
// It is not only a stand-in. The states worth designing for -- a stream that
// stalls, one that dies halfway, a search that finds nothing -- are painful to
// trigger against a live model and embarrassing to discover on stage. Here
// they are one prompt away:
//
//   /error   fail mid-stream
//   /stall   emit nothing and hang until stopped
//   /empty   retrieve zero results
//   /slow    emit tokens at a crawl
//
// The contract is an async generator of events. A real transport reading SSE
// from the server yields the same shapes, so the hook above it never changes.

const TOKEN_MS = 18;

const REPLIES = {
  orbit:
    'Twelve fiber incidents are open around Dallas. Nine share a root cause ' +
    'of third-party dig damage on the same plant segment, and the timing ' +
    'fits a single upstream break rather than unrelated failures — the ' +
    'first was reported 42 minutes ago and the rest followed within fifteen.',
  claude:
    'I count twelve open fiber incidents in the Dallas area. Nine trace back ' +
    'to one conduit run, with dig damage recorded as the root cause. Two ' +
    'earlier tickets in Grand Prairie look like the leading edge of the same ' +
    'event — they were filed six minutes before the first Dallas report.',
  gemini:
    'There are 12 open fiber incidents near Dallas. The majority (9) are ' +
    'attributed to third-party dig damage affecting a shared plant segment. ' +
    'Reported times cluster within a 15-minute window, which is consistent ' +
    'with one upstream break.',
  openai:
    'Dallas currently has 12 open fiber incidents. Nine of them reference the ' +
    'same plant segment and a dig-damage root cause. Given they were all ' +
    'reported inside a quarter hour, they are almost certainly one event ' +
    'rather than twelve.',
};

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('aborted', 'AbortError'));
    }, { once: true });
  });

// Split so whitespace rides along with the word before it -- otherwise the
// rendered text reflows on every token and the whole paragraph jitters.
function tokenise(text) {
  return text.match(/\S+\s*/g) ?? [];
}

export async function* mockTransport({ prompt, provider, signal }) {
  const directive = (prompt.match(/\/(error|stall|empty|slow)\b/) ?? [])[1];
  const tokenMs = directive === 'slow' ? 140 : TOKEN_MS;

  if (directive === 'stall') {
    // Never resolves. Only `stop` ends this, which is the point.
    await sleep(10 * 60 * 1000, signal);
    return;
  }

  await sleep(420, signal);

  const count = directive === 'empty' ? 0 : 12;
  yield {
    type: 'retrieval',
    retrieval: {
      tool: 'search_incidents',
      mode: 'hybrid',
      index: 'incident_events_lexical + narrative_autoembed_index',
      query: prompt.replace(/\/\w+/g, '').trim().slice(0, 60),
      count,
    },
  };

  if (count === 0) {
    await sleep(300, signal);
    yield { type: 'token', text: 'I could not find any incidents matching that. ' };
    yield { type: 'token', text: 'Try a broader question, or a different city.' };
    yield { type: 'done', model: `${provider}-1` };
    return;
  }

  await sleep(260, signal);

  const tokens = tokenise(REPLIES[provider] ?? REPLIES.orbit);
  for (let i = 0; i < tokens.length; i++) {
    if (directive === 'error' && i === Math.floor(tokens.length / 3)) {
      throw new Error('the model stopped responding partway through');
    }
    await sleep(tokenMs, signal);
    yield { type: 'token', text: tokens[i] };
  }

  yield {
    type: 'citations',
    citations: [
      { id: 'c1', ticketRef: 'INC-48210', city: 'Dallas', category: 'infrastructure' },
      { id: 'c2', ticketRef: 'INC-48214', city: 'Dallas', category: 'infrastructure' },
      { id: 'c3', ticketRef: 'INC-48219', city: 'Irving', category: 'infrastructure' },
    ],
  };

  yield { type: 'done', model: `${provider}-1` };
}

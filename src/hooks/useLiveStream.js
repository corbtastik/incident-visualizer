import { useEffect, useRef, useState } from "react";

// normalize any cursor shape to a plain string
function cursorToString(cur) {
  if (!cur) return null;
  if (typeof cur === "string") return cur;
  if (typeof cur === "object") {
    if (typeof cur.toHexString === "function") return cur.toHexString(); // safety
    if (cur.$oid && typeof cur.$oid === "string") return cur.$oid;       // EJSON
    return String(cur); // last resort (should not happen with fixed server)
  }
  return String(cur);
}

export function useLiveStream({
  category = "infrastructure",
  intervalMs = 1000,
  cap = 10000,
}) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [status, setStatus] = useState("idle");
  const timerRef = useRef(null);
  const cursorRef = useRef(cursor);

  async function fetchOnce(currentCursorRaw) {
    setStatus("polling");

    const currentCursor = cursorToString(currentCursorRaw);
    const url = currentCursor
      ? `/live/${category}?after=${encodeURIComponent(currentCursor)}&limit=1000`
      : `/live/${category}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const nextCur = cursorToString(data.nextCursor ?? null);

    // Empty-init: collection has no docs yet
    if (!currentCursor && (nextCur == null || data.empty)) {
      setStatus("idle");
      return;
    }

    if (Array.isArray(data.items) && data.items.length) {
      setItems((prev) => {
        const merged = prev.concat(data.items);
        return merged.length > cap ? merged.slice(merged.length - cap) : merged;
      });
    }

    if (nextCur) {
      setCursor(nextCur);
      cursorRef.current = nextCur;
    }

    setStatus("idle");
  }

  useEffect(() => {
    // Reset when category changes
    setItems([]);
    setCursor(null);
    cursorRef.current = null;
    setStatus("idle");

    let stopped = false;

    (async () => {
      try {
        await fetchOnce(null);
      } catch {
        setStatus("error");
      }
      if (stopped) return;

      timerRef.current = setInterval(async () => {
        try {
          await fetchOnce(cursorRef.current);
        } catch {
          setStatus("error");
        }
      }, intervalMs);
    })();

    return () => {
      stopped = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [category, intervalMs]);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  return { items, status, cursor: cursorToString(cursor) };
}

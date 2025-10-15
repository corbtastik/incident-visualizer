// src/hooks/useCategoryFeed.js
import { useEffect, useRef, useState } from "react";

/**
 * Polls /debug/:category once to grab newestId as the starting cursor,
 * then tails /live/:category?after=<cursor> for new docs.
 *
 * Contract expected from server:
 *   GET /debug/:category -> { newestId }
 *   GET /live/:category?after=<ObjectId>&limit=<n> -> { docs, nextAfter }
 */
export function useCategoryFeed({ baseUrl, category, intervalMs = 2000, pageSize = 200 }) {
  const [status, setStatus] = useState("idle"); // "idle" | "ok" | "error"
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const [lastEvent, setLastEvent] = useState(null);

  const cursorRef = useRef(null);
  const timerRef = useRef(null);
  const abortRef = useRef(null);

  // pick the 5 fields desired for the “Last Event” card
  function toPreview(doc) {
    if (!doc) return null;
    return {
      _id: typeof doc._id === "string" ? doc._id : doc._id?.$oid || String(doc._id),
      city: doc.city,
      lat: doc.lat,
      lng: doc.lng,
      type: doc?.serviceIssue?.type
    };
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        setStatus("idle");
        setError(null);

        // 1) Get newestId so we don’t backfill the whole collection
        const debugRes = await fetch(`${baseUrl}/debug/${category}`);
        if (!debugRes.ok) throw new Error(`Debug ${category} failed: ${debugRes.status}`);
        const debugJson = await debugRes.json();
        cursorRef.current = debugJson?.newestId || null;

        // 2) Start polling loop
        loop();
      } catch (e) {
        if (!mounted) return;
        setStatus("error");
        setError(e?.message || String(e));
      }
    }

    async function loop() {
      // cleanup any prior request
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      timerRef.current = setTimeout(async () => {
        try {
          const params = new URLSearchParams();
          if (cursorRef.current) params.set("after", cursorRef.current);
          params.set("limit", String(pageSize));

          const res = await fetch(`${baseUrl}/live/${category}?` + params.toString(), {
            signal: ctrl.signal
          });
          if (!res.ok) throw new Error(`Live ${category} ${res.status}`);

          const json = await res.json();
          const docs = json?.docs || [];

          if (docs.length > 0) {
            const nextAfter = json?.nextAfter || (docs[docs.length - 1]?._id ?? cursorRef.current);
            cursorRef.current = nextAfter;

            setCount((c) => c + docs.length);
            setLastEvent(docs[docs.length - 1] || null);
            setStatus("ok");
          } else {
            // no new docs—still healthy but idle
            setStatus("idle");
          }
        } catch (e) {
          if (e?.name === "AbortError") return; // ignore on unmount/restart
          setStatus("error");
          setError(e?.message || String(e));
        } finally {
          // schedule next tick
          if (mounted) loop();
        }
      }, intervalMs);
    }

    bootstrap();

    return () => {
      mounted = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [baseUrl, category, intervalMs, pageSize]);

  return {
    status,       // "ok" | "idle" | "error"
    error,
    count,
    lastEventPreview: toPreview(lastEvent),
  };
}

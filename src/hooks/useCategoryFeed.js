// src/hooks/useCategoryFeed.js
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Client-only "fake resolutions" scaffolding
 * ------------------------------------------
 * When enabled, each incoming incident gets an expiry window and a prune loop
 * removes expired points. Now supports ALL categories (per-hook instance).
 */

// ---- Demo config (FLAG stays false by default; flip to true to activate) ----
const FAKE_RESOLUTIONS_ENABLED = true; // <--- TURN ON WHEN READY
const FAKE_RES_CATS = new Set([
  "business",
  "consumer",
  "emerging_tech",
  "federal",
  "infrastructure"
]);
const FAKE_RES_MIN_MS = 10_000;   // 10 seconds
const FAKE_RES_MAX_MS = 60_000;  // 1 minutes
const PRUNE_INTERVAL_MS = 2_000;  // prune cadence
const MAX_VISIBLE_TOTAL = 80_000; // safety cap

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
// ----------------------------------------------------------------------------

/**
 * Polls /debug/:category once to grab newestId as the starting cursor,
 * then tails /live/:category?after=<cursor> for new docs.
 *
 * Also accumulates a rolling `data` buffer (capped) so
 * map layers can render the same stream the Live Feeds panel uses.
 */
export function useCategoryFeed({
  baseUrl,
  category,
  intervalMs = 2000,
  pageSize = 200,
  cap = 8000
}) {
  const [status, setStatus] = useState("idle"); // "idle" | "ok" | "error"
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const [lastEvent, setLastEvent] = useState(null);
  const [data, setData] = useState([]); // rolling buffer for map layers

  const cursorRef = useRef(null);
  const timerRef = useRef(null);
  const abortRef = useRef(null);

  // Demo state per hook/category
  const demoEnabled = FAKE_RESOLUTIONS_ENABLED && FAKE_RES_CATS.has(category);
  const openMapRef   = useRef(new Map()); // Map<id, doc>
  const createdAtRef = useRef(new Map()); // Map<id, createdAtMs>
  const expiryAtRef  = useRef(new Map()); // Map<id, expiryAtMs>

  // Reset demo state when category/baseUrl changes
  useEffect(() => {
    openMapRef.current = new Map();
    createdAtRef.current = new Map();
    expiryAtRef.current = new Map();
  }, [category, baseUrl]);

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
        const debugRes = await fetch(`${baseUrl}/debug/${category}`, { cache: "no-store" });
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
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      timerRef.current = setTimeout(async () => {
        try {
          const params = new URLSearchParams();
          if (cursorRef.current) params.set("after", cursorRef.current);
          params.set("limit", String(pageSize));

          const res = await fetch(`${baseUrl}/live/${category}?` + params.toString(), {
            signal: ctrl.signal,
            cache: "no-store"
          });

          if (!res.ok) throw new Error(`Live ${category} ${res.status}`);

          // guard against proxies returning 304 with empty body
          const text = await res.text();
          const json = text ? JSON.parse(text) : { docs: [] };

          const docs = Array.isArray(json?.docs) ? json.docs : [];

          if (docs.length > 0) {
            const nextAfter = json?.nextAfter || (docs[docs.length - 1]?._id ?? cursorRef.current);
            cursorRef.current = nextAfter;

            // update Live Feeds counters
            setCount((c) => c + docs.length);
            setLastEvent(docs[docs.length - 1] || null);

            // Seed demo lifecycle maps
            if (demoEnabled) {
              const now = Date.now();
              for (const d of docs) {
                if (d?.type !== "incident") continue; // only expire incidents
                const id = typeof d._id === "string" ? d._id : d._id?.$oid || String(d._id);
                if (!id) continue;

                // Insert/overwrite in open map
                openMapRef.current.set(id, d);

                // Assign created/expiry if first time seeing this id
                if (!createdAtRef.current.has(id)) {
                  createdAtRef.current.set(id, now);
                }
                if (!expiryAtRef.current.has(id)) {
                  const ttl = randInt(FAKE_RES_MIN_MS, FAKE_RES_MAX_MS);
                  expiryAtRef.current.set(id, now + ttl);
                }
              }
            }

            // Append to rolling data buffer for layers (unchanged consumers)
            setData((prev) => {
              const merged = [...prev, ...docs];
              return merged.length > cap ? merged.slice(merged.length - cap) : merged;
            });

            setStatus("ok");
          } else {
            setStatus("idle");
          }
        } catch (e) {
          if (e?.name === "AbortError") return; // ignore on unmount/restart
          setStatus("error");
          setError(e?.message || String(e));
        } finally {
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
  }, [baseUrl, category, intervalMs, pageSize, cap, demoEnabled]);

  // Prune loop (no-op if flag off)
  useEffect(() => {
    if (!demoEnabled) return;

    const t = setInterval(() => {
      const now = Date.now();
      // expire by time
      for (const [id, exp] of expiryAtRef.current.entries()) {
        if (now >= exp) {
          openMapRef.current.delete(id);
          createdAtRef.current.delete(id);
          expiryAtRef.current.delete(id);
        }
      }
      // cap guard (delete soonest-to-expire first)
      if (openMapRef.current.size > MAX_VISIBLE_TOTAL) {
        const arr = Array.from(expiryAtRef.current.entries());
        arr.sort((a, b) => a[1] - b[1]);
        const excess = openMapRef.current.size - MAX_VISIBLE_TOTAL;
        for (let i = 0; i < excess && i < arr.length; i++) {
          const id = arr[i][0];
          openMapRef.current.delete(id);
          createdAtRef.current.delete(id);
          expiryAtRef.current.delete(id);
        }
      }
    }, PRUNE_INTERVAL_MS);

    return () => clearInterval(t);
  }, [demoEnabled]);

  // Diagnostics for optional UI
  const openCount = useMemo(() => openMapRef.current.size, [data, category, demoEnabled]);

  return {
    status,            // "ok" | "idle" | "error"
    error,
    count,
    lastEventPreview: toPreview(lastEvent),
    data,              // legacy consumers

    // Demo state for renderer/animation
    demo: {
      enabled: demoEnabled,
      openMapRef,
      createdAtRef,
      expiryAtRef,
      openCount
    }
  };
}

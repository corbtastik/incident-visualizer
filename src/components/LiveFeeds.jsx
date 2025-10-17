// src/components/LiveFeeds.jsx
import React from "react";
import { useCategoryFeed } from "../hooks/useCategoryFeed";

function Dot({ status }) {
  const color =
    status === "ok" ? "#16a34a" : // green
    status === "idle" ? "#f59e0b" : // yellow
    "#ef4444"; // red

  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "9999px",
        background: color,
        boxShadow: `0 0 8px ${color}`,
        marginRight: 8
      }}
    />
  );
}

function KV({ label, value }) {
  return (
    <div className="flex justify-between text-xs text-neutral-300">
      <span className="opacity-70">{label}</span>
      <span className="font-mono ml-2">{value ?? "—"}</span>
    </div>
  );
}

/** Single-pass JSON → HTML syntax highlighter (Synthwave '84 palette).
 *  Safe: escapes &, <, > before styling. No nested/empty spans.
 */
function highlightJSON(obj) {
  const json = JSON.stringify(obj ?? {}, null, 2)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Groups:
  // 1: key string (lookahead for colon)
  // 3: plain string value
  // 5: number
  // 8: boolean or null
  const tokenRE =
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(?=\s*:))|("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")|(-?\b\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)|\b(true|false|null)\b/g;

  return json.replace(tokenRE, (m, keyStr, _k2, strVal, _s2, numVal, kw) => {
    if (keyStr) return `<span class="token key">${keyStr}</span>`;
    if (strVal) return `<span class="token string">${strVal}</span>`;
    if (numVal) return `<span class="token number">${numVal}</span>`;
    if (kw === "true" || kw === "false")
      return `<span class="token boolean">${kw}</span>`;
    // null
    return `<span class="token null">${kw}</span>`;
  });
}

function LastEventCard({ title, doc }) {
  return (
    <div className="rounded-xl bg-black/30 border border-white/10 p-3 mt-2">
      <div className="text-xs uppercase tracking-wide opacity-70 mb-1">{title}</div>
      {doc ? (
        <pre
          className="text-[11px] leading-4 font-mono whitespace-pre-wrap break-words code synth84"
          // single-pass highlighted HTML
          dangerouslySetInnerHTML={{ __html: highlightJSON(doc) }}
        />
      ) : (
        <div className="text-xs opacity-60">No events yet.</div>
      )}
    </div>
  );
}

export default function LiveFeeds({ apiBase }) {
  const cats = [
    { key: "business",       label: "Business" },
    { key: "consumer",       label: "Consumer" },
    { key: "emerging_tech",  label: "Emerging Tech" },
    { key: "federal",        label: "Federal" },
    { key: "infrastructure", label: "Infrastructure" },
  ];

  const feeds = cats.map((c) => ({
    ...c,
    hook: useCategoryFeed({ baseUrl: apiBase, category: c.key, intervalMs: 2000, pageSize: 200 })
  }));

  return (
    <div
      className="fixed top-4 right-4 w-80 space-y-4"
      style={{ zIndex: 10 }}
    >
      <div className="rounded-2xl bg-neutral-900/80 backdrop-blur border border-white/10 shadow-lg p-4">
        <div className="text-sm font-semibold mb-2">Live Feeds</div>

        {feeds.map(({ key, label, hook }) => (
          <div key={key} className="mb-3 last:mb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Dot status={hook.status} />
                <span className="text-sm">{label}</span>
              </div>
              <div className="text-xs text-neutral-400">
                Size: <span className="font-mono text-neutral-200">{hook.count}</span>
              </div>
            </div>
            <LastEventCard title="Last Event" doc={hook.lastEventPreview} />
            {hook.status === "error" && (
              <div className="mt-1 text-[11px] text-red-400">
                {hook.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

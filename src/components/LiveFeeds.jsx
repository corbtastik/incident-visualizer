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

/** Single-pass JSON → HTML syntax highlighter (Synthwave '84 palette). */
function highlightJSON(obj) {
  const json = JSON.stringify(obj ?? {}, null, 2)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const tokenRE =
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(?=\s*:))|("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")|(-?\b\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)|\b(true|false|null)\b/g;

  return json.replace(tokenRE, (m, keyStr, _k2, strVal, _s2, numVal, kw) => {
    if (keyStr) return `<span class="token key">${keyStr}</span>`;
    if (strVal) return `<span class="token string">${strVal}</span>`;
    if (numVal) return `<span class="token number">${numVal}</span>`;
    if (kw === "true" || kw === "false")
      return `<span class="token boolean">${kw}</span>`;
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

  // Live-updating total count across all categories
  const totalCount = feeds.reduce((sum, f) => sum + (f.hook.count || 0), 0);

  return (
    <aside className="right-dock" style={{ zIndex: 10 }}>
      <div className="right-dock__panel">
        {/* Header */}
        <div className="cp-header">
          <div className="text-sm font-semibold">Live Feeds</div>
        </div>

        {/* Body (scrollable) */}
        <div className="cp-body">
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

        {/* Footer: Total incidents */}
        <div className="rf-footer">
          <div className="group-title flex items-baseline gap-2">
            <span>Total:</span>
            <span
              className="font-semibold"
              style={{ color: "#ef4444" /* same red as error state */ }}
            >
              {totalCount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

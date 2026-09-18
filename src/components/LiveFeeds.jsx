import React, { useMemo, useState } from "react";
import { useCategoryFeed } from "../hooks/useCategoryFeed";
import { CAT_COLOR } from "../layers/index.js";

// The colour comes from the theme rather than a literal, so the dot tracks
// the status tokens the rest of the app uses.
const DOT_TOKEN = { ok: "--success", idle: "--warning" };

function Dot({ status }) {
  return (
    <span
      className="feed-dot"
      style={{ color: `var(${DOT_TOKEN[status] ?? "--danger"})` }}
    />
  );
}

function highlightJSON(obj) {
  const json = JSON.stringify(obj ?? {}, null, 2)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const re =
    /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(?=\s*:))|("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")|(-?\b\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)|\b(true|false|null)\b/g;
  return json.replace(re, (m, key, _1, str, _2, num, kw) => {
    if (key) return `<span class="token key">${key}</span>`;
    if (str) return `<span class="token string">${str}</span>`;
    if (num) return `<span class="token number">${num}</span>`;
    if (kw === "true" || kw === "false") return `<span class="token boolean">${kw}</span>`;
    return `<span class="token null">${kw}</span>`;
  });
}

function LastEventCard({ title, doc }) {
  return (
    <div className="feed-card">
      <div className="feed-card__title">{title}</div>
      {doc ? (
        <pre
          className="code"
          dangerouslySetInnerHTML={{ __html: highlightJSON(doc) }}
        />
      ) : (
        <div className="feed-card__empty">No events yet.</div>
      )}
    </div>
  );
}

const rgb = (a) => `rgb(${a[0]}, ${a[1]}, ${a[2]})`;

// Donut (responsive to card width; fixed-position tooltip above-left of cursor)
function Donut({ parts }) {
  const [hover, setHover] = useState(null);

  // Logical canvas (SVG scales responsively)
  const VB_W = 300, VB_H = 220;
  const cx = VB_W / 2, cy = VB_H / 2 + 6;
  const r = 70, stroke = 38, C = 2 * Math.PI * r;

  const sum = Math.max(1, parts.reduce((s, p) => s + p.value, 0));
  let acc = 0;
  const segs = parts.map(p => {
    const pct = p.value / sum;
    const len = pct * C;
    const seg = { ...p, pct, dashArray: `${len} ${C - len}`, dashOffset: -acc };
    acc += len;
    return seg;
  });

  return (
    <div className="relative mx-auto" style={{ width: "100%", maxWidth: VB_W }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}
        />
        {segs.map(s => (
          <circle
            key={s.key}
            cx={cx} cy={cy} r={r}
            fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={s.dashArray} strokeDashoffset={s.dashOffset}
            strokeLinecap="butt" transform={`rotate(-90 ${cx} ${cy})`}
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) => {
              const { clientX, clientY } = e.nativeEvent;
              setHover({
                label: s.label,
                pct: Math.round(s.pct * 1000) / 10,
                clientX, clientY
              });
            }}
            onMouseMove={(e) => {
              const { clientX, clientY } = e.nativeEvent;
              setHover(h => h ? { ...h, clientX, clientY } : h);
            }}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <circle cx={cx} cy={cy} r={r - stroke / 2} fill="var(--panel)"/>
      </svg>

      {hover && (
        <div
          className="incident-tooltip"
          style={{
            position: "fixed",            // escape panel; no clipping
            left: hover.clientX,
            top: hover.clientY,
            transform: "translate(-100%, -100%)", // upper-left of cursor
            zIndex: 10000,                // above footer/header/etc.
            pointerEvents: "none"         // don't steal hover
          }}
        >
          <div className="incident-tooltip__title">{hover.label}</div>
          <div className="incident-tooltip__row">{hover.pct}%</div>
        </div>
      )}
    </div>
  );
}

function Chevron({ expanded }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      style={{
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.15s ease",
        opacity: 0.6
      }}
    >
      <path
        d="M4.5 2.5L8 6L4.5 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LiveFeeds({ apiBase }) {
  const cats = [
    { key: "business",       label: "Business",        color: rgb(CAT_COLOR.business) },
    { key: "consumer",       label: "Consumer",        color: rgb(CAT_COLOR.consumer) },
    { key: "emerging_tech",  label: "Emerging Tech",   color: rgb(CAT_COLOR.emerging_tech) },
    { key: "federal",        label: "Federal",         color: rgb(CAT_COLOR.federal) },
    { key: "infrastructure", label: "Infrastructure",  color: rgb(CAT_COLOR.infrastructure) },
  ];

  // Track which categories are expanded (all collapsed by default)
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const feeds = cats.map(c => ({
    ...c,
    hook: useCategoryFeed({ baseUrl: apiBase, category: c.key, intervalMs: 2000, pageSize: 200 })
  }));

  const total = feeds.reduce((s, f) => s + (f.hook.count || 0), 0);
  const totalRepairsStarted = feeds.reduce((s, f) => s + (f.hook.repairsStartedCount || 0), 0);
  const totalRepairsCompleted = feeds.reduce((s, f) => s + (f.hook.repairsCompletedCount || 0), 0);
  const pieParts = useMemo(
    () => feeds.map(f => ({ key: f.key, label: f.label, value: f.hook.count || 0, color: f.color })),
    [feeds]
  );

  return (
    <aside className="right-dock" style={{ zIndex: 10 }}>
      {/* 3-row grid: header • scroll area • footer */}
      <div className="right-dock__panel rf-grid-scroll">
        {/* Header (fixed) */}
        <div className="cp-header">
          <div className="cp-header__title">Live feeds</div>
        </div>

        {/* Scroll area: contains ALL feed cards + pie card, so they scroll together */}
        <div className="rf-scroll">
          {feeds.map(({ key, label, hook }) => (
            <div key={key} className="mb-3 last:mb-0">
              <div
                className="feed-row"
                onClick={() => toggleExpand(key)}
              >
                <div className="flex items-center gap-1">
                  <Chevron expanded={expanded[key]} />
                  <Dot status={hook.status} />
                  <span className="feed-row__label">{label}</span>
                </div>
                <div className="feed-row__meta">
                  Size: <span className="feed-row__count">{hook.count}</span>
                </div>
              </div>
              {expanded[key] && (
                <LastEventCard title="Last Event" doc={hook.lastEventPreview} />
              )}
              {hook.status === "error" && (
                <div className="feed-row__error">{hook.error}</div>
              )}
            </div>
          ))}

          {/* Pie card (same look as others, centered) */}
          <div className="feed-card feed-card--chart">
            <Donut parts={pieParts} />
          </div>
        </div>

        {/* Footer (fixed) */}
        <div className="rf-footer">
          <dl className="feed-stats">
            <div className="feed-stats__row">
              <dt>Repairs started</dt>
              <dd className="feed-stats__value feed-stats__value--pending">
                {totalRepairsStarted.toLocaleString()}
              </dd>
            </div>
            <div className="feed-stats__row">
              <dt>Repairs completed</dt>
              <dd className="feed-stats__value feed-stats__value--done">
                {totalRepairsCompleted.toLocaleString()}
              </dd>
            </div>
            <div className="feed-stats__row feed-stats__row--total">
              <dt>Total</dt>
              <dd className="feed-stats__value">
                {total.toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </aside>
  );
}

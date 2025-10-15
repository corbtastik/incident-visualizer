import React, { useMemo } from 'react';
import { CAT_COLOR } from '../layers'; // keep colors in sync with the map

/** Groups with stable keys so we can map colors per category */
const GROUPS = [
  { key: 'business',       name: 'Business',       items: ['b2b','enterprise','voip'] },
  { key: 'consumer',       name: 'Consumer',       items: ['broadband','fiber','5g','wifi-hotspot','wireless'] },
  { key: 'emerging_tech',  name: 'Emerging Tech',  items: ['iot','smart-city','satellite'] },
  { key: 'federal',        name: 'Federal',        items: ['public-safety','government','firstnet'] },
  { key: 'infrastructure', name: 'Infrastructure', items: ['construction','smartcell','backhaul','datacenter','cloud-network','edge'] }
];

function pretty(label) {
  const map = {
    'b2b':'B2B','voip':'VoIP','5g':'5g','iot':'IoT',
    'wifi-hotspot':'Wifi Hotspot','smart-city':'Smart City',
    'public-safety':'Public Safety','cloud-network':'Cloud Network',
    'smartcell':'Smartcell'
  };
  if (map[label]) return map[label];
  return label.replace(/\b\w/g, c => c.toUpperCase()).replace('-', ' ');
}

const Divider = () => (
  <div
    className="cp-divider"
    style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '12px 0' }}
  />
);

// Match Live Feeds indicator: 10x10 + subtle glow
function Dot({ rgba }) {
  const [r, g, b, a = 255] = rgba || [200,200,200,255];
  const alpha = Math.max(0, Math.min(1, a / 255));
  const bg = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  const ring = `rgba(${r}, ${g}, ${b}, ${Math.max(0.35, alpha)})`;
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10, height: 10, borderRadius: 9999,
        background: bg,
        boxShadow: `0 0 8px ${ring}`,
        marginLeft: 8, flex: '0 0 auto'
      }}
      aria-hidden
    />
  );
}

export default function ControlPanel({ state, setState }) {
  const { layer, radius, baseMap, colorRamp, types, categories } = state;

  const flatByOrder = useMemo(() => GROUPS.flatMap(g => g.items), []);
  const allCatsOn   = useMemo(() => GROUPS.every(g => categories[g.key]), [categories]);
  const anyCatsOn   = useMemo(() => GROUPS.some(g => categories[g.key]), [categories]);

  const toggleType = (t) => {
    const ns = new Set(types);
    ns.has(t) ? ns.delete(t) : ns.add(t);
    setState(s => ({ ...s, types: ns }));
  };

  const selectAllTypes = () => setState(s => ({ ...s, types: new Set(flatByOrder) }));
  const clearAllTypes  = () => setState(s => ({ ...s, types: new Set() }));

  const toggleCategory = (key) =>
    setState(s => ({ ...s, categories: { ...s.categories, [key]: !s.categories[key] }}));

  const setAllCategories = (on) =>
    setState(s => ({
      ...s,
      categories: GROUPS.reduce((acc, g) => (acc[g.key] = on, acc), {})
    }));

  return (
    <div className="left-dock">
      <div className="left-dock__panel">
        <div className="cp-header">
          <span>Incident Map Controls</span>
        </div>

        <div className="cp-body">
          {/* Top controls */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <label>
              <span>Layer</span>
              <select value={layer} onChange={e=>setState(s=>({...s, layer:e.target.value}))}>
                <option value="heatmap">Heatmap</option>
                <option value="scatter">Scatterplot</option>
              </select>
            </label>

            <label>
              <span>Radius</span>
              <input
                type="range"
                min={2}
                max={80}
                value={radius}
                onChange={e=>setState(s=>({...s, radius:Number(e.target.value)}))}
              />
            </label>

            <label>
              <span>Base Map</span>
              <select value={baseMap} onChange={e=>setState(s=>({...s, baseMap:e.target.value}))}>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>

            <label>
              <span>Color Ramp</span>
              <select value={colorRamp} onChange={e=>setState(s=>({...s, colorRamp:e.target.value}))}>
                <option value="cool">Cool</option>
                <option value="warm">Warm</option>
                <option value="inferno">Inferno</option>
              </select>
            </label>
          </div>

          <Divider />

          {/* Category master toggles */}
          <div className="section-title">Categories</div>
          <div className="checkbox-row" style={{ marginBottom:6 }}>
            <input
              type="checkbox"
              checked={allCatsOn}
              onChange={e => setAllCategories(e.target.checked)}
            />
            <strong>Show All Categories</strong>
          </div>

          <Divider />

          {/* Filters by type */}
          <div className="section-title">Filters</div>
          <div className="checkbox-row" style={{ marginBottom:6 }}>
            <input
              type="checkbox"
              checked={flatByOrder.every(t => types.has(t))}
              onChange={e => e.target.checked ? selectAllTypes() : clearAllTypes()}
            />
            <strong>Select All</strong>
          </div>

          {/* Group blocks with right-aligned color dots */}
          {GROUPS.map((group, idx) => (
            <div key={group.key} style={{ marginBottom:10 }}>
              <div
                className="group-title"
                style={{
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'space-between',
                  gap:8
                }}
              >
                {/* Left: checkbox + label */}
                <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input
                    type="checkbox"
                    checked={!!categories[group.key]}
                    onChange={() => toggleCategory(group.key)}
                  />
                  <span>{group.name}</span>
                </label>

                {/* Right: category color indicator */}
                <Dot rgba={CAT_COLOR[group.key]} />
              </div>

              <div style={{ display:'grid', gap:6, marginTop:6 }}>
                {group.items.map(t => (
                  <label key={t} className="checkbox-row">
                    <input type="checkbox" checked={types.has(t)} onChange={()=>toggleType(t)} />
                    <span>{pretty(t)}</span>
                  </label>
                ))}
              </div>

              {idx < GROUPS.length - 1 && <Divider />}
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}

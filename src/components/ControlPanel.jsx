import React, { useMemo } from 'react';

/** Ordered exactly like your mock */
const GROUPS = [
  { name: 'Business', items: ['b2b','enterprise','voip'] },
  { name: 'Consumer', items: ['broadband','fiber','5g','wifi-hotspot','wireless'] },
  { name: 'Emerging Tech', items: ['iot','smart-city','satellite'] },
  { name: 'Federal', items: ['public-safety','government','firstnet'] },
  { name: 'Infrastructure', items: ['construction','smartcell','backhaul','datacenter','cloud-network','edge'] }
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

export default function ControlPanel({ state, setState }) {
  const { layer, radius, baseMap, colorRamp, types } = state;
  const flatByOrder = useMemo(() => GROUPS.flatMap(g => g.items), []);

  const toggleType = (t) => {
    const ns = new Set(types);
    ns.has(t) ? ns.delete(t) : ns.add(t);
    setState(s => ({ ...s, types: ns }));
  };
  const selectAll = () => setState(s => ({ ...s, types: new Set(flatByOrder) }));
  const clearAll  = () => setState(s => ({ ...s, types: new Set() }));

  return (
    <div className="left-dock">
      <div className="left-dock__panel">
        <div className="cp-header">
          <span>Incident Map Controls</span>
          {/* collapse removed */}
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

          {/* Filters */}
          <div className="section-title" style={{ marginTop:14 }}>Filters</div>
          <div className="checkbox-row" style={{ marginBottom:6 }}>
            <input
              type="checkbox"
              checked={flatByOrder.every(t => types.has(t))}
              onChange={e => e.target.checked ? selectAll() : clearAll()}
            />
            <strong>Select All</strong>
          </div>

          {GROUPS.map(group => (
            <div key={group.name} style={{ marginBottom:10 }}>
              <div className="group-title">{group.name}</div>
              <div style={{ display:'grid', gap:6 }}>
                {group.items.map(t => (
                  <label key={t} className="checkbox-row">
                    <input type="checkbox" checked={types.has(t)} onChange={()=>toggleType(t)} />
                    <span>{pretty(t)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}

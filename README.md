# Incident Map Visualizer (Scaffold)

**Tech:** React (Vite), deck.gl, MapLibre, Tailwind, Recharts, Vitest

## Quick Start
```bash
npm i
cp .env.example .env
npm run dev
```

## If you saw errors in `/index.tsx` (Unexpected token / Missing semicolon)
You likely pasted multi-file content into a single TSX file or an editor auto-created `index.tsx`.
Use one of these fixes:

**A) Run the cleanup script**
```bash
bash scripts/cleanup.sh
```

**B) Or keep an index guard**: create a file `index.tsx` with exactly:
```ts
import './src/main.jsx';
```
(ONE line only — no comments or extra lines.)

## Tests
```bash
npm run test
```

## Data Contract
`GET ${VITE_INCIDENTS_URL}?types=wireless,fiber&windowSec=60&limit=200000`
```json
[{ "ts": 1730485400000, "lat": 32.78, "lng": -96.8, "weight": 1, "serviceIssue": { "type": "wireless", "issue": "slow-speeds" } }]
```

## Notes
- Color Ramp drives BOTH Heatmap gradient and Scatter colors.
- Each block lists a PATH; create that file and paste ONLY that block.
- If any file is accidentally pasted into `index.tsx`, delete it or replace it with the one-line guard above.

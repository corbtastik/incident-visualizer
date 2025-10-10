#!/usr/bin/env bash
set -euo pipefail
# Remove accidental TS/TSX entry files that cause parser errors
rm -f ./index.tsx ./index.ts ./src/index.tsx ./src/index.ts
# Ensure index.html points to the proper entry
sed -i.bak 's#/src/main.tsx#/src/main.jsx#g' index.html || true
# Re-create minimal src/main.jsx if missing
mkdir -p src
if [ ! -f src/main.jsx ]; then
  cat > src/main.jsx <<'JSX'
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
JSX
fi
chmod +x scripts/cleanup.sh

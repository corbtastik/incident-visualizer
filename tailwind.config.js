// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        // Base palette
        'app-bg': '#0A0C0E',
        'panel': '#14181C',
        'elevated': '#1B2127',
        'border': '#232A31',
        'text-primary': '#E8EDF2',
        'text-secondary': '#8A97A3',
        'text-muted': '#5A6672',
        'mdb-green': '#00ED64',
        // Category colors
        'cat-business': '#4F8FFF',
        'cat-consumer': '#00ED64',
        'cat-emerging': '#A78BFA',
        'cat-federal': '#F472B6',
        'cat-infra': '#FBBF24',
        // State colors (retrieval provenance)
        'state-lexical': '#94A3B8',
        'state-semantic': '#00ED64',
        'state-hybrid': '#22D3EE',
        'state-novel': '#FF6B4A',
        'state-systemic': '#FF3B6B',
      },
      borderRadius: {
        'panel': '6px',
      },
      fontSize: {
        'label': ['11px', { letterSpacing: '0.08em', lineHeight: '1.4' }],
      },
    },
  },
  plugins: [],
};

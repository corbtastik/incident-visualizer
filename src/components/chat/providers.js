// The providers the assistant can answer through. Kept as data rather than
// hardcoded into the selector so the transport layer and the UI agree on one
// list, and so a message carrying a provider id can always be labelled even
// if that provider is no longer selectable.
export const PROVIDERS = [
  { id: 'orbit',  label: 'OrbitAI', short: 'Orbit' },
  { id: 'claude', label: 'Claude',  short: 'Claude' },
  { id: 'gemini', label: 'Gemini',  short: 'Gemini' },
  { id: 'openai', label: 'OpenAI',  short: 'OpenAI' },
];

export const DEFAULT_PROVIDER = 'orbit';

export function providerLabel(id) {
  return PROVIDERS.find((p) => p.id === id)?.short ?? id ?? 'unknown';
}

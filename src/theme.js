export function useTheme() {
  const getSystemPref = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  const saved = localStorage.getItem('theme');
  const initial = saved || getSystemPref();

  let theme = initial;
  apply(theme);

  function apply(next) {
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    theme = next;
  }

  function toggle() {
    apply(theme === 'dark' ? 'light' : 'dark');
  }

  return { get theme() { return theme; }, toggle };
}

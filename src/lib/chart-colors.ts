export function getChartColor(index: number): string {
  const vars = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'];
  const el = typeof document !== 'undefined' ? document.documentElement : null;
  if (!el) return '#6366f1';
  return (
    getComputedStyle(el)
      .getPropertyValue(vars[index % vars.length])
      .trim() || '#6366f1'
  );
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toString();
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}s ${m}d`;
  if (m > 0) return `${m}d ${s}s`;
  return `${s}s`;
}

export function formatProgress(current: number, max: number): string {
  return `${formatNumber(current)} / ${formatNumber(max)}`;
}

export function formatPercent(ratio: number): string {
  return `%${Math.round(ratio * 100)}`;
}

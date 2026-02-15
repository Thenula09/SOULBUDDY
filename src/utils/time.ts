// Time utilities (timezone-aware) — prefer Intl but fall back to manual offset
export const COLOMBO_TZ = 'Asia/Colombo';

export function getColomboHour(dateInput?: string | Date): number {
  const d = dateInput ? (typeof dateInput === 'string' ? new Date(dateInput) : dateInput) : new Date();
  // Preferred: Intl
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: COLOMBO_TZ });
    const hourStr = fmt.format(d);
    const h = parseInt(hourStr, 10);
    if (!Number.isNaN(h)) return h;
  } catch {
    // fall through to manual
  }

  // Fallback: compute from UTC + 5.5 hours
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const colomboMs = utc + (5.5 * 60 * 60 * 1000);
  const colombo = new Date(colomboMs);
  return colombo.getHours();
}

export function getGreetingForHour(h: number): string {
  if (h < 6) return 'Good early morning';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Hello';
}

export function formatTimeInColombo(dateInput?: string | Date): string {
  const d = dateInput ? (typeof dateInput === 'string' ? new Date(dateInput) : dateInput) : new Date();
  try {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: COLOMBO_TZ }).format(d);
  } catch {
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const colomboMs = utc + (5.5 * 60 * 60 * 1000);
    const colombo = new Date(colomboMs);
    const hh = String(colombo.getHours()).padStart(2, '0');
    const mm = String(colombo.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}
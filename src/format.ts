const MINUS = '−';

export function money(n: number): string {
  const s = Math.abs(Math.round(n)).toLocaleString('en-US');
  return n < 0 ? MINUS + s : s;
}

export function signed(n: number): string {
  if (n === 0) return '0';
  return (n > 0 ? '+' : MINUS) + Math.abs(Math.round(n)).toLocaleString('en-US');
}

export function todayISO(): string {
  const d = new Date();
  return localISO(d);
}

export function localISO(d: Date): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function monthName(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function monthShort(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

export function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const today = todayISO();
  if (date === today) return 'Today';
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  if (date === localISO(yd)) return 'Yesterday';
  const sameYear = y === new Date().getFullYear();
  return `${DAYS[dt.getDay()]}, ${d} ${MONTHS[m - 1].slice(0, 3)}${sameYear ? '' : ' ' + y}`;
}

export function shortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const sameYear = y === new Date().getFullYear();
  return `${d} ${MONTHS[m - 1].slice(0, 3)}${sameYear ? '' : ' ' + String(y).slice(2)}`;
}

export function longToday(): string {
  const d = new Date();
  return `${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function noteKey(note: string): string {
  return note.replace(/\s+/g, ' ').trim().toLowerCase();
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

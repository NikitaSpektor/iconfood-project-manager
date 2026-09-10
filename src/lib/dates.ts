export const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export const MONTHS_NOM = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];

export function today() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function monthLead(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function parseDeadline(deadline: string, base = today()) {
  const parts = String(deadline).trim().split(' ');
  const day = Number(parts[0]);
  if (!day || parts.length < 2) return null;
  const month = MONTHS_GEN.indexOf(parts[1].toLowerCase());
  if (month < 0) return null;
  const year = parts[2] ? Number(parts[2]) : base.getFullYear();
  return new Date(year, month, day);
}

export function formatDeadline(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS_GEN[date.getMonth()]}`;
}

export function daysLeft(deadline: string, base = today()) {
  const due = parseDeadline(deadline, base);
  if (!due) return null;
  return Math.round((due.getTime() - base.getTime()) / 86400000);
}

export function deadlineLabel(deadline: string, base = today()) {
  const left = daysLeft(deadline, base);
  if (left === null) return deadline;
  if (left === 0) return 'сегодня';
  if (left === 1) return 'завтра';
  if (left === -1) return 'вчера';
  if (left < 0) return `просрочено на ${plural(-left)}`;
  if (left <= 7) return `через ${plural(left)}`;
  return deadline;
}

export function plural(days: number) {
  const n = Math.abs(days) % 100;
  const d = n % 10;
  if (n > 10 && n < 20) return `${Math.abs(days)} дней`;
  if (d === 1) return `${Math.abs(days)} день`;
  if (d > 1 && d < 5) return `${Math.abs(days)} дня`;
  return `${Math.abs(days)} дней`;
}

export function formatClock(date = new Date()) {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function formatFullDate(date = new Date()) {
  const weekday = date.toLocaleDateString('ru-RU', { weekday: 'long' });
  return `${weekday}, ${date.getDate()} ${MONTHS_GEN[date.getMonth()]} ${date.getFullYear()}`;
}

export function isoToday() {
  const d = today();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const DAY_START = 7 * 60;
export const DAY_END = 23 * 60;
export const SLOT = 30;

export const PLANNER_KINDS = [
  { id: 'work', label: 'Работа', dot: 'bg-bar', chip: 'bg-surface border-line text-foreground' },
  { id: 'training', label: 'Обучение', chip: 'bg-flag-soon/15 border-flag-soon/40 text-foreground', dot: 'bg-flag-soon' },
  { id: 'meeting', label: 'Встреча', chip: 'bg-flag-select/15 border-flag-select/40 text-foreground', dot: 'bg-flag-select' },
  { id: 'trip', label: 'Выезд', chip: 'bg-flag-hot/15 border-flag-hot/40 text-foreground', dot: 'bg-flag-hot' },
  { id: 'break', label: 'Перерыв', chip: 'bg-muted border-line text-muted-foreground', dot: 'bg-muted-foreground' },
];

export function kindOf(id: string) {
  return PLANNER_KINDS.find((k) => k.id === id) ?? PLANNER_KINDS[0];
}

export function minutesToTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeToMinutes(value: string) {
  const [h, m] = value.split(':').map((p) => parseInt(p, 10));
  if (Number.isNaN(h)) return DAY_START;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

export function durationLabel(start: number, end: number) {
  const total = Math.max(0, end - start);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h} ч ${m} мин`;
  if (h) return `${h} ч`;
  return `${m} мин`;
}

export function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function shiftDay(iso: string, days: number) {
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return isoDay(date);
}

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export function dayLabel(iso: string) {
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  const date = new Date(y, m - 1, d);
  return `${WEEKDAYS[date.getDay()]}, ${d} ${MONTHS[m - 1]}`;
}

export function shortDayLabel(iso: string) {
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  const date = new Date(y, m - 1, d);
  return `${WEEKDAYS[date.getDay()].slice(0, 2)} ${d}`;
}

export const HOURS = Array.from(
  { length: (DAY_END - DAY_START) / 60 },
  (_, i) => DAY_START + i * 60,
);

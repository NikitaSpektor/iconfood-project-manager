import { daysInMonth, parseDeadline, today } from '@/lib/dates';
import { unitsOf } from '@/lib/units';
import type { Task } from '@/data/workspace';

export type GanttRow = {
  name: string;
  left: number;
  width: number;
  color: string;
  count: number;
  hint: string;
};

function toneOf(daysToDue: number | null, allDone: boolean): string {
  if (allDone) return 'bg-bar';
  if (daysToDue === null) return 'bg-flag-done';
  if (daysToDue <= 3) return 'bg-flag-hot';
  if (daysToDue <= 10) return 'bg-flag-soon';
  return 'bg-flag-done';
}

export function overviewGantt(tasks: Task[], limit = 5): GanttRow[] {
  const now = today();
  const total = daysInMonth(now.getFullYear(), now.getMonth());
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), total);

  const shared = tasks.filter((t) => !t.personal);

  const group = (key: (t: Task) => string[]) => {
    const map = new Map<string, Task[]>();
    shared.forEach((t) =>
      key(t).forEach((name) => map.set(name, [...(map.get(name) ?? []), t])),
    );
    return map;
  };

  let byTrack = group((t) => [(t.track || 'Без направления').trim()]);
  if (byTrack.size < 2) {
    const byUnit = group((t) => {
      const list = unitsOf(t);
      return list.length ? list : ['Без подразделения'];
    });
    if (byUnit.size >= 2) byTrack = byUnit;
  }

  const rows: GanttRow[] = [];

  byTrack.forEach((list, name) => {
    const live = list.filter((t) => t.column !== 'done');
    const allDone = live.length === 0;
    const dates = list
      .map((t) => parseDeadline(t.deadline))
      .filter((d): d is Date => Boolean(d))
      .filter((d) => d >= start && d <= end);

    let left = 0;
    let width = 100;
    let nearest: number | null = null;

    if (dates.length) {
      const first = new Date(Math.min(...dates.map((d) => d.getTime())));
      const last = new Date(Math.max(...dates.map((d) => d.getTime())));
      left = ((first.getDate() - 1) / total) * 100;
      width = Math.max(((last.getDate() - first.getDate() + 1) / total) * 100, 6);
      const upcoming = live
        .map((t) => parseDeadline(t.deadline))
        .filter((d): d is Date => Boolean(d))
        .map((d) => Math.round((d.getTime() - now.getTime()) / 86400000));
      if (upcoming.length) nearest = Math.min(...upcoming);
    }

    const hint = allDone
      ? `${list.length} задач · всё закрыто`
      : `${live.length} в работе из ${list.length}`;

    rows.push({
      name,
      left: Math.min(left, 94),
      width: Math.min(width, 100 - Math.min(left, 94)),
      color: toneOf(nearest, allDone),
      count: list.length,
      hint,
    });
  });

  return rows
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function todayMark(): number {
  const now = today();
  const total = daysInMonth(now.getFullYear(), now.getMonth());
  return ((now.getDate() - 1) / total) * 100;
}

export default overviewGantt;
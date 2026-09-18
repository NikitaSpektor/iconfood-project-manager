import { daysLeft, plural } from '@/lib/dates';
import { unitsOf } from '@/lib/units';
import type { Task } from '@/data/workspace';

export type SummaryPart = { text: string; accent?: boolean };

function topUnit(list: Task[]): string {
  const count = new Map<string, number>();
  list.forEach((t) =>
    unitsOf(t).forEach((u) => count.set(u, (count.get(u) ?? 0) + 1)),
  );
  let best = '';
  let max = 0;
  count.forEach((n, unit) => {
    if (n > max) {
      max = n;
      best = unit;
    }
  });
  return best;
}

export function weeklySummary(tasks: Task[]): SummaryPart[] {
  const live = tasks.filter((t) => t.column !== 'done');
  if (live.length === 0) {
    return tasks.length
      ? [{ text: 'Все задачи закрыты — просроченных нет. Отличная неделя.' }]
      : [{ text: 'Задач пока нет. Создайте первую, и я соберу разбор недели.' }];
  }

  const overdue = live
    .map((t) => ({ task: t, left: daysLeft(t.deadline) }))
    .filter((x) => x.left !== null && x.left < 0)
    .sort((a, b) => (a.left as number) - (b.left as number));

  const soon = live.filter((t) => {
    const left = daysLeft(t.deadline);
    return left !== null && left >= 0 && left <= 3;
  });

  const done = tasks.filter((t) => t.column === 'done').length;

  if (overdue.length) {
    const worst = overdue[0];
    const late = -(worst.left as number);
    const unit = unitsOf(worst.task)[0] || 'холдинг';
    const parts: SummaryPart[] = [
      { text: '«' },
      { text: worst.task.title },
      { text: '» — ' },
      { text: `просрочка ${plural(late)}`, accent: true },
      { text: `, ${unit}.` },
    ];
    if (overdue.length > 1) {
      parts.push({ text: ` Всего просрочено задач: ${overdue.length}.` });
    }
    if (soon.length) {
      parts.push({ text: ` Ещё ${soon.length} со сроком на этой неделе.` });
    }
    return parts;
  }

  if (soon.length) {
    const unit = topUnit(soon);
    return [
      { text: 'Просроченных нет. На ближайшие дни — ' },
      { text: `${soon.length} задач`, accent: true },
      { text: unit ? `, больше всего у «${unit}».` : '.' },
      ...(done ? [{ text: ` Закрыто за период: ${done}.` }] : []),
    ];
  }

  return [
    { text: 'Всё идёт по графику: просрочек нет, в работе ' },
    { text: `${live.length} задач`, accent: true },
    { text: done ? `, закрыто ${done}.` : '.' },
  ];
}

export default weeklySummary;

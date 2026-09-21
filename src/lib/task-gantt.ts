import { daysInMonth, parseDeadline, today } from '@/lib/dates';
import type { Task } from '@/data/workspace';

export interface GanttBar {
  left: number;
  width: number;
}

export function taskBar(task: Task): GanttBar {
  const now = today();
  const year = now.getFullYear();
  const month = now.getMonth();
  const total = daysInMonth(year, month);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month, total);

  const due = parseDeadline(task.deadline);
  const created = task.createdAt ? new Date(task.createdAt) : null;

  const from = created && !Number.isNaN(created.getTime()) && created > monthStart
    ? created
    : monthStart;
  const to = due && due <= monthEnd ? due : due && due > monthEnd ? monthEnd : monthEnd;

  const startDay = from < monthStart ? 1 : from.getDate();
  const endDay = to.getDate();
  const span = Math.max(endDay - startDay + 1, 1);

  const left = ((startDay - 1) / total) * 100;
  const width = Math.min((span / total) * 100, 100 - left);
  return { left, width: Math.max(width, 3) };
}

export default taskBar;

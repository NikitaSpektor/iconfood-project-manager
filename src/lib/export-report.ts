import * as XLSX from 'xlsx';
import { columnLabels, priorityLabels, type Task } from '@/data/workspace';

interface SliceRow {
  name: string;
  done: number;
  total: number;
}

export function exportReport({
  tasks,
  sliceRows,
  sliceName,
  period,
  place,
  owner,
  metrics,
}: {
  tasks: Task[];
  sliceRows: SliceRow[];
  sliceName: string;
  period: string;
  place: string;
  owner: string;
  metrics: { label: string; value: string; delta: string }[];
}) {
  const book = XLSX.utils.book_new();

  const summary = [
    ['Отчёт ICONFOOD'],
    ['Период', period],
    ['Подразделение', place === 'all' ? 'Все подразделения' : place],
    ['Ответственный', owner === 'all' ? 'Все ответственные' : owner],
    ['Сформирован', new Date().toLocaleString('ru-RU')],
    [],
    ['Показатель', 'Значение', 'Комментарий'],
    ...metrics.map((m) => [m.label, m.value, m.delta]),
    [],
    [sliceName, 'Закрыто', 'Всего', 'Процент'],
    ...sliceRows.map((r) => [
      r.name,
      r.done,
      r.total,
      r.total ? Math.round((r.done / r.total) * 100) / 100 : 0,
    ]),
  ];
  const s1 = XLSX.utils.aoa_to_sheet(summary);
  s1['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(book, s1, 'Сводка');

  const rows = tasks.map((t) => ({
    'Задача': t.title,
    'Подразделение': t.restaurant,
    'Статус': columnLabels[t.column],
    'Приоритет': priorityLabels[t.priority],
    'Дедлайн': t.deadline,
    'Ответственный': t.assignee,
    'Шаблон': t.template ?? '',
    'Подзадач': t.subtasks.length,
    'Выполнено': t.subtasks.filter((s) => s.done).length,
  }));
  const s2 = XLSX.utils.json_to_sheet(rows);
  s2['!cols'] = [
    { wch: 46 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 22 }, { wch: 26 }, { wch: 10 }, { wch: 11 },
  ];
  XLSX.utils.book_append_sheet(book, s2, 'Задачи');

  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = place === 'all' ? 'холдинг' : place.toLowerCase().replace(/\s+/g, '-');
  XLSX.writeFile(book, `otchet-iconfood-${suffix}-${stamp}.xlsx`);
}

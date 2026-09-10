import { useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/hooks/use-workspace';
import {
  RESTAURANTS,
  columnLabels,
  deadlineTone,
  toneClasses,
  type ColumnId,
} from '@/data/workspace';
import { parseDeadline } from '@/lib/dates';
import { toast } from '@/hooks/use-toast';
import ScopeFilters, { useDefaultPlace, useScopeFilter } from './ScopeFilters';
import { exportReport } from '@/lib/export-report';

const periods = ['Неделя', 'Месяц', 'Квартал'];
const slices = ['По ресторанам', 'По колонкам', 'По важности'];

export default function ReportsView() {
  const { tasks } = useWorkspace();
  const [period, setPeriod] = useState('Месяц');
  const [slice, setSlice] = useState('По ресторанам');
  const [place, setPlace] = useState('all');
  const [owner, setOwner] = useState('all');
  useDefaultPlace(setPlace);

  const rows = useScopeFilter(tasks, place, owner);

  const metrics = useMemo(() => {
    const total = rows.length;
    const done = rows.filter((t) => t.column === 'done').length;
    const hot = rows.filter(
      (t) => t.column !== 'done' && deadlineTone(t.deadline, t.column) === 'hot',
    ).length;
    const steps = rows.reduce((sum, t) => sum + t.subtasks.length, 0);
    const stepsDone = rows.reduce((sum, t) => sum + t.subtasks.filter((x) => x.done).length, 0);
    return [
      { id: 'total', label: 'Задач в срезе', value: String(total), icon: 'ClipboardList', tone: 'soon' as const, delta: `${rows.filter((t) => t.column === 'progress').length} в работе` },
      { id: 'done', label: 'Закрыто', value: total ? `${Math.round((done / total) * 100)}%` : '0%', icon: 'CircleCheck', tone: 'done' as const, delta: `${done} из ${total}` },
      { id: 'hot', label: 'Горящих', value: String(hot), icon: 'Flame', tone: hot > 0 ? ('hot' as const) : ('done' as const), delta: hot > 0 ? 'нужен контроль' : 'сроки под контролем' },
      { id: 'steps', label: 'Подзадачи', value: steps ? `${Math.round((stepsDone / steps) * 100)}%` : '0%', icon: 'ListChecks', tone: 'soon' as const, delta: `${stepsDone} из ${steps} шагов` },
    ];
  }, [rows]);

  const sliceRows = useMemo(() => {
    if (slice === 'По колонкам') {
      return (['new', 'progress', 'done'] as ColumnId[]).map((c) => ({
        name: columnLabels[c],
        done: rows.filter((t) => t.column === c).length,
        total: rows.length,
      }));
    }
    if (slice === 'По важности') {
      const groups: [string, string[]][] = [
        ['Критичные', ['critical']],
        ['Срочные', ['high']],
        ['Обычные', ['normal', 'low']],
      ];
      return groups.map(([name, keys]) => ({
        name,
        done: rows.filter((t) => keys.includes(t.priority)).length,
        total: rows.length,
      }));
    }
    return RESTAURANTS.map((r) => {
      const list = rows.filter((t) => t.restaurant === r);
      return { name: r, done: list.filter((t) => t.column === 'done').length, total: list.length };
    }).filter((r) => r.total > 0);
  }, [slice, rows]);

  const load = useMemo(() => {
    const names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const counts = names.map(() => 0);
    rows.forEach((t) => {
      const due = parseDeadline(t.deadline);
      if (!due) return;
      counts[(due.getDay() + 6) % 7] += 1;
    });
    const max = Math.max(...counts, 1);
    return names.map((day, i) => ({ day, value: counts[i], pct: Math.round((counts[i] / max) * 100) }));
  }, [rows]);

  return (
    <div className="flex flex-col gap-3.5 flex-1 min-h-0 overflow-y-auto no-scrollbar">
      <section className="bento p-4 sm:p-5 flex flex-wrap items-center gap-3 flex-none animate-fade-in">
        <div className="mr-auto">
          <div className="font-head font-semibold text-[14px]">Динамические отчёты</div>
          <div className="text-[12px] text-muted-foreground">
            {rows.length} задач
            {place !== 'all' && ` · ${place}`}
            {owner !== 'all' && ` · ${owner}`}
          </div>
        </div>
        <ScopeFilters
          tasks={tasks}
          place={place}
          owner={owner}
          onPlace={setPlace}
          onOwner={setOwner}
        />
        <div className="flex items-center gap-1 rounded-full bg-card border border-line p-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors',
                period === p ? 'bg-surface text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          className="rounded-full h-9 gap-1.5 text-[13px] border-line"
          onClick={() => {
            if (rows.length === 0) {
              toast({ title: 'Нечего выгружать', description: 'В текущем срезе нет задач.' });
              return;
            }
            exportReport({
              tasks: rows,
              sliceRows,
              sliceName: slice,
              period,
              place,
              owner,
              metrics,
            });
            toast({
              title: 'Файл Excel скачан',
              description: `Срез «${slice}» за период «${period}» — ${rows.length} задач.`,
            });
          }}
        >
          <Icon name="Download" size={15} />
          Excel
        </Button>
      </section>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4 flex-none">
        {metrics.map((m, i) => (
          <section
            key={m.id}
            className="bento p-5 animate-fade-in"
            style={{ animationDelay: `${0.06 * i}s` }}
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow">{m.label}</span>
              <Icon name={m.icon} size={16} className={toneClasses[m.tone].text} />
            </div>
            <div className="mt-3 font-head text-[38px] font-bold leading-none tracking-tight">
              {m.value}
            </div>
            <div className={cn('mt-2 text-[12px]', toneClasses[m.tone].text)}>{m.delta}</div>
          </section>
        ))}
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[3fr_2fr] flex-1 min-h-0">
        <section className="bento p-5 sm:p-6 animate-fade-in [animation-delay:.2s]">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="eyebrow">
              <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
              Разрез отчёта
            </div>
            <div className="flex items-center gap-1 rounded-full bg-card border border-line p-1">
              {slices.map((s) => (
                <button
                  key={s}
                  onClick={() => setSlice(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors',
                    slice === s ? 'bg-surface text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {sliceRows.map((r) => {
              const pct = Math.round((r.done / Math.max(r.total, 1)) * 100);
              return (
                <div key={r.name}>
                  <div className="flex items-center justify-between text-[13px] mb-1.5">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground">
                      {r.done} из {r.total} · {pct}%
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </div>
        </section>

        <section className="bento p-5 sm:p-6 flex flex-col animate-fade-in [animation-delay:.26s]">
          <div className="eyebrow mb-4">
            <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
            Загрузка по дням
          </div>
          <div className="flex-1 flex items-end gap-2.5 min-h-[160px]">
            {load.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[11px] text-muted-foreground">{d.value}</span>
                <div
                  className={cn(
                    'w-full rounded-t-lg transition-all duration-500',
                    d.pct > 80 ? 'bg-flag-hot' : d.pct > 60 ? 'bg-flag-soon' : 'bg-bar',
                  )}
                  style={{ height: `${Math.max(d.pct, 3)}%` }}
                />
                <span className="text-[11px] text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 pt-3.5 border-t border-line text-[12px] text-muted-foreground">
            Дедлайны задач по дням недели в текущем срезе.
          </p>
        </section>
      </div>
    </div>
  );
}

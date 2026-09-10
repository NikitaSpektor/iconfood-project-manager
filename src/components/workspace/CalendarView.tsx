import { useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/hooks/use-workspace';
import { deadlineTone, toneClasses, type Task } from '@/data/workspace';
import TaskDialog from './TaskDialog';
import ScopeFilters, { useDefaultPlace, useScopeFilter } from './ScopeFilters';

const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
// 1 сентября 2026 — вторник => один пустой слот в начале
const LEAD = 1;
const DAYS = 30;
const TODAY = 9;

export default function CalendarView() {
  const { tasks } = useWorkspace();
  const [open, setOpen] = useState<Task | null>(null);
  const [place, setPlace] = useState('all');
  const [owner, setOwner] = useState('all');
  useDefaultPlace(setPlace);

  const rows = useScopeFilter(tasks, place, owner);

  const byDay = useMemo(() => {
    const map = new Map<number, Task[]>();
    rows.forEach((t) => {
      const d = Number(t.deadline.slice(0, 2));
      map.set(d, [...(map.get(d) ?? []), t]);
    });
    return map;
  }, [rows]);

  return (
    <div className="flex flex-col gap-3.5 flex-1 min-h-0">
      <section className="bento p-4 sm:p-5 flex flex-wrap items-center gap-3 animate-fade-in">
        <div className="mr-auto">
          <div className="font-head font-semibold text-[14px]">Календарь дедлайнов · сентябрь</div>
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
      </section>

      <section className="bento p-4 sm:p-6 flex-1 min-h-0 flex flex-col animate-fade-in [animation-delay:.1s]">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekdays.map((w) => (
            <div key={w} className="text-[11px] text-muted-foreground text-center font-medium">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 flex-1 min-h-0 overflow-y-auto no-scrollbar auto-rows-fr">
          {Array.from({ length: LEAD }).map((_, i) => (
            <div key={`lead-${i}`} />
          ))}
          {Array.from({ length: DAYS }, (_, i) => i + 1).map((day) => {
            const list = byDay.get(day) ?? [];
            const isToday = day === TODAY;
            return (
              <div
                key={day}
                className={cn(
                  'rounded-tile border p-2 min-h-[76px] flex flex-col gap-1 transition-colors',
                  isToday ? 'border-primary bg-primary/[0.04]' : 'border-line bg-card',
                )}
              >
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    isToday ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {day}
                </span>
                {list.slice(0, 2).map((t) => {
                  const tone = toneClasses[deadlineTone(t.deadline, t.column)];
                  return (
                    <button
                      key={t.id}
                      onClick={() => setOpen(t)}
                      className={cn(
                        'text-left text-[10px] leading-tight rounded-md px-1.5 py-1 truncate transition-opacity hover:opacity-75',
                        tone.soft,
                        tone.text,
                      )}
                      title={t.title}
                    >
                      {t.title}
                    </button>
                  );
                })}
                {list.length > 2 && (
                  <span className="text-[10px] text-muted-foreground px-1">
                    +{list.length - 2}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3.5 border-t border-line flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-[3px] bg-flag-hot" />до 14 сентября — горит
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-[3px] bg-flag-soon" />до 22 сентября — скоро
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-[3px] bg-flag-done" />запас есть или закрыта
          </span>
          <span className="flex items-center gap-1.5 ml-auto">
            <Icon name="MousePointerClick" size={13} />нажмите на стикер
          </span>
        </div>
      </section>

      <TaskDialog task={open} onClose={() => setOpen(null)} />
    </div>
  );
}

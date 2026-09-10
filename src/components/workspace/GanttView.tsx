import { useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/hooks/use-workspace';
import { deadlineTone, toneClasses, type Task } from '@/data/workspace';
import TaskDialog from './TaskDialog';
import ScopeFilters, { useDefaultPlace, useScopeFilter } from './ScopeFilters';

const days = Array.from({ length: 30 }, (_, i) => i + 1);
const TODAY = 9;

export default function GanttView() {
  const { tasks } = useWorkspace();
  const [open, setOpen] = useState<Task | null>(null);
  const [place, setPlace] = useState('all');
  const [owner, setOwner] = useState('all');
  useDefaultPlace(setPlace);

  const rows = useScopeFilter(tasks, place, owner);

  const tracks = useMemo(() => {
    const map = new Map<string, Task[]>();
    rows.forEach((t) => {
      map.set(t.track, [...(map.get(t.track) ?? []), t]);
    });
    return [...map.entries()];
  }, [rows]);

  return (
    <div className="flex flex-col gap-3.5 flex-1 min-h-0">
      <section className="bento p-4 sm:p-5 flex flex-wrap items-center gap-3 animate-fade-in">
        <div className="mr-auto">
          <div className="font-head font-semibold text-[14px]">Диаграмма Ганта · сентябрь 2026</div>
          <div className="text-[12px] text-muted-foreground">
            Красная линия — сегодня, {TODAY} сентября · {rows.length} задач
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
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-sm bg-flag-hot" />горит
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-sm bg-flag-soon" />скоро
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-sm bg-flag-done" />в порядке
          </span>
        </div>
      </section>

      <section className="bento p-4 sm:p-6 flex-1 min-h-0 flex flex-col overflow-hidden animate-fade-in [animation-delay:.1s]">
        <div className="grid grid-cols-[110px_1fr] gap-3 mb-3">
          <span />
          <div className="flex justify-between text-[10px] text-muted-foreground px-1">
            {days.filter((d) => d % 3 === 1).map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-5 pr-1">
          {tracks.map(([track, list]) => (
            <div key={track}>
              <div className="eyebrow mb-2.5">
                <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
                {track}
              </div>
              <div className="space-y-2">
                {list.map((t) => {
                  const tone = toneClasses[deadlineTone(t.deadline, t.column)];
                  return (
                    <div key={t.id} className="grid grid-cols-[110px_1fr] items-center gap-3">
                      <button
                        onClick={() => setOpen(t)}
                        className="text-[12px] text-muted-foreground truncate text-left hover:text-foreground transition-colors"
                        title={t.title}
                      >
                        {t.title}
                      </button>
                      <div className="h-4 rounded-md bg-card relative shadow-[inset_0_0_0_1px_hsl(var(--line))]">
                        <button
                          onClick={() => setOpen(t)}
                          className={cn(
                            'absolute inset-y-0 rounded-md transition-opacity hover:opacity-80',
                            t.column === 'done' ? 'bg-bar' : tone.dot,
                          )}
                          style={{ left: `${t.ganttStart}%`, width: `${t.ganttSpan}%` }}
                        />
                        <div
                          className="absolute -inset-y-1 w-[1.5px] bg-primary"
                          style={{ left: `${((TODAY - 1) / 30) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3.5 border-t border-line flex items-center gap-2 text-[12px] text-muted-foreground">
          <Icon name="Info" size={14} />
          Нажмите на полосу, чтобы открыть карточку задачи с подзадачами
        </div>
      </section>

      <TaskDialog task={open} onClose={() => setOpen(null)} />
    </div>
  );
}

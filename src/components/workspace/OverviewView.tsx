import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/hooks/use-workspace';
import {
  columnLabels,
  coverClasses,
  deadlineTone,
  toneClasses,
  type ColumnId,
  type Task,
} from '@/data/workspace';
import TaskDialog from './TaskDialog';
import type { ViewId } from './TopNav';

const ganttRows = [
  { name: 'Меню', left: 2, width: 46, color: 'bg-flag-hot' },
  { name: 'Персонал', left: 16, width: 52, color: 'bg-flag-soon' },
  { name: 'Оборудование', left: 0, width: 40, color: 'bg-flag-done' },
  { name: 'Маркетинг', left: 38, width: 44, color: 'bg-flag-select' },
  { name: 'Открытие', left: 74, width: 22, color: 'bg-bar' },
];

export default function OverviewView({ onGo }: { onGo: (v: ViewId) => void }) {
  const { tasks, user } = useWorkspace();
  const [open, setOpen] = useState<Task | null>(null);

  const firstName = user.name.split(' ')[0];
  const personal = tasks.filter((t) => t.personal).slice(0, 5);
  const columns: ColumnId[] = ['new', 'progress', 'done'];

  return (
    <>
      <div className="flex justify-end items-center gap-2 text-muted-foreground text-[13px] flex-none px-2 pb-2.5 animate-fade-in">
        <i className="border-l-[6px] border-l-bar border-y-4 border-y-transparent" />
        Смена 9 сентября, 30 участников
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[46fr_54fr] lg:grid-rows-[1.02fr_1fr] flex-1 min-h-0">
        {/* левая плашка */}
        <section className="bento p-6 sm:p-7 lg:row-span-2 flex flex-col overflow-hidden animate-fade-in">
          <h1 className="font-head text-[32px] sm:text-[40px] xl:text-[44px] font-bold leading-[1.08] tracking-[-0.025em]">
            {firstName} <span className="text-muted-foreground">ведёт</span>{' '}
            <span className="underline decoration-[3px] underline-offset-[6px]">{user.restaurant}</span>.
          </h1>

          <div className="h-px bg-line my-5" />

          <ul className="flex flex-col gap-4">
            {personal.map((t) => {
              const tone = deadlineTone(t.deadline, t.column);
              return (
                <li key={t.id} className="flex items-baseline gap-3">
                  <i
                    className={cn(
                      'h-[7px] w-[7px] rounded-[2px] flex-none relative -top-0.5',
                      toneClasses[tone].dot,
                    )}
                  />
                  <button
                    onClick={() => setOpen(t)}
                    className="text-left text-[15px] leading-[1.35] hover:text-primary transition-colors"
                  >
                    {t.title}.{' '}
                    <span className="text-muted-foreground">
                      {t.column === 'done' ? 'сдано' : `до ${t.deadline}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-auto pt-4 text-[12px] text-muted-foreground">
            <sup className="text-primary">*</sup> Личная доска. Общая доска холдинга — справа.
          </p>
        </section>

        {/* доска задач */}
        <section className="bento p-6 sm:p-7 overflow-hidden flex flex-col animate-fade-in [animation-delay:.13s]">
          <div className="eyebrow mb-4">
            <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
            Общая доска — 4 ресторана
          </div>

          <div className="grid grid-cols-3 gap-2.5 min-h-0 overflow-hidden">
            {columns.map((col) => {
              const list = tasks.filter((t) => t.column === col && !t.personal);
              return (
                <div key={col} className="min-w-0 flex flex-col min-h-0">
                  <div className="flex justify-between items-center text-[12px] text-muted-foreground mb-2 px-0.5">
                    <span>{columnLabels[col]}</span>
                    <span>{list.length}</span>
                  </div>
                  {list.slice(0, 2).map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => setOpen(t)}
                      className={cn(
                        'w-full text-left bg-card border rounded-tile p-2.5 mb-2 transition-all hover:-translate-y-0.5 hover:shadow-pill',
                        col === 'new' && i === 0 ? 'border-flag-select border-[1.5px]' : 'border-line',
                      )}
                    >
                      {t.cover !== 'none' && (
                        <div className={cn('h-[26px] rounded-lg mb-2.5', coverClasses[t.cover])} />
                      )}
                      <div className="text-[13px] font-medium leading-tight">{t.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-1.5">
                        {t.template
                          ? `Шаблон «${t.template}» · ${t.subtasks.length} подзадач`
                          : t.column === 'done'
                            ? `Закрыта ${t.deadline}`
                            : `${t.restaurant} · ${t.deadline}`}
                      </div>
                      {t.watchers.length > 0 && (
                        <div className="flex mt-2">
                          {t.watchers.slice(0, 3).map((w, k) => (
                            <span
                              key={w}
                              className="h-[17px] w-[17px] rounded-full bg-avatar border-2 border-card"
                              style={{ marginLeft: k === 0 ? 0 : -5 }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        {/* гант + ассистент */}
        <div className="grid gap-3.5 sm:grid-cols-2 min-h-0">
          <section className="bento p-6 sm:p-7 overflow-hidden animate-fade-in [animation-delay:.21s]">
            <div className="eyebrow mb-4">
              <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
              Гант · сентябрь
            </div>
            <div className="flex flex-col gap-2.5">
              {ganttRows.map((r) => (
                <div key={r.name} className="grid grid-cols-[76px_1fr] items-center gap-2.5">
                  <span className="text-[12px] text-muted-foreground truncate">{r.name}</span>
                  <div className="h-3 rounded-md bg-card relative shadow-[inset_0_0_0_1px_hsl(var(--line))]">
                    <i
                      className={cn('absolute inset-y-0 rounded-md block', r.color)}
                      style={{ left: `${r.left}%`, width: `${r.width}%` }}
                    />
                    <div className="absolute -inset-y-1 w-[1.5px] bg-primary" style={{ left: '41%' }} />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => onGo('gantt')}
              className="mt-4 text-[12px] text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              Открыть диаграмму <Icon name="ArrowUpRight" size={13} />
            </button>
          </section>

          <section className="bento p-6 sm:p-7 overflow-hidden animate-fade-in [animation-delay:.29s]">
            <div className="flex items-center gap-2.5">
              <div className="h-[30px] w-[30px] rounded-full bg-avatar flex-none flex items-center justify-center">
                <Icon name="Sparkles" size={15} className="text-foreground/70" />
              </div>
              <div>
                <div className="font-head font-semibold text-[14px] leading-tight">
                  Ассистент ICONFOOD
                </div>
                <div className="text-[12px] text-muted-foreground">разбор недели</div>
              </div>
            </div>
            <p className="mt-3.5 text-[15px] leading-[1.45]">
              Открытие Никольской идёт с опозданием на{' '}
              <b className="text-primary font-semibold">4 дня</b>: держат закупки. Задачи по
              персоналу закрываются вовремя.
            </p>
            <button
              onClick={() => onGo('ai')}
              className="mt-4 inline-flex items-center gap-2 bg-card border border-line rounded-full px-4 py-2.5 font-head font-semibold text-[13px] shadow-soft hover:bg-surface transition-colors"
            >
              Собрать отчёт <Icon name="ArrowUpRight" size={14} />
            </button>
          </section>
        </div>
      </div>

      <TaskDialog task={open} onClose={() => setOpen(null)} />
    </>
  );
}
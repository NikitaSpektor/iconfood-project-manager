import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/hooks/use-workspace';
import {
  RESTAURANTS,
  TEMPLATES,
  columnLabels,
  type ColumnId,
  type Task,
} from '@/data/workspace';
import TaskTile from './TaskTile';
import TaskDialog from './TaskDialog';
import NewTaskDialog from './NewTaskDialog';

const columns: ColumnId[] = ['new', 'progress', 'done'];

export default function BoardView({ personal }: { personal: boolean }) {
  const { tasks, moveTask, user } = useWorkspace();
  const [open, setOpen] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [preset, setPreset] = useState('none');
  const [query, setQuery] = useState('');
  const [place, setPlace] = useState('all');
  const [owner, setOwner] = useState('all');
  const [over, setOver] = useState<ColumnId | null>(null);

  const seesAll = user.role === 'owner';

  useEffect(() => {
    if (personal) return;
    setPlace(seesAll ? 'all' : user.restaurant || 'all');
  }, [personal, seesAll, user.restaurant]);

  const owners = useMemo(
    () =>
      Array.from(
        new Set(tasks.filter((t) => t.personal === personal).map((t) => t.assignee).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, 'ru')),
    [tasks, personal],
  );

  const scope = useMemo(
    () =>
      tasks
        .filter((t) => t.personal === personal)
        .filter((t) => place === 'all' || t.restaurant === place)
        .filter((t) => owner === 'all' || t.assignee === owner)
        .filter((t) => t.title.toLowerCase().includes(query.trim().toLowerCase())),
    [tasks, personal, place, owner, query],
  );

  const filtered = place !== 'all' || owner !== 'all' || query.trim() !== '';

  return (
    <div className="flex flex-col gap-3.5 flex-1 min-h-0">
      <section className="bento p-4 sm:p-5 flex flex-wrap items-center gap-3 animate-fade-in">
        <div className="flex items-center gap-2 mr-auto">
          <div className="h-9 w-9 rounded-xl bg-card border border-line flex items-center justify-center">
            <Icon name={personal ? 'UserRound' : 'Columns3'} size={16} />
          </div>
          <div>
            <div className="font-head font-semibold text-[14px] leading-tight">
              {personal ? 'Личная доска' : 'Общая доска холдинга'}
            </div>
            <div className="text-[12px] text-muted-foreground">
              {scope.length} задач
              {place !== 'all' && ` · ${place}`}
              {owner !== 'all' && ` · ${owner}`}
            </div>
          </div>
        </div>

        <div className="relative">
          <Icon
            name="Search"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск задачи"
            className="rounded-full h-9 pl-8 w-44 bg-card border-line text-[13px]"
          />
        </div>

        <Select value={place} onValueChange={setPlace}>
          <SelectTrigger className="w-[180px] h-9 rounded-full text-[12px] border-line bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl max-h-[320px]">
            <SelectItem value="all" className="text-[13px]">Все подразделения</SelectItem>
            {RESTAURANTS.map((r) => (
              <SelectItem key={r} value={r} className="text-[13px]">
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger className="w-[170px] h-9 rounded-full text-[12px] border-line bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl max-h-[320px]">
            <SelectItem value="all" className="text-[13px]">Все ответственные</SelectItem>
            {user.name && (
              <SelectItem value={user.name} className="text-[13px]">
                Мои задачи
              </SelectItem>
            )}
            {owners
              .filter((o) => o !== user.name)
              .map((o) => (
                <SelectItem key={o} value={o} className="text-[13px]">
                  {o}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {filtered && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setPlace('all');
              setOwner('all');
              setQuery('');
            }}
            className="rounded-full h-9 border-line text-[12px] gap-1.5"
          >
            <Icon name="X" size={14} />
            Сбросить
          </Button>
        )}

        <Button onClick={() => { setPreset('none'); setCreating(true); }} className="rounded-full h-9 gap-1.5 text-[13px]">
          <Icon name="Plus" size={15} />
          Задача
        </Button>
      </section>

      <div className="grid gap-3.5 md:grid-cols-3 flex-1 min-h-0">
        {columns.map((col, ci) => {
          const list = scope.filter((t) => t.column === col);
          return (
            <section
              key={col}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(col);
              }}
              onDragLeave={() => setOver((c) => (c === col ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (id) moveTask(id, col);
                setOver(null);
              }}
              className={cn(
                'bento p-4 sm:p-5 flex flex-col min-h-0 transition-colors animate-fade-in',
                over === col && 'border-flag-select bg-flag-select/5',
              )}
              style={{ animationDelay: `${ci * 0.07}s` }}
            >
              <div className="flex items-center justify-between mb-3.5">
                <div className="eyebrow">
                  <i
                    className={cn(
                      'h-2.5 w-2.5 rounded-[3px]',
                      col === 'new' ? 'bg-bar' : col === 'progress' ? 'bg-flag-soon' : 'bg-flag-done',
                    )}
                  />
                  {columnLabels[col]}
                </div>
                <span className="text-[12px] text-muted-foreground">{list.length}</span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5">
                {list.map((t) => (
                  <TaskTile key={t.id} task={t} onOpen={setOpen} selected={t.priority === 'critical'} />
                ))}
                {list.length === 0 && (
                  <div className="rounded-tile border border-dashed border-line py-8 text-center text-[12px] text-muted-foreground">
                    Пусто — перетащите задачу сюда
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="bento p-4 sm:p-5 flex-none animate-fade-in [animation-delay:.25s]">
        <div className="eyebrow mb-3">
          <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
          Шаблоны задач
        </div>
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-0.5">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => { setPreset(tpl.id); setCreating(true); }}
              className="flex-none w-56 text-left bg-card border border-line rounded-tile p-3.5 hover:-translate-y-0.5 hover:shadow-pill transition-all"
            >
              <Icon name={tpl.icon} size={17} className="mb-2 text-muted-foreground" />
              <div className="text-[13px] font-medium">{tpl.name}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {tpl.steps.length} подзадач · {tpl.hint}
              </div>
              {tpl.owner && (
                <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                  <Icon name="UserRound" size={11} />
                  {tpl.owner}
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      <TaskDialog task={open} onClose={() => setOpen(null)} />
      <NewTaskDialog open={creating} onOpenChange={setCreating} personal={personal} presetTemplate={preset} />
    </div>
  );
}

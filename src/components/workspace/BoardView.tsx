import { useCallback, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { assigneesOf } from '@/lib/assignees';
import { unitsOf } from '@/lib/units';
import { useWorkspace } from '@/hooks/use-workspace';
import {
  TEMPLATES,
  columnLabels,
  type ColumnId,
  type Task,
} from '@/data/workspace';
import TaskTile from './TaskTile';
import TaskDialog from './TaskDialog';
import NewTaskDialog from './NewTaskDialog';
import ScopeFilters, { ALL_MONTHS, monthKeyOf, monthLabel, useDefaultPlace } from './ScopeFilters';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const columns: ColumnId[] = ['new', 'progress', 'done'];

export default function BoardView({ personal }: { personal: boolean }) {
  const { tasks, moveTask, user } = useWorkspace();
  const [open, setOpen] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [preset, setPreset] = useState('none');
  const mayUseTemplates = user.role === 'owner' || user.role === 'manager';
  const [query, setQuery] = useState('');
  const [place, setPlace] = useState('all');
  const [owner, setOwner] = useState('all');
  const [month, setMonth] = useState(ALL_MONTHS);
  const [over, setOver] = useState<ColumnId | null>(null);

  useDefaultPlace(setPlace, personal);

  const isMine = useCallback(
    (t: Task) =>
      t.personal ||
      t.ownerLogin === user.login ||
      assigneesOf(t).includes(user.name) ||
      (t.watchers ?? []).includes(user.name),
    [user.login, user.name],
  );

  const mine = useMemo(
    () => (personal ? tasks.filter(isMine) : tasks.filter((t) => !t.personal)),
    [tasks, personal, isMine],
  );

  const fromHolding = useMemo(
    () => (personal ? mine.filter((t) => !t.personal).length : 0),
    [mine, personal],
  );

  const scope = useMemo(
    () =>
      mine
        .filter((t) => place === 'all' || unitsOf(t).includes(place))
        .filter((t) => owner === 'all' || assigneesOf(t).includes(owner))
        .filter((t) => month === ALL_MONTHS || monthKeyOf(t) === month)
        .filter((t) => t.title.toLowerCase().includes(query.trim().toLowerCase())),
    [mine, place, owner, month, query],
  );


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
              {personal && fromHolding > 0 && ` · ${fromHolding} с доски холдинга`}
              {place !== 'all' && ` · ${place}`}
              {owner !== 'all' && ` · ${owner}`}
              {month !== ALL_MONTHS && ` · ${monthLabel(month)}`}
            </div>
          </div>
        </div>

        <div className="relative flex-1 min-w-[150px] sm:flex-none">
          <Icon
            name="Search"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск задачи"
            className="rounded-full h-9 pl-8 w-full sm:w-44 bg-card border-line text-[13px]"
          />
        </div>

        <ScopeFilters
          tasks={mine}
          place={place}
          owner={owner}
          month={month}
          onPlace={setPlace}
          onOwner={setOwner}
          onMonth={setMonth}
        />

        {mayUseTemplates && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-full h-9 gap-1.5 text-[13px] flex-none">
                <Icon name="Plus" size={15} />
                Шаблон
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-tile">
              {TEMPLATES.map((tpl) => (
                <DropdownMenuItem
                  key={tpl.id}
                  onSelect={() => { setPreset(tpl.id); setCreating(true); }}
                  className="rounded-lg gap-2.5 py-2 cursor-pointer"
                >
                  <Icon name={tpl.icon} size={16} className="text-muted-foreground flex-none" />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium truncate">{tpl.name}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">
                      {tpl.steps.length} подзадач · {tpl.hint}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button onClick={() => { setPreset('none'); setCreating(true); }} className="rounded-full h-9 gap-1.5 text-[13px] flex-none">
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

              <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar pr-1.5">
                {list.map((t) => (
                  <TaskTile
                    key={t.id}
                    task={t}
                    onOpen={setOpen}
                    selected={t.priority === 'critical'}
                    shared={personal && !t.personal}
                  />
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

      <TaskDialog task={open} onClose={() => setOpen(null)} />
      <NewTaskDialog open={creating} onOpenChange={setCreating} personal={personal} presetTemplate={preset} />
    </div>
  );
}
import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/hooks/use-workspace';
import { fetchPlanner, plannerAction, type PlannerData, type PlannerEntry } from '@/lib/api';
import {
  DAY_END,
  DAY_START,
  HOURS,
  dayLabel,
  durationLabel,
  isoDay,
  kindOf,
  minutesToTime,
  shiftDay,
  shortDayLabel,
} from '@/lib/planner';
import PlannerDialog, { type PlannerDraft } from './PlannerDialog';

const PX_PER_MIN = 1.1;

export default function PlannerView() {
  const { user } = useWorkspace();
  const [day, setDay] = useState(isoDay(new Date()));
  const [data, setData] = useState<PlannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<PlannerDraft | null>(null);
  const [who, setWho] = useState('all');

  const load = useCallback(
    async (target: string) => {
      setLoading(true);
      try {
        setData(await fetchPlanner(target));
      } catch (e) {
        toast({
          title: (e as Error).message || 'Не удалось открыть планировщик',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(day);
  }, [day, load]);

  const people = data?.people ?? [];
  const dayEntries = useMemo(
    () => (data?.entries ?? []).filter((e) => e.day === day),
    [data, day],
  );

  const columns = useMemo(() => {
    const base = who === 'all' ? people : people.filter((p) => p.login === who);
    return base.map((p) => ({
      ...p,
      items: dayEntries
        .filter((e) => e.login === p.login)
        .sort((a, b) => a.start - b.start),
    }));
  }, [people, dayEntries, who]);

  const weekDays = useMemo(() => {
    if (!data) return [];
    return Array.from({ length: 7 }, (_, i) => shiftDay(data.weekStart, i));
  }, [data]);

  const busyByDay = useMemo(() => {
    const map = new Map<string, number>();
    (data?.entries ?? []).forEach((e) => map.set(e.day, (map.get(e.day) ?? 0) + 1));
    return map;
  }, [data]);

  const myTotal = useMemo(
    () =>
      dayEntries
        .filter((e) => e.login === user.login)
        .reduce((sum, e) => sum + (e.end - e.start), 0),
    [dayEntries, user.login],
  );

  const canEdit = data?.canEdit ?? false;
  const scope = data?.scope ?? 'self';
  const scopeLabel =
    scope === 'all'
      ? 'Планировщики холдинга'
      : scope === 'unit'
        ? `Подразделение · ${data?.unit || ''}`
        : 'Только мой день';
  const isToday = day === isoDay(new Date());

  function openSlot(start: number) {
    if (!canEdit) return;
    setDraft({ start, end: Math.min(start + 60, DAY_END), title: '', note: '', kind: 'work', place: '' });
  }

  function openEntry(entry: PlannerEntry) {
    const mine = entry.login === user.login;
    if (!mine) {
      toast({
        title: entry.title,
        description: `${entry.author} · ${minutesToTime(entry.start)}–${minutesToTime(entry.end)}${
          entry.note ? ` · ${entry.note}` : ''
        }`,
      });
      return;
    }
    setDraft({
      id: entry.id,
      start: entry.start,
      end: entry.end,
      title: entry.title,
      note: entry.note,
      kind: entry.kind,
      place: entry.place,
    });
  }

  async function saveDraft(value: PlannerDraft) {
    try {
      const next = await plannerAction({
        action: value.id ? 'update' : 'create',
        entryId: value.id,
        day,
        start: value.start,
        end: value.end,
        title: value.title,
        note: value.note,
        kind: value.kind,
        place: value.place,
      });
      setData(next);
      setDraft(null);
      toast({ title: value.id ? 'Запись обновлена' : 'Запись добавлена в день' });
    } catch (e) {
      toast({ title: (e as Error).message || 'Не удалось сохранить', variant: 'destructive' });
    }
  }

  async function removeEntry(entryId: string) {
    try {
      setData(await plannerAction({ action: 'delete', entryId, day }));
      setDraft(null);
      toast({ title: 'Запись удалена' });
    } catch (e) {
      toast({ title: (e as Error).message || 'Не удалось удалить', variant: 'destructive' });
    }
  }

  return (
    <div className="flex flex-col gap-3.5 flex-1 min-h-0">
      <section className="bento p-4 sm:p-5 flex flex-wrap items-center gap-3 animate-fade-in">
        <div className="mr-auto min-w-[200px]">
          <div className="font-head font-semibold text-[14px] capitalize">
            Мой планировщик · {dayLabel(day)}
          </div>
          <div className="text-[12px] text-muted-foreground">
            {scopeLabel}
            {` · ${dayEntries.length} записей`}
            {myTotal > 0 && ` · у вас занято ${durationLabel(0, myTotal)}`}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDay((d) => shiftDay(d, -1))}
            className="h-9 w-9 rounded-full border border-line bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Предыдущий день"
          >
            <Icon name="ChevronLeft" size={16} />
          </button>
          <button
            onClick={() => setDay(isoDay(new Date()))}
            className={cn(
              'h-9 px-4 rounded-full border text-[12px] font-medium transition-colors',
              isToday
                ? 'border-primary text-primary bg-primary/[0.06]'
                : 'border-line bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            Сегодня
          </button>
          <button
            onClick={() => setDay((d) => shiftDay(d, 1))}
            className="h-9 w-9 rounded-full border border-line bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Следующий день"
          >
            <Icon name="ChevronRight" size={16} />
          </button>
        </div>

        {canEdit && (
          <Button onClick={() => openSlot(9 * 60)} className="rounded-full h-9 px-4 gap-1.5 text-[12px]">
            <Icon name="Plus" size={14} />
            Добавить в день
          </Button>
        )}
      </section>

      <section className="bento p-3 sm:p-4 flex flex-wrap items-center gap-2 animate-fade-in [animation-delay:.05s]">
        {weekDays.map((d) => {
          const active = d === day;
          const count = busyByDay.get(d) ?? 0;
          return (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={cn(
                'h-9 px-3 rounded-full border text-[12px] font-medium transition-colors flex items-center gap-1.5 capitalize',
                active
                  ? 'border-flag-select bg-flag-select/10 text-foreground'
                  : 'border-line bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {shortDayLabel(d)}
              {count > 0 && (
                <span className="text-[10px] text-muted-foreground">{count}</span>
              )}
            </button>
          );
        })}

        {people.length > 1 && (
          <div className="ml-auto flex items-center gap-2">
            <select
              value={who}
              onChange={(e) => setWho(e.target.value)}
              className="h-9 rounded-full border border-line bg-card px-3 text-[12px] text-muted-foreground"
            >
              <option value="all">{scope === 'all' ? 'Весь холдинг' : 'Всё подразделение'}</option>
              {people.map((p) => (
                <option key={p.login} value={p.login}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="bento p-0 flex-1 min-h-0 flex flex-col animate-fade-in [animation-delay:.1s] overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground gap-2 text-sm">
            <Icon name="LoaderCircle" size={16} className="animate-spin" />
            Загружаю расписание…
          </div>
        ) : columns.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            На этот день записей пока нет
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto thin-scrollbar">
            <div className="flex min-w-max">
              <div className="w-14 flex-none sticky left-0 z-20 bg-card border-r border-line">
                <div className="h-12 border-b border-line" />
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{ height: 60 * PX_PER_MIN }}
                    className="text-[11px] text-muted-foreground text-right pr-2 pt-1 border-b border-line/60"
                  >
                    {minutesToTime(h)}
                  </div>
                ))}
              </div>

              {columns.map((col) => (
                <div key={col.login} className="w-[200px] sm:w-[230px] flex-none border-r border-line last:border-r-0">
                  <div className="h-12 border-b border-line px-3 flex flex-col justify-center sticky top-0 bg-card z-10">
                    <span className="text-[13px] font-medium truncate">
                      {col.name}
                      {col.login === user.login && (
                        <span className="text-[11px] text-muted-foreground"> · вы</span>
                      )}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {col.items.length ? `${col.items.length} записей` : 'день свободен'}
                    </span>
                  </div>

                  <div className="relative">
                    {HOURS.map((h) => (
                      <button
                        key={h}
                        onClick={() => col.login === user.login && openSlot(h)}
                        disabled={col.login !== user.login || !canEdit}
                        style={{ height: 60 * PX_PER_MIN }}
                        className={cn(
                          'w-full border-b border-line/60 transition-colors',
                          col.login === user.login && canEdit
                            ? 'hover:bg-surface cursor-pointer'
                            : 'cursor-default',
                        )}
                        aria-label={`Добавить на ${minutesToTime(h)}`}
                      />
                    ))}

                    {col.items.map((entry) => {
                      const kind = kindOf(entry.kind);
                      const top = (Math.max(entry.start, DAY_START) - DAY_START) * PX_PER_MIN;
                      const height = Math.max(
                        22,
                        (Math.min(entry.end, DAY_END) - Math.max(entry.start, DAY_START)) * PX_PER_MIN - 3,
                      );
                      return (
                        <button
                          key={entry.id}
                          onClick={() => openEntry(entry)}
                          style={{ top, height }}
                          className={cn(
                            'absolute left-1.5 right-1.5 rounded-tile border px-2 py-1 text-left overflow-hidden transition-opacity hover:opacity-80',
                            kind.chip,
                          )}
                          title={`${entry.title} · ${minutesToTime(entry.start)}–${minutesToTime(entry.end)}`}
                        >
                          <span className="block text-[11px] font-medium leading-tight truncate">
                            {entry.title}
                          </span>
                          <span className="block text-[10px] text-muted-foreground truncate">
                            {minutesToTime(entry.start)}–{minutesToTime(entry.end)}
                            {entry.place && ` · ${entry.place}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <PlannerDialog
        draft={draft}
        dayLabel={dayLabel(day)}
        onClose={() => setDraft(null)}
        onSave={saveDraft}
        onDelete={removeEntry}
      />
    </div>
  );
}
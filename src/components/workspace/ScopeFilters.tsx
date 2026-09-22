import { useEffect, useMemo } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkspace } from '@/hooks/use-workspace';
import { RESTAURANTS, type Task } from '@/data/workspace';
import { assigneesOf } from '@/lib/assignees';
import { unitsOf } from '@/lib/units';
import { MONTHS_NOM, parseDeadline, today } from '@/lib/dates';

export const ALL_MONTHS = 'all';

export function monthKeyOf(task: Task) {
  const due = parseDeadline(task.deadline ?? '');
  if (!due) return '';
  return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  const name = MONTHS_NOM[month - 1] ?? key;
  const title = name.charAt(0).toUpperCase() + name.slice(1);
  return year === today().getFullYear() ? title : `${title} ${year}`;
}

export function useMonthOptions(tasks: Task[]) {
  return useMemo(() => {
    const keys = new Set<string>();
    tasks.forEach((t) => {
      const key = monthKeyOf(t);
      if (key) keys.add(key);
    });
    return Array.from(keys).sort();
  }, [tasks]);
}

export function useScopeFilter(
  tasks: Task[],
  place: string,
  owner: string,
  month: string = ALL_MONTHS,
) {
  return useMemo(
    () =>
      tasks
        .filter((t) => place === 'all' || unitsOf(t).includes(place))
        .filter((t) => owner === 'all' || assigneesOf(t).includes(owner))
        .filter((t) => month === ALL_MONTHS || monthKeyOf(t) === month),
    [tasks, place, owner, month],
  );
}

export function useDefaultPlace(setPlace: (v: string) => void, allPlaces = false) {
  const { user } = useWorkspace();
  const seesAll = user.role === 'owner' || allPlaces;
  useEffect(() => {
    setPlace(seesAll ? 'all' : user.restaurant || 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seesAll, user.restaurant]);
}

export default function ScopeFilters({
  tasks,
  place,
  owner,
  month = ALL_MONTHS,
  onPlace,
  onOwner,
  onMonth,
}: {
  tasks: Task[];
  place: string;
  owner: string;
  month?: string;
  onPlace: (v: string) => void;
  onOwner: (v: string) => void;
  onMonth?: (v: string) => void;
}) {
  const { user } = useWorkspace();
  const months = useMonthOptions(tasks);

  const owners = useMemo(
    () =>
      Array.from(new Set(tasks.flatMap((t) => assigneesOf(t)))).sort((a, b) =>
        a.localeCompare(b, 'ru'),
      ),
    [tasks],
  );

  const dirty = place !== 'all' || owner !== 'all' || month !== ALL_MONTHS;

  return (
    <>
      <Select value={place} onValueChange={onPlace}>
        <SelectTrigger className="flex-1 min-w-[140px] sm:flex-none sm:w-[180px] h-9 rounded-full text-[12px] border-line bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-2xl">
          <SelectItem value="all" className="text-[13px]">Все подразделения</SelectItem>
          {RESTAURANTS.map((r) => (
            <SelectItem key={r} value={r} className="text-[13px]">
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={owner} onValueChange={onOwner}>
        <SelectTrigger className="flex-1 min-w-[140px] sm:flex-none sm:w-[170px] h-9 rounded-full text-[12px] border-line bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-2xl">
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

      {onMonth && (
        <Select value={month} onValueChange={onMonth}>
          <SelectTrigger className="flex-1 min-w-[130px] sm:flex-none sm:w-[150px] h-9 rounded-full text-[12px] border-line bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value={ALL_MONTHS} className="text-[13px]">Все месяцы</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m} className="text-[13px]">
                {monthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {dirty && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onPlace('all');
            onOwner('all');
            onMonth?.(ALL_MONTHS);
          }}
          className="rounded-full h-9 border-line text-[12px] gap-1.5 flex-none"
        >
          <Icon name="X" size={14} />
          Сбросить
        </Button>
      )}
    </>
  );
}
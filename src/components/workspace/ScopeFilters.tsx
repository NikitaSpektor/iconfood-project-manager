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

export function useScopeFilter(tasks: Task[], place: string, owner: string) {
  return useMemo(
    () =>
      tasks
        .filter((t) => place === 'all' || t.restaurant === place)
        .filter((t) => owner === 'all' || t.assignee === owner),
    [tasks, place, owner],
  );
}

export function useDefaultPlace(setPlace: (v: string) => void) {
  const { user } = useWorkspace();
  const seesAll = user.role === 'owner';
  useEffect(() => {
    setPlace(seesAll ? 'all' : user.restaurant || 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seesAll, user.restaurant]);
}

export default function ScopeFilters({
  tasks,
  place,
  owner,
  onPlace,
  onOwner,
}: {
  tasks: Task[];
  place: string;
  owner: string;
  onPlace: (v: string) => void;
  onOwner: (v: string) => void;
}) {
  const { user } = useWorkspace();

  const owners = useMemo(
    () =>
      Array.from(new Set(tasks.map((t) => t.assignee).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, 'ru'),
      ),
    [tasks],
  );

  const dirty = place !== 'all' || owner !== 'all';

  return (
    <>
      <Select value={place} onValueChange={onPlace}>
        <SelectTrigger className="flex-1 min-w-[140px] sm:flex-none sm:w-[180px] h-9 rounded-full text-[12px] border-line bg-card">
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

      <Select value={owner} onValueChange={onOwner}>
        <SelectTrigger className="flex-1 min-w-[140px] sm:flex-none sm:w-[170px] h-9 rounded-full text-[12px] border-line bg-card">
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

      {dirty && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            onPlace('all');
            onOwner('all');
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

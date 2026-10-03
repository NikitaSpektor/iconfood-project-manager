import { useMemo, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Checkbox } from '@/components/ui/checkbox';

export interface PickItem {
  key: string;
  label: string;
  hint?: string;
}

function norm(value: string) {
  return value.toLowerCase().replace(/ё/g, 'е').trim();
}

export default function PickList({
  items,
  selected,
  onToggle,
  placeholder = 'Поиск',
  empty = 'Никого не нашли',
}: {
  items: PickItem[];
  selected: string[];
  onToggle: (key: string) => void;
  placeholder?: string;
  empty?: string;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const shown = useMemo(() => {
    const q = norm(query);
    if (!q) return items;
    const words = q.split(/\s+/);
    return items.filter((it) => {
      const hay = norm(`${it.label} ${it.hint || ''}`);
      return words.every((w) => hay.includes(w));
    });
  }, [items, query]);

  const picked = items.filter((it) => selected.includes(it.key)).length;

  return (
    <div className="flex flex-col">
      <div className="relative mb-1.5">
        <Icon
          name="Search"
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (shown.length === 1) {
                onToggle(shown[0].key);
                setQuery('');
              }
            }
          }}
          placeholder={placeholder}
          className="w-full h-9 rounded-xl border border-line bg-card pl-8 pr-8 text-[16px] sm:text-sm outline-none focus:border-primary/50"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Очистить поиск"
          >
            <Icon name="X" size={14} />
          </button>
        )}
      </div>

      <div className="max-h-[min(16rem,40vh)] overflow-y-auto overscroll-contain touch-pan-y thin-scrollbar [-webkit-overflow-scrolling:touch]">
        {shown.length === 0 ? (
          <div className="px-2.5 py-6 text-center text-[12px] text-muted-foreground">{empty}</div>
        ) : (
          shown.map((it) => (
            <button
              key={it.key}
              type="button"
              onClick={() => onToggle(it.key)}
              className="w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm hover:bg-muted text-left"
            >
              <Checkbox checked={selected.includes(it.key)} className="pointer-events-none" />
              <span className="min-w-0">
                <span className="block truncate">{it.label}</span>
                {it.hint && (
                  <span className="block truncate text-[11px] text-muted-foreground">{it.hint}</span>
                )}
              </span>
            </button>
          ))
        )}
      </div>

      {picked > 0 && (
        <div className="mt-1 pt-1.5 border-t border-line px-2.5 text-[11px] text-muted-foreground">
          Выбрано: {picked}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { applyUpdate, onUpdateReady } from '@/lib/sw-update';

export default function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => onUpdateReady(() => setReady(true)), []);

  if (!ready) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] flex justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-line bg-card px-4 py-2.5 shadow-lg animate-fade-in max-w-[calc(100vw-2rem)]">
        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon name="ArrowDownToLine" size={15} />
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-medium leading-tight">Доступна новая версия</div>
          <div className="text-[11px] text-muted-foreground leading-tight">
            Обновите, чтобы видеть актуальные данные
          </div>
        </div>
        <Button
          onClick={() => {
            setBusy(true);
            applyUpdate();
          }}
          disabled={busy}
          className="h-8 flex-none rounded-full px-4 text-[12px]"
        >
          {busy ? 'Обновляю…' : 'Обновить'}
        </Button>
      </div>
    </div>
  );
}

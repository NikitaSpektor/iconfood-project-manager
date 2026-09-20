import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { askAnalyst } from '@/lib/api';

export default function TaskReport({ taskId }: { taskId: string }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function build() {
    setBusy(true);
    setError('');
    try {
      const data = await askAnalyst('Составь детальный отчёт по этой задаче', taskId);
      setText(data.answer);
    } catch (e) {
      setError((e as Error).message || 'Не удалось собрать отчёт');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(text).catch(() => undefined);
  }

  return (
    <div className="mt-5">
      <div className="eyebrow mb-3">
        <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
        Отчёт ассистента
      </div>

      {text ? (
        <div className="rounded-tile bg-surface border border-line p-3.5">
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{text}</p>
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copy}
              className="rounded-full gap-1.5 text-xs"
            >
              <Icon name="Copy" size={13} />
              Скопировать
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={build}
              className="rounded-full gap-1.5 text-xs"
            >
              <Icon
                name={busy ? 'LoaderCircle' : 'RefreshCw'}
                size={13}
                className={busy ? 'animate-spin' : ''}
              />
              Обновить
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-tile border border-dashed border-line px-4 py-4 text-center">
          <p className="text-[12px] text-muted-foreground">
            Ассистент разберёт все шаги и комментарии и соберёт отчёт по задаче
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={build}
            className="rounded-full mt-2.5 gap-1.5 text-xs"
          >
            <Icon
              name={busy ? 'LoaderCircle' : 'Sparkles'}
              size={14}
              className={busy ? 'animate-spin' : ''}
            />
            {busy ? 'Собираю отчёт...' : 'Собрать отчёт'}
          </Button>
          {error && <p className="text-[12px] text-primary mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}

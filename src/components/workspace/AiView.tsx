import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AI_ANSWERS } from '@/data/workspace';

interface Line {
  id: number;
  role: 'user' | 'ai';
  text: string;
}

const FALLBACK =
  'Смотрю на 40 задач холдинга. Главный риск сейчас один — закупки на Никольской: они держат дегустацию, печать меню и, в итоге, дату открытия. Всё остальное идёт в графике.';

export default function AiView() {
  const [lines, setLines] = useState<Line[]>([
    {
      id: 0,
      role: 'ai',
      text: 'Я разобрал задачи за неделю. Спросите про сроки, загрузку людей или причины просрочек — отвечу по данным доски.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, thinking]);

  function ask(question: string) {
    if (!question.trim() || thinking) return;
    const id = Date.now();
    setLines((p) => [...p, { id, role: 'user', text: question }]);
    setDraft('');
    setThinking(true);
    const found = AI_ANSWERS.find((a) =>
      question.toLowerCase().includes(a.q.toLowerCase().slice(0, 12)),
    );
    window.setTimeout(() => {
      setLines((p) => [...p, { id: id + 1, role: 'ai', text: found?.a ?? FALLBACK }]);
      setThinking(false);
    }, 700);
  }

  return (
    <div className="grid gap-3.5 lg:grid-cols-[1fr_320px] flex-1 min-h-0">
      <section className="bento p-0 flex flex-col min-h-0 overflow-hidden animate-fade-in">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-line flex-none">
          <div className="h-9 w-9 rounded-full bg-avatar flex items-center justify-center">
            <Icon name="Sparkles" size={16} className="text-foreground/70" />
          </div>
          <div>
            <div className="font-head font-semibold text-[14px] leading-tight">
              Ассистент ICONFOOD
            </div>
            <div className="text-[12px] text-muted-foreground">
              анализ выполнения и завершения задач
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 py-4 space-y-3">
          {lines.map((l) => (
            <div key={l.id} className={cn('flex', l.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3 border text-[13px] leading-relaxed',
                  l.role === 'user'
                    ? 'bg-primary text-primary-foreground border-transparent rounded-br-md'
                    : 'bg-card border-line rounded-bl-md',
                )}
              >
                {l.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="bg-card border border-line rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
          className="flex items-center gap-2 px-5 py-4 border-t border-line flex-none"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Спросить про задачи холдинга…"
            className="rounded-full h-10 bg-card border-line"
          />
          <Button type="submit" size="icon" className="rounded-full h-10 w-10 flex-none">
            <Icon name="ArrowUp" size={16} />
          </Button>
        </form>
      </section>

      <section className="bento p-5 flex flex-col min-h-0 animate-fade-in [animation-delay:.1s]">
        <div className="eyebrow mb-3.5">
          <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
          Быстрые разборы
        </div>
        <div className="space-y-2 overflow-y-auto no-scrollbar">
          {AI_ANSWERS.map((a) => (
            <button
              key={a.q}
              onClick={() => ask(a.q)}
              className="w-full text-left bg-card border border-line rounded-tile p-3.5 text-[13px] hover:-translate-y-0.5 hover:shadow-pill transition-all"
            >
              {a.q}
            </button>
          ))}
        </div>
        <div className="mt-auto pt-4 text-[12px] text-muted-foreground border-t border-line">
          Ассистент читает доски, дедлайны и подзадачи. Итог можно отправить в отчёт одним нажатием.
        </div>
      </section>
    </div>
  );
}

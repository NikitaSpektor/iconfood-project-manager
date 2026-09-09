import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/hooks/use-workspace';

export default function ChatView() {
  const { channels, sendMessage, readChannel } = useWorkspace();
  const [activeId, setActiveId] = useState(channels[0].id);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const active = channels.find((c) => c.id === activeId) ?? channels[0];

  useEffect(() => {
    readChannel(activeId);
  }, [activeId, readChannel]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active.messages.length, activeId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage(activeId, draft.trim());
    setDraft('');
  }

  return (
    <div className="grid gap-3.5 lg:grid-cols-[300px_1fr] flex-1 min-h-0">
      <section className="bento p-4 sm:p-5 flex flex-col min-h-0 animate-fade-in">
        <div className="eyebrow mb-3.5">
          <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
          Мессенджер
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2">
          {channels.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                'w-full text-left rounded-tile border p-3 transition-all',
                c.id === activeId
                  ? 'border-flag-select border-[1.5px] bg-card'
                  : 'border-line bg-card hover:-translate-y-0.5 hover:shadow-pill',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium truncate">{c.name}</span>
                {c.unread > 0 && (
                  <span className="ml-auto h-[18px] min-w-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center px-1">
                    {c.unread}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 truncate">
                {c.messages[c.messages.length - 1]?.text ?? c.hint}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="bento p-0 flex flex-col min-h-0 overflow-hidden animate-fade-in [animation-delay:.1s]">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-line flex-none">
          <div className="h-9 w-9 rounded-full bg-avatar flex items-center justify-center">
            <Icon name="Hash" size={16} className="text-foreground/60" />
          </div>
          <div>
            <div className="font-head font-semibold text-[14px] leading-tight">{active.name}</div>
            <div className="text-[12px] text-muted-foreground">{active.hint}</div>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <i className="h-1.5 w-1.5 rounded-full bg-flag-done" />
            в сети
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 py-4 space-y-3">
          {active.messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex gap-2.5', m.own ? 'justify-end' : 'justify-start')}
            >
              {!m.own && (
                <span className="h-7 w-7 rounded-full bg-avatar flex-none font-head text-[11px] font-semibold flex items-center justify-center">
                  {m.author[0]}
                </span>
              )}
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-3.5 py-2.5 border',
                  m.own
                    ? 'bg-primary text-primary-foreground border-transparent rounded-br-md'
                    : 'bg-card border-line rounded-bl-md',
                )}
              >
                {!m.own && (
                  <div className="text-[11px] font-medium text-muted-foreground mb-0.5">
                    {m.author}
                  </div>
                )}
                <div className="text-[13px] leading-snug">{m.text}</div>
                <div
                  className={cn(
                    'text-[10px] mt-1',
                    m.own ? 'text-primary-foreground/70' : 'text-muted-foreground',
                  )}
                >
                  {m.time}
                </div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 px-5 py-4 border-t border-line flex-none">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Написать в канал…"
            className="rounded-full h-10 bg-card border-line"
          />
          <Button type="submit" size="icon" className="rounded-full h-10 w-10 flex-none">
            <Icon name="Send" size={16} />
          </Button>
        </form>
      </section>
    </div>
  );
}

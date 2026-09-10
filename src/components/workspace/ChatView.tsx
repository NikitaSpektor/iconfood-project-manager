import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/hooks/use-workspace';
import NewChannelDialog from './NewChannelDialog';
import ChannelSettingsDialog from './ChannelSettingsDialog';
import NewDirectDialog from './NewDirectDialog';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export default function ChatView() {
  const { channels, sendMessage, readChannel, loading } = useWorkspace();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [creating, setCreating] = useState(false);
  const [settings, setSettings] = useState(false);
  const [direct, setDirect] = useState(false);
  const [tab, setTab] = useState<'channel' | 'direct'>('channel');

  const visible = channels.filter((c) => (c.kind ?? 'channel') === tab);
  const active = channels.find((c) => c.id === activeId) ?? visible[0] ?? null;

  useEffect(() => {
    if (visible.length > 0 && !visible.some((c) => c.id === activeId)) setActiveId(visible[0].id);
    if (visible.length === 0) setActiveId(null);
  }, [visible, activeId]);

  useEffect(() => {
    if (active && active.unread > 0) readChannel(active.id);
  }, [active, readChannel]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages.length, activeId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if ((!draft.trim() && !pending) || !active) return;
    setSending(true);
    await sendMessage(active.id, draft.trim(), pending ?? undefined);
    setDraft('');
    setPending(null);
    setSending(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  if (!active) {
    return (
      <div className="bento flex-1 flex flex-col items-center justify-center gap-3 text-[13px] text-muted-foreground">
        {loading ? (
          'Загружаем переписку...'
        ) : (
          <>
            {tab === 'direct' ? 'Личных диалогов пока нет' : 'Каналов пока нет'}
            <div className="flex gap-2">
              <Button onClick={() => setCreating(true)} className="rounded-full gap-1.5">
                <Icon name="Plus" size={15} />
                Создать канал
              </Button>
              <Button
                variant="outline"
                onClick={() => setDirect(true)}
                className="rounded-full gap-1.5 border-line"
              >
                <Icon name="MessageSquare" size={15} />
                Написать коллеге
              </Button>
            </div>
            <NewChannelDialog open={creating} onOpenChange={setCreating} />
            <NewDirectDialog
              open={direct}
              onOpenChange={setDirect}
              onPicked={(id) => {
                setTab('direct');
                setActiveId(id);
              }}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3.5 lg:grid-cols-[300px_1fr] flex-1 min-h-0">
      <section className="bento p-4 sm:p-5 flex flex-col min-h-0 max-h-[42vh] lg:max-h-none animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <div className="eyebrow mr-auto">
            <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
            Мессенджер
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => (tab === 'direct' ? setDirect(true) : setCreating(true))}
            className="rounded-full h-8 w-8 border-line flex-none"
            aria-label={tab === 'direct' ? 'Новый диалог' : 'Новый канал'}
          >
            <Icon name="Plus" size={15} />
          </Button>
        </div>

        <div className="flex gap-1 p-1 rounded-full bg-card border border-line mb-3">
          {(['channel', 'direct'] as const).map((t) => {
            const count = channels
              .filter((c) => (c.kind ?? 'channel') === t)
              .reduce((sum, c) => sum + c.unread, 0);
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 h-8 rounded-full text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5',
                  tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-surface',
                )}
              >
                {t === 'channel' ? 'Каналы' : 'Личные'}
                {count > 0 && (
                  <span
                    className={cn(
                      'h-[16px] min-w-[16px] rounded-full text-[10px] font-semibold flex items-center justify-center px-1',
                      tab === t ? 'bg-primary-foreground/25' : 'bg-primary text-primary-foreground',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2">
          {visible.length === 0 && (
            <div className="rounded-tile border border-dashed border-line py-8 text-center text-[12px] text-muted-foreground">
              {tab === 'direct' ? 'Начните переписку с коллегой' : 'Каналов нет'}
            </div>
          )}
          {visible.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                'w-full text-left rounded-tile border p-3 transition-all',
                c.id === active.id
                  ? 'border-flag-select border-[1.5px] bg-card'
                  : 'border-line bg-card hover:-translate-y-0.5 hover:shadow-pill',
              )}
            >
              <div className="flex items-center gap-2">
                {c.kind === 'direct' && (
                  <span className="h-6 w-6 rounded-full bg-avatar font-head text-[9px] font-semibold flex items-center justify-center flex-none">
                    {c.name.split(' ').map((w) => w[0]).join('')}
                  </span>
                )}
                <span className="text-[13px] font-medium truncate">{c.name}</span>
                {c.unread > 0 && (
                  <span className="ml-auto h-[18px] min-w-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center px-1">
                    {c.unread}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 truncate">
                {c.messages[c.messages.length - 1]?.text ||
                  (c.messages[c.messages.length - 1]?.file
                    ? `Файл: ${c.messages[c.messages.length - 1]?.file?.name}`
                    : c.hint)}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="bento p-0 flex flex-col min-h-0 overflow-hidden animate-fade-in [animation-delay:.1s]">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-line flex-none">
          <div className="h-9 w-9 rounded-full bg-avatar flex items-center justify-center flex-none font-head text-[11px] font-semibold">
            {active.kind === 'direct' ? (
              active.name.split(' ').map((w) => w[0]).join('')
            ) : (
              <Icon name="Hash" size={16} className="text-foreground/60" />
            )}
          </div>
          <div>
            <div className="font-head font-semibold text-[14px] leading-tight">{active.name}</div>
            <div className="text-[12px] text-muted-foreground">
              {active.open === false && active.members?.length
                ? active.members.slice(0, 3).map((m) => m.name).join(', ') +
                  (active.members.length > 3 ? ` и ещё ${active.members.length - 3}` : '')
                : active.hint}
            </div>
          </div>
          {active.kind === 'direct' ? (
            <div className="ml-auto flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Icon name="Lock" size={13} />
              только вы двое
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSettings(true)}
              className="ml-auto h-9 w-9 rounded-full border border-line flex items-center justify-center hover:bg-surface transition-colors"
              aria-label="Настройки канала"
            >
              <Icon name="Settings2" size={16} />
            </button>
          )}
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
                {m.file && m.file.mime.startsWith('image/') && (
                  <a href={m.file.url} target="_blank" rel="noreferrer" className="block mb-1.5">
                    <img
                      src={m.file.url}
                      alt={m.file.name}
                      className="rounded-xl max-h-52 w-auto object-cover border border-line/40"
                    />
                  </a>
                )}
                {m.file && !m.file.mime.startsWith('image/') && (
                  <a
                    href={m.file.url}
                    target="_blank"
                    rel="noreferrer"
                    download={m.file.name}
                    className={cn(
                      'flex items-center gap-2 rounded-xl px-2.5 py-2 mb-1.5 border transition-colors',
                      m.own
                        ? 'bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20'
                        : 'bg-surface border-line hover:bg-background',
                    )}
                  >
                    <Icon name="Paperclip" size={14} className="flex-none" />
                    <span className="min-w-0">
                      <span className="block text-[12px] font-medium truncate">{m.file.name}</span>
                      <span
                        className={cn(
                          'block text-[10px]',
                          m.own ? 'text-primary-foreground/70' : 'text-muted-foreground',
                        )}
                      >
                        {formatSize(m.file.size)}
                      </span>
                    </span>
                    <Icon name="Download" size={14} className="ml-auto flex-none" />
                  </a>
                )}
                {m.text && <div className="text-[13px] leading-snug">{m.text}</div>}
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

        <form onSubmit={submit} className="px-5 py-4 border-t border-line flex-none">
          {pending && (
            <div className="flex items-center gap-2 mb-2.5 rounded-xl bg-surface border border-line px-3 py-2">
              <Icon
                name={pending.type.startsWith('image/') ? 'Image' : 'Paperclip'}
                size={14}
                className="text-muted-foreground flex-none"
              />
              <span className="text-[12px] truncate mr-auto">{pending.name}</span>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {formatSize(pending.size)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPending(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Убрать файл"
              >
                <Icon name="X" size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => setPending(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="rounded-full h-10 w-10 flex-none border-line"
              aria-label="Прикрепить файл"
            >
              <Icon name="Paperclip" size={16} />
            </Button>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={active.kind === 'direct' ? `Написать ${active.name.split(' ')[0]}…` : 'Написать в канал…'}
              className="rounded-full h-10 bg-card border-line"
            />
            <Button
              type="submit"
              size="icon"
              disabled={sending || (!draft.trim() && !pending)}
              className="rounded-full h-10 w-10 flex-none"
              aria-label="Отправить"
            >
              <Icon
                name={sending ? 'LoaderCircle' : 'Send'}
                size={16}
                className={sending ? 'animate-spin' : ''}
              />
            </Button>
          </div>
        </form>
      </section>

      <NewChannelDialog open={creating} onOpenChange={setCreating} />
      <NewDirectDialog
        open={direct}
        onOpenChange={setDirect}
        onPicked={(id) => {
          setTab('direct');
          setActiveId(id);
        }}
      />
      <ChannelSettingsDialog channel={active} open={settings} onOpenChange={setSettings} />
    </div>
  );
}
import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';
import { RESTAURANTS, roleLabels, type Role } from '@/data/workspace';
import { useWorkspace } from '@/hooks/use-workspace';

const notifications = [
  { id: 'n1', label: 'Новая задача на мне', hint: 'Письмо ответственному сразу после создания', on: true },
  { id: 'n2', label: 'Дедлайн через сутки', hint: 'Напоминание утром за день до срока', on: true },
  { id: 'n3', label: 'Комментарий в моей задаче', hint: 'Только по задачам, где я ответственный', on: false },
  { id: 'n4', label: 'Итог недели от ассистента', hint: 'Сводка по холдингу каждый понедельник', on: true },
];

const faq = [
  {
    q: 'Как работают цветовые стикеры дедлайнов?',
    a: 'Красный — срок горит и до него меньше недели. Жёлтый — дедлайн на подходе. Зелёный — запас есть или задача уже закрыта. Цвет проставляется автоматически и виден на доске, в календаре и в Ганте.',
  },
  {
    q: 'Чем личная доска отличается от общей?',
    a: 'Личная доска показывает только то, где вы ответственный. Общая доска холдинга собирает задачи всех четырёх ресторанов — её видят все участники, но менять карточки могут те, у кого есть права.',
  },
  {
    q: 'Что делают шаблоны задач?',
    a: 'Шаблон разворачивает готовый набор подзадач: «Открытие ресторана» — восемь шагов от аренды до дня Х, «Смена меню» — шесть. Создаёте задачу из шаблона и сразу получаете чек-лист.',
  },
  {
    q: 'Как добавить человека в проект?',
    a: 'Через раздел «Участники»: вводите рабочую почту, выбираете роль — приглашение уходит письмом с личным логином и паролем. Всего в холдинге 50 учётных записей.',
  },
];

export default function SettingsView() {
  const { user } = useWorkspace();
  const [flags, setFlags] = useState(
    Object.fromEntries(notifications.map((n) => [n.id, n.on])) as Record<string, boolean>,
  );
  const [email, setEmail] = useState('alina.vetrova@iconfood.ru');
  const [place, setPlace] = useState(RESTAURANTS[0]);

  return (
    <div className="grid gap-3.5 lg:grid-cols-2 flex-1 min-h-0 overflow-y-auto no-scrollbar">
      <section className="bento p-5 sm:p-6 animate-fade-in">
        <div className="eyebrow mb-4">
          <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
          Профиль
        </div>
        <div className="flex items-center gap-3 mb-5">
          <span className="h-12 w-12 rounded-full bg-avatar font-head font-semibold flex items-center justify-center">
            {user.name.split(' ').map((w) => w[0]).join('')}
          </span>
          <div>
            <div className="font-head font-semibold text-[15px]">{user.name}</div>
            <div className="text-[12px] text-muted-foreground">{roleLabels[user.role as Role]} · логин {user.login}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="st-email">Рабочая почта для уведомлений</Label>
            <Input
              id="st-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl bg-card border-line"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Основной ресторан</Label>
            <div className="flex flex-wrap gap-2">
              {RESTAURANTS.map((r) => (
                <button
                  key={r}
                  onClick={() => setPlace(r)}
                  className={`px-3.5 py-2 rounded-full text-[12px] font-medium border transition-colors ${
                    place === r
                      ? 'bg-surface border-flag-select text-foreground'
                      : 'bg-card border-line text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <Button
            className="rounded-full h-10 gap-1.5"
            onClick={() => toast({ title: 'Профиль сохранён', description: `Уведомления идут на ${email}` })}
          >
            <Icon name="Check" size={15} />
            Сохранить
          </Button>
        </div>
      </section>

      <section className="bento p-5 sm:p-6 animate-fade-in [animation-delay:.1s]">
        <div className="eyebrow mb-4">
          <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
          Уведомления на почту
        </div>
        <ul className="space-y-4">
          {notifications.map((n) => (
            <li key={n.id} className="flex items-start gap-3">
              <div className="mr-auto">
                <div className="text-[13px] font-medium">{n.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{n.hint}</div>
              </div>
              <Switch
                checked={flags[n.id]}
                onCheckedChange={(v) => setFlags((p) => ({ ...p, [n.id]: v }))}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="bento p-5 sm:p-6 lg:col-span-2 animate-fade-in [animation-delay:.16s]">
        <div className="eyebrow mb-3">
          <i className="h-2.5 w-2.5 rounded-[3px] bg-bar" />
          Как всё устроено
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faq.map((f, i) => (
            <AccordionItem key={f.q} value={`f${i}`} className="border-line">
              <AccordionTrigger className="text-[14px] font-medium text-left hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-[13px] text-muted-foreground leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
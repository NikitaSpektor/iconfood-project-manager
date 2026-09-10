import { TEMPLATES } from '@/data/workspace';

const STOP = new Set([
  'и', 'в', 'на', 'по', 'для', 'из', 'с', 'к', 'о', 'об', 'от', 'до', 'за', 'при', 'что',
  'как', 'все', 'нужно', 'надо', 'новый', 'новая', 'новое',
]);

function words(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => w.slice(0, 5));
}

export function localSubtaskHints(title: string, restaurant: string): string[] {
  const keys = words(title);
  let best: (typeof TEMPLATES)[number] | null = null;
  let bestScore = 0;

  for (const tpl of TEMPLATES) {
    const pool = words(tpl.name + ' ' + tpl.hint + ' ' + tpl.steps.join(' '));
    const score = keys.filter((k) => pool.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = tpl;
    }
  }

  if (best && bestScore > 0) return [...best.steps];

  const subject = title.trim().replace(/^./, (c) => c.toLowerCase());
  return [
    `Уточнить цель и результат: ${subject}`,
    `Согласовать сроки и бюджет с управляющим`,
    `Подготовить материалы и назначить исполнителей`,
    `Выполнить работы в ${restaurant}`,
    `Проверить результат и снять фото-отчёт`,
    `Закрыть задачу и сообщить команде`,
  ];
}

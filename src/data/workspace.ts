import { daysLeft } from '@/lib/dates';

export type ColumnId = 'new' | 'progress' | 'done';
export type Priority = 'critical' | 'high' | 'normal' | 'low';
export type Cover = 'none' | 'flame' | 'ocean' | 'herb' | 'grape';
export type Role = 'owner' | 'manager' | 'chef' | 'staff' | 'guest';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  mime: string;
  size: number;
  author: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  restaurant: string;
  column: ColumnId;
  priority: Priority;
  cover: Cover;
  deadline: string;
  assignee: string;
  watchers: string[];
  template?: string;
  personal: boolean;
  subtasks: Subtask[];
  comments?: Comment[];
  attachments?: Attachment[];
  note?: string;
  ganttStart: number;
  ganttSpan: number;
  track: string;
}

export interface Member {
  id: string;
  name: string;
  login: string;
  email: string;
  role: Role;
  restaurant: string;
  position?: string;
  online: boolean;
}

export interface ChatMessage {
  id: string;
  author: string;
  text: string;
  time: string;
  own?: boolean;
  system?: boolean;
  file?: {
    url: string;
    name: string;
    mime: string;
    size: number;
  };
}

export interface Channel {
  id: string;
  name: string;
  open?: boolean;
  kind?: 'channel' | 'direct';
  createdBy?: string;
  unit?: string;
  members?: { name: string; login: string }[];
  hint: string;
  unread: number;
  messages: ChatMessage[];
}

export const RESTAURANTS = [
  'Управляющая компания',
  'Фабрика',
  'Авиапарк',
  'Метрополис',
  'Кунцево Плаза',
  'Каширская Плаза',
  'Мега Химки',
  'Мега Теплый Стан',
  'Саларис',
  'Океания',
  'Павелецкая',
  'Проспект Мира',
  'Блэк Маркет',
  'Афимолл',
];

export const roleLabels: Record<Role, string> = {
  owner: 'Владелец',
  manager: 'Управляющий',
  chef: 'Шеф-повар',
  staff: 'Сотрудник',
  guest: 'Наблюдатель',
};

export const roleRights: Record<Role, string> = {
  owner: 'Полный доступ, права, биллинг',
  manager: 'Проекты, задачи, отчёты, приглашения',
  chef: 'Задачи кухни, шаблоны, подзадачи',
  staff: 'Свои задачи и комментарии',
  guest: 'Только просмотр общей доски',
};

export const priorityLabels: Record<Priority, string> = {
  critical: 'Критично',
  high: 'Срочно',
  normal: 'Обычная',
  low: 'Может подождать',
};

export const columnLabels: Record<ColumnId, string> = {
  new: 'Новые',
  progress: 'В работе',
  done: 'Завершены',
};

export const coverClasses: Record<Cover, string> = {
  none: '',
  flame: 'bg-[linear-gradient(120deg,hsl(var(--flag-hot)/.75),hsl(var(--flag-soon)/.6))]',
  ocean: 'bg-[linear-gradient(120deg,hsl(var(--flag-select)/.6),hsl(var(--flag-done)/.45))]',
  herb: 'bg-[linear-gradient(120deg,hsl(var(--flag-done)/.65),hsl(var(--flag-soon)/.4))]',
  grape: 'bg-[linear-gradient(120deg,hsl(var(--flag-select)/.7),hsl(var(--flag-hot)/.4))]',
};

/** Цветовой стикер дедлайна: горит / скоро / в порядке */
export function deadlineTone(deadline: string, column: ColumnId) {
  if (column === 'done') return 'done' as const;
  const left = daysLeft(deadline);
  if (left === null) return 'done' as const;
  if (left <= 3) return 'hot' as const;
  if (left <= 10) return 'soon' as const;
  return 'done' as const;
}

export const toneClasses = {
  hot: { dot: 'bg-flag-hot', text: 'text-flag-hot', soft: 'bg-flag-hot/10' },
  soon: { dot: 'bg-flag-soon', text: 'text-flag-soon', soft: 'bg-flag-soon/10' },
  done: { dot: 'bg-flag-done', text: 'text-flag-done', soft: 'bg-flag-done/10' },
};

export const TEMPLATES = [
  {
    id: 'tpl1',
    owner: 'Влад Терликов',
    name: 'Открытие ресторана',
    icon: 'DoorOpen',
    hint: 'Аренда, ремонт, персонал, прогон, день Х',
    steps: [
      'Согласовать помещение и договор аренды',
      'Утвердить проект и смету ремонта',
      'Закупить оборудование и мебель',
      'Набрать и обучить команду',
      'Получить разрешения и подключить кассы',
      'Завезти продукты и запустить кухню',
      'Провести прогон и тестовый день',
      'Открытие: гости, пресса, фотосъёмка',
    ],
  },
  {
    id: 'tpl2',
    owner: 'Павел Ларионов',
    name: 'Смена основного меню и сезонные вкладки',
    icon: 'ChefHat',
    hint: 'Заявки, фудкост, дегустация, печать',
    steps: [
      'Собрать заявки и идеи по блюдам',
      'Разработать рецептуры и техкарты',
      'Посчитать фудкост и утвердить цены',
      'Провести дегустацию с бренд-шефом',
      'Снять блюда и обновить вкладки',
      'Обучить кухню и зал, запустить в продажу',
    ],
  },
  {
    id: 'tpl3',
    owner: 'Владимир Ануфриев',
    name: 'Смена барного меню и сезонные вкладки',
    icon: 'Martini',
    hint: 'Коктейли, калькуляция, обучение бара',
    steps: [
      'Собрать идеи по коктейлям и сезону',
      'Разработать рецептуры и техкарты бара',
      'Согласовать закупку алкоголя и посуды',
      'Посчитать себестоимость и цены',
      'Дегустация с бренд-барменом',
      'Обучить барменов и запустить вкладки',
    ],
  },
  {
    id: 'tpl4',
    owner: 'Никита Спектор',
    name: 'Обучение и развитие персонала',
    icon: 'GraduationCap',
    hint: 'Скрипты, тренинги, тест, аттестация',
    steps: [
      'Определить потребность в обучении',
      'Подготовить материалы и скрипты',
      'Провести тренинг для смены',
      'Тестирование и разбор ошибок',
      'Аттестация и план развития',
    ],
  },
  {
    id: 'tpl5',
    owner: 'Марина Гаврилова',
    name: 'Инвентаризация',
    icon: 'ClipboardList',
    hint: 'Остатки, сверка, списание, акт',
    steps: [
      'Подготовить ведомости и остановить движение',
      'Пересчитать остатки по складам',
      'Сверить с учётной системой',
      'Оформить списания и итоговый акт',
    ],
  },
  {
    id: 'tpl6',
    owner: 'Марго Филина',
    name: 'Маркетинг и дизайн',
    icon: 'Megaphone',
    hint: 'Идея, съёмка, макеты, запуск, разбор',
    steps: [
      'Сформулировать цель и идею кампании',
      'Утвердить бюджет и каналы',
      'Подготовить макеты и дизайн',
      'Организовать съёмку и контент',
      'Написать тексты и анонсы',
      'Запустить кампанию',
      'Собрать результаты и разбор',
    ],
  },
  {
    id: 'tpl7',
    owner: 'Надежда Петренко',
    name: 'Закупки',
    icon: 'ShoppingCart',
    hint: 'Заявка, поставщики, цены, договор, поставка',
    steps: [
      'Собрать заявку от ресторанов',
      'Подобрать поставщиков и сравнить цены',
      'Согласовать бюджет с руководством',
      'Заключить договор и оформить заказ',
      'Принять поставку и проверить качество',
      'Закрыть документы и оплату',
    ],
  },
  {
    id: 'tpl8',
    owner: 'Андрей Виллер',
    name: 'Текущие технические задачи',
    icon: 'Wrench',
    hint: 'Заявка, диагностика, ремонт, приёмка',
    steps: [
      'Зафиксировать заявку и приоритет',
      'Провести диагностику и оценить стоимость',
      'Согласовать подрядчика и сроки',
      'Выполнить ремонт или замену',
      'Принять работу и закрыть заявку',
    ],
  },
  {
    id: 'tpl9',
    owner: 'Ольга Любина',
    name: 'Эстетика ресторанов',
    icon: 'Flower2',
    hint: 'Аудит, декор, свет, музыка, проверка',
    steps: [
      'Провести аудит зала и фотофиксацию',
      'Составить план по декору и свету',
      'Согласовать бюджет и закупку',
      'Обновить декор, посуду и озеленение',
      'Проверить свет, музыку и ароматы',
      'Финальный чек-лист и фотоотчёт',
    ],
  },
  {
    id: 'tpl10',
    owner: 'Ольга Любина',
    name: 'Униформа персонала',
    icon: 'Shirt',
    hint: 'Концепция, образцы, размеры, пошив, выдача',
    steps: [
      'Утвердить концепцию и материалы',
      'Заказать и примерить образцы',
      'Собрать размеры по сотрудникам',
      'Разместить заказ на пошив',
      'Принять партию и проверить качество',
      'Выдать униформу под роспись',
    ],
  },
  {
    id: 'tpl11',
    owner: 'Марина Гаврилова',
    name: 'Программа лояльности',
    icon: 'BadgePercent',
    hint: 'Механика, настройка, обучение, запуск',
    steps: [
      'Определить механику и уровни бонусов',
      'Согласовать экономику программы',
      'Настроить систему и кассы',
      'Подготовить материалы и обучить зал',
      'Запустить и собрать первые отзывы',
      'Проанализировать эффект и доработать',
    ],
  },
  {
    id: 'tpl12',
    owner: 'Татьяна Камаева',
    name: 'Доставка',
    icon: 'Bike',
    hint: 'Меню, агрегаторы, упаковка, сборка, качество',
    steps: [
      'Сформировать меню для доставки',
      'Подключить агрегаторы и настроить витрину',
      'Подобрать упаковку и брендинг',
      'Отладить процесс сборки заказов',
      'Обучить смену и курьеров',
      'Контроль качества и работа с отзывами',
    ],
  },
  {
    id: 'tpl13',
    owner: 'Алла Заварницина',
    name: 'Производство на фабрике',
    icon: 'Factory',
    hint: 'План, сырьё, выпуск, качество, отгрузка',
    steps: [
      'Собрать заявки ресторанов и план выпуска',
      'Проверить сырьё и остатки на складе',
      'Составить график смен и загрузку линий',
      'Запустить производство партии',
      'Контроль качества и маркировка',
      'Отгрузка по ресторанам и отчёт',
    ],
  },
];

export const AI_ANSWERS: { q: string; a: string }[] = [
  {
    q: 'Что тормозит открытие Никольской?',
    a: 'Открытие идёт с опозданием на 4 дня. Причина одна: закупки. Задача «Поставщик рыбы» держит дегустацию, а та — печать меню. Если закрыть закупку до 11 сентября, срок открытия выравнивается.',
  },
  {
    q: 'Кто перегружен по задачам?',
    a: 'Егор Тимофеев: 7 активных задач, из них 3 критичных с дедлайном на этой неделе. Рекомендую передать «Фотосъёмку блюд» Ксении Родиной — у неё загрузка 40%.',
  },
  {
    q: 'Как холдинг закрывает задачи?',
    a: 'За 30 дней закрыто 23 задачи из 40, в срок — 78%. Лучше всех Кунцево Плаза (91%), хуже — Метрополис (61%), там основная просадка на подготовке к завтракам.',
  },
  {
    q: 'Что ставить в приоритет на неделе?',
    a: 'Три вещи: закупка рыбы, дегустация меню и график официантов. Они лежат на критическом пути открытия — остальное можно сдвинуть без потерь.',
  },
];

export const REPORT_METRICS = [
  { id: 'r1', label: 'Задач в работе', value: '11', delta: '+3 за неделю', tone: 'soon' as const, icon: 'Activity' },
  { id: 'r2', label: 'Закрыто за месяц', value: '23', delta: '78% в срок', tone: 'done' as const, icon: 'CheckCheck' },
  { id: 'r3', label: 'Просрочено', value: '4', delta: 'все по закупкам', tone: 'hot' as const, icon: 'TriangleAlert' },
  { id: 'r4', label: 'Активных участников', value: '30', delta: '4 ресторана', tone: 'done' as const, icon: 'Users' },
];

export const REPORT_BY_RESTAURANT = [
  { name: 'Авиапарк', done: 9, total: 14 },
  { name: 'Метрополис', done: 5, total: 11 },
  { name: 'Кунцево Плаза', done: 10, total: 11 },
  { name: 'Каширская Плаза', done: 3, total: 8 },
  { name: 'Мега Химки', done: 7, total: 10 },
  { name: 'Мега Теплый Стан', done: 6, total: 12 },
  { name: 'Саларис', done: 8, total: 9 },
  { name: 'Океания', done: 4, total: 9 },
  { name: 'Павелецкая', done: 11, total: 13 },
  { name: 'Проспект Мира', done: 5, total: 8 },
  { name: 'Блэк Маркет', done: 6, total: 7 },
  { name: 'Афимолл', done: 9, total: 12 },
];

export const WEEK_LOAD = [
  { day: 'Пн', value: 62 },
  { day: 'Вт', value: 78 },
  { day: 'Ср', value: 54 },
  { day: 'Чт', value: 91 },
  { day: 'Пт', value: 70 },
  { day: 'Сб', value: 38 },
  { day: 'Вс', value: 22 },
];
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
  members?: { name: string; login: string }[];
  hint: string;
  unread: number;
  messages: ChatMessage[];
}

export const RESTAURANTS = [
  'Управляющая компания',
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
  const day = Number(deadline.slice(0, 2));
  if (day <= 14) return 'hot' as const;
  if (day <= 22) return 'soon' as const;
  return 'done' as const;
}

export const toneClasses = {
  hot: { dot: 'bg-flag-hot', text: 'text-flag-hot', soft: 'bg-flag-hot/10' },
  soon: { dot: 'bg-flag-soon', text: 'text-flag-soon', soft: 'bg-flag-soon/10' },
  done: { dot: 'bg-flag-done', text: 'text-flag-done', soft: 'bg-flag-done/10' },
};

export const TASKS: Task[] = [
  {
    id: 't1',
    title: 'Согласовать сезонное меню с шефом',
    restaurant: 'Авиапарк',
    column: 'progress',
    priority: 'critical',
    cover: 'flame',
    deadline: '12 сентября',
    assignee: 'Алина Ветрова',
    watchers: ['Дмитрий Соколов', 'Пётр Лазарев'],
    template: 'Смена основного меню и сезонные вкладки',
    personal: true,
    track: 'Меню',
    ganttStart: 2,
    ganttSpan: 46,
    note: 'Осенняя карта: 9 позиций, дегустация в четверг.',
    subtasks: [
      { id: 's1', title: 'Собрать заявки от шефов', done: true },
      { id: 's2', title: 'Пересчитать фудкост позиций', done: true },
      { id: 's3', title: 'Дегустация с управляющими', done: false },
      { id: 's4', title: 'Отдать вёрстку меню в печать', done: false },
    ],
  },
  {
    id: 't2',
    title: 'Поставщик рыбы: пересчитать закупку',
    restaurant: 'Авиапарк',
    column: 'progress',
    priority: 'critical',
    cover: 'none',
    deadline: '12 сентября',
    assignee: 'Алина Ветрова',
    watchers: ['Ольга Панина'],
    personal: true,
    track: 'Закупки',
    ganttStart: 6,
    ganttSpan: 30,
    subtasks: [
      { id: 's1', title: 'Запросить прайс у трёх поставщиков', done: true },
      { id: 's2', title: 'Сравнить с бюджетом квартала', done: false },
    ],
  },
  {
    id: 't3',
    title: 'Смены официантов на открытие',
    restaurant: 'Авиапарк',
    column: 'new',
    priority: 'high',
    cover: 'none',
    deadline: '18 сентября',
    assignee: 'Алина Ветрова',
    watchers: ['Марина Ким'],
    template: 'Открытие',
    personal: true,
    track: 'Персонал',
    ganttStart: 16,
    ganttSpan: 52,
    subtasks: [
      { id: 's1', title: 'Составить график на две недели', done: false },
      { id: 's2', title: 'Согласовать с HR', done: false },
    ],
  },
  {
    id: 't4',
    title: 'Вывеска и витрина: макет в печать',
    restaurant: 'Авиапарк',
    column: 'new',
    priority: 'high',
    cover: 'grape',
    deadline: '21 сентября',
    assignee: 'Алина Ветрова',
    watchers: ['Егор Тимофеев'],
    personal: true,
    track: 'Маркетинг',
    ganttStart: 38,
    ganttSpan: 44,
    subtasks: [
      { id: 's1', title: 'Утвердить эскиз с дизайнером', done: true },
      { id: 's2', title: 'Согласовать с арендодателем', done: false },
    ],
  },
  {
    id: 't5',
    title: 'Приёмка кухонного оборудования',
    restaurant: 'Авиапарк',
    column: 'done',
    priority: 'normal',
    cover: 'none',
    deadline: '05 сентября',
    assignee: 'Алина Ветрова',
    watchers: [],
    personal: true,
    track: 'Оборудование',
    ganttStart: 0,
    ganttSpan: 40,
    subtasks: [
      { id: 's1', title: 'Проверить комплектность', done: true },
      { id: 's2', title: 'Подписать акт', done: true },
    ],
  },
  {
    id: 't6',
    title: 'Запуск завтраков на Патриарших',
    restaurant: 'Метрополис',
    column: 'new',
    priority: 'critical',
    cover: 'flame',
    deadline: '16 сентября',
    assignee: 'Дмитрий Соколов',
    watchers: ['Алина Ветрова', 'Марина Ким'],
    template: 'Открытие',
    personal: false,
    track: 'Меню',
    ganttStart: 10,
    ganttSpan: 48,
    note: 'Шаблон «Открытие» — 8 подзадач.',
    subtasks: [
      { id: 's1', title: 'Утвердить завтрак-карту', done: false },
      { id: 's2', title: 'Закупить посуду', done: false },
      { id: 's3', title: 'Обучить бариста', done: false },
      { id: 's4', title: 'Настроить кассу', done: false },
      { id: 's5', title: 'Съёмка блюд', done: false },
      { id: 's6', title: 'Анонс в соцсетях', done: false },
      { id: 's7', title: 'Пробный день', done: false },
      { id: 's8', title: 'Разбор пробного дня', done: false },
    ],
  },
  {
    id: 't7',
    title: 'Инвентаризация бара',
    restaurant: 'Авиапарк',
    column: 'new',
    priority: 'normal',
    cover: 'none',
    deadline: '30 сентября',
    assignee: 'Пётр Лазарев',
    watchers: [],
    personal: false,
    track: 'Закупки',
    ganttStart: 60,
    ganttSpan: 30,
    subtasks: [{ id: 's1', title: 'Сверить остатки крепкого', done: false }],
  },
  {
    id: 't8',
    title: 'Обучение хостес',
    restaurant: 'Кунцево Плаза',
    column: 'progress',
    priority: 'high',
    cover: 'ocean',
    deadline: '19 сентября',
    assignee: 'Марина Ким',
    watchers: ['Алина Ветрова', 'Ольга Панина', 'Егор Тимофеев'],
    template: 'Обучение и развитие персонала',
    personal: false,
    track: 'Персонал',
    ganttStart: 20,
    ganttSpan: 40,
    subtasks: [
      { id: 's1', title: 'Скрипт встречи гостя', done: true },
      { id: 's2', title: 'Работа с бронями', done: true },
      { id: 's3', title: 'Разбор конфликтов', done: true },
      { id: 's4', title: 'Тест по стандартам', done: false },
      { id: 's5', title: 'Аттестация', done: false },
    ],
  },
  {
    id: 't9',
    title: 'Фотосъёмка блюд',
    restaurant: 'Метрополис',
    column: 'progress',
    priority: 'critical',
    cover: 'none',
    deadline: '14 сентября',
    assignee: 'Егор Тимофеев',
    watchers: ['Алина Ветрова'],
    personal: false,
    track: 'Маркетинг',
    ganttStart: 30,
    ganttSpan: 24,
    subtasks: [
      { id: 's1', title: 'Найти студию', done: true },
      { id: 's2', title: 'Согласовать реквизит', done: false },
    ],
  },
  {
    id: 't10',
    title: 'Договор аренды, Каширская Плаза',
    restaurant: 'Каширская Плаза',
    column: 'done',
    priority: 'normal',
    cover: 'none',
    deadline: '02 сентября',
    assignee: 'Ольга Панина',
    watchers: [],
    personal: false,
    track: 'Открытие',
    ganttStart: 0,
    ganttSpan: 20,
    subtasks: [{ id: 's1', title: 'Согласовать ставку', done: true }],
  },
  {
    id: 't11',
    title: 'Отчёт по фудкосту за август',
    restaurant: 'Кунцево Плаза',
    column: 'done',
    priority: 'normal',
    cover: 'none',
    deadline: '05 сентября',
    assignee: 'Пётр Лазарев',
    watchers: ['Алина Ветрова', 'Дмитрий Соколов'],
    personal: false,
    track: 'Отчётность',
    ganttStart: 4,
    ganttSpan: 18,
    subtasks: [
      { id: 's1', title: 'Выгрузить данные из кассы', done: true },
      { id: 's2', title: 'Свести по категориям', done: true },
    ],
  },
  {
    id: 't12',
    title: 'Открытие Хлебного: чек-лист дня Х',
    restaurant: 'Каширская Плаза',
    column: 'new',
    priority: 'high',
    cover: 'herb',
    deadline: '28 сентября',
    assignee: 'Дмитрий Соколов',
    watchers: ['Алина Ветрова'],
    template: 'Открытие',
    personal: false,
    track: 'Открытие',
    ganttStart: 74,
    ganttSpan: 22,
    subtasks: [
      { id: 's1', title: 'Прогон меню', done: false },
      { id: 's2', title: 'Гости-инспекторы', done: false },
      { id: 's3', title: 'Пресса и блогеры', done: false },
    ],
  },
];

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
];

const firstNames = [
  'Алина Ветрова', 'Дмитрий Соколов', 'Марина Ким', 'Пётр Лазарев', 'Ольга Панина',
  'Егор Тимофеев', 'Ксения Родина', 'Артём Гурьев', 'Надежда Белова', 'Илья Морозов',
  'Виктория Савина', 'Роман Кузьмин', 'Анна Шевцова', 'Максим Дорохов', 'Юлия Астахова',
  'Сергей Плахов', 'Дарья Юсупова', 'Кирилл Немов', 'Елена Рогова', 'Тимур Каримов',
  'Мария Зотова', 'Антон Ершов', 'Полина Лаврова', 'Владислав Гринь', 'Инна Королёва',
  'Никита Абрамов', 'София Терехина', 'Глеб Мещеряков', 'Лидия Бакшеева', 'Руслан Ахметов',
];

const roles: Role[] = ['owner', 'manager', 'chef', 'staff', 'guest'];

function translit(name: string) {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
    э: 'e', ю: 'yu', я: 'ya', ' ': '.',
  };
  return name.toLowerCase().split('').map((c) => map[c] ?? '').join('');
}

export const MEMBERS: Member[] = firstNames.map((name, i) => ({
  id: `u${i + 1}`,
  name,
  login: translit(name),
  email: `${translit(name)}@iconfood.ru`,
  role: i === 0 ? 'manager' : i === 1 ? 'owner' : roles[(i + 1) % roles.length],
  restaurant: RESTAURANTS[i % RESTAURANTS.length],
  online: i % 3 !== 2,
}));

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
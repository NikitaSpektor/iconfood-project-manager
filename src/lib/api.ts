import urls from '../../backend/func2url.json';

export const AUTH_URL = urls.auth;
export const TASKS_URL = urls.tasks;
export const SUBTASKS_AI_URL = (urls as Record<string, string>).subtasks || '';
export const TELEGRAM_URL = (urls as Record<string, string>).telegram || '';
export const PLANNER_URL = (urls as Record<string, string>).planner || '';
export const ANALYST_URL = (urls as Record<string, string>).analyst || '';

const TOKEN_KEY = 'iconfood_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': getToken(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 504) {
      throw new Error('Ответ готовился слишком долго — попробуйте задать вопрос короче');
    }
    throw new Error(data.error || 'Ошибка сервера');
  }
  return data;
}

export interface ApiUser {
  name: string;
  login: string;
  role: string;
  restaurant: string;
  email: string;
}

export async function login(loginName: string, password: string) {
  const data = await request(AUTH_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'login', login: loginName, password }),
  });
  setToken(data.token);
  return data.user as ApiUser;
}

export async function me() {
  const data = await request(AUTH_URL);
  return data.user as ApiUser;
}

export async function logout() {
  await request(AUTH_URL, { method: 'POST', body: JSON.stringify({ action: 'logout' }) }).catch(
    () => undefined,
  );
  clearToken();
}

export async function fetchMembers(scope: 'active' | 'dismissed' = 'active') {
  const res = await fetch(`${AUTH_URL}?action=members&scope=${scope}`);
  const data = await res.json();
  return data.members as {
    id: string;
    name: string;
    login: string;
    email: string;
    role: string;
    restaurant: string;
    position?: string;
    online: boolean;
  }[];
}

export async function updateMember(payload: {
  login: string;
  name: string;
  email: string;
  position?: string;
  role?: string;
  restaurant?: string;
}) {
  return request(AUTH_URL, { method: 'POST', body: JSON.stringify({ action: 'update', ...payload }) });
}

export async function dismissMember(loginName: string) {
  return request(AUTH_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'dismiss', login: loginName }),
  });
}

export async function resetMemberPassword(loginName: string) {
  return request(AUTH_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'reset_password', login: loginName }),
  }) as Promise<{ ok: boolean; login: string; password: string }>;
}

export async function restoreMember(loginName: string) {
  return request(AUTH_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'restore', login: loginName }),
  });
}

export async function inviteMember(payload: {
  name: string;
  email: string;
  role: string;
  restaurant: string;
  position?: string;
}) {
  return request(AUTH_URL, { method: 'POST', body: JSON.stringify({ action: 'invite', ...payload }) });
}

export async function updateRole(
  loginName: string,
  role: string,
  restaurant?: string,
  position?: string,
) {
  const payload: Record<string, unknown> = { action: 'role', login: loginName, role, restaurant };
  if (position !== undefined) payload.position = position;
  return request(AUTH_URL, { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchTasks() {
  return request(TASKS_URL);
}

export async function taskAction(payload: Record<string, unknown>) {
  return request(TASKS_URL, { method: 'POST', body: JSON.stringify(payload) });
}
export async function suggestSubtasks(payload: {
  title: string;
  restaurant: string;
  priority?: string;
  deadline?: string;
  note?: string;
}) {
  if (!SUBTASKS_AI_URL) throw new Error('Помощник пока недоступен');
  const data = await request(SUBTASKS_AI_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return (data.steps || []) as string[];
}

export async function testMail() {
  return (await request(TASKS_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'mail_test' }),
  })) as { ok: boolean; note: string };
}

export async function askAnalyst(question: string, taskId?: string) {
  if (!ANALYST_URL) throw new Error('Ассистент пока недоступен');
  const data = (await request(ANALYST_URL, {
    method: 'POST',
    body: JSON.stringify(taskId ? { question, taskId } : { question }),
  })) as { answer: string; tasks: number };
  return data;
}

export interface PlannerEntry {
  id: string;
  login: string;
  author: string;
  day: string;
  start: number;
  end: number;
  title: string;
  note: string;
  kind: string;
  place: string;
  taskId: string;
}

export interface PlannerData {
  entries: PlannerEntry[];
  people: { login: string; name: string; position: string }[];
  weekStart: string;
  day: string;
  me: { login: string; name: string; role: string };
  canEdit: boolean;
}

export async function fetchPlanner(day: string) {
  if (!PLANNER_URL) throw new Error('Планировщик пока недоступен');
  return (await request(`${PLANNER_URL}?day=${day}`)) as PlannerData;
}

export async function plannerAction(payload: Record<string, unknown>) {
  if (!PLANNER_URL) throw new Error('Планировщик пока недоступен');
  return (await request(PLANNER_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  })) as PlannerData;
}

export interface TelegramStatus {
  linked: boolean;
  username: string;
  channelId: string;
  bot: string;
  code?: string;
}

export async function telegramStatus() {
  if (!TELEGRAM_URL) throw new Error('Telegram пока не подключён');
  return (await request(TELEGRAM_URL)) as TelegramStatus;
}

export async function telegramAction(action: 'code' | 'unlink' | 'setup', extra: Record<string, unknown> = {}) {
  if (!TELEGRAM_URL) throw new Error('Telegram пока не подключён');
  return (await request(TELEGRAM_URL, {
    method: 'POST',
    body: JSON.stringify({ action, ...extra }),
  })) as TelegramStatus;
}
import urls from '../../backend/func2url.json';

export const AUTH_URL = urls.auth;
export const TASKS_URL = urls.tasks;
export const SUBTASKS_AI_URL = (urls as Record<string, string>).subtasks || '';

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
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
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

export async function fetchMembers() {
  const res = await fetch(`${AUTH_URL}?action=members`);
  const data = await res.json();
  return data.members as {
    id: string;
    name: string;
    login: string;
    email: string;
    role: string;
    restaurant: string;
    online: boolean;
  }[];
}

export async function inviteMember(payload: {
  name: string;
  email: string;
  role: string;
  restaurant: string;
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
}) {
  if (!SUBTASKS_AI_URL) throw new Error('Помощник пока недоступен');
  const data = await request(SUBTASKS_AI_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return (data.steps || []) as string[];
}

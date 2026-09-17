export function unitsOf(task: { restaurant?: string; units?: string[] }): string[] {
  const list = task.units?.length
    ? task.units
    : (task.restaurant || '').split(/[|,]/);
  const out: string[] = [];
  list.forEach((u) => {
    const name = u.trim();
    if (name && !out.includes(name)) out.push(name);
  });
  return out;
}

export function unitsLabel(task: { restaurant?: string; units?: string[] }): string {
  return unitsOf(task).join(', ') || '—';
}

export function unitsShort(task: { restaurant?: string; units?: string[] }): string {
  const list = unitsOf(task);
  if (list.length === 0) return '—';
  if (list.length <= 2) return list.join(', ');
  return `${list[0]} и ещё ${list.length - 1}`;
}

export default unitsOf;

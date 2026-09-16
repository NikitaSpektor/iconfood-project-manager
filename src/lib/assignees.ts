export function assigneesOf(task: { assignee?: string; assignees?: string[] }): string[] {
  const list = task.assignees?.length ? task.assignees : (task.assignee || '').split('|');
  return list.map((n) => n.trim()).filter(Boolean);
}

export function assigneesLabel(task: { assignee?: string; assignees?: string[] }): string {
  return assigneesOf(task).join(', ') || '—';
}

export default assigneesOf;

const VISITOR_ID_KEY = 'zehut_visitor_id';
const VISITOR_CREATED_KEY = 'zehut_visitor_created';

export function getVisitorId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(VISITOR_ID_KEY);
}

export function createVisitorId(): string {
  const id = crypto.randomUUID();
  if (typeof window !== 'undefined') {
    localStorage.setItem(VISITOR_ID_KEY, id);
    localStorage.setItem(VISITOR_CREATED_KEY, new Date().toISOString());
  }
  return id;
}

export function getOrCreateVisitorId(): string {
  const existing = getVisitorId();
  if (existing) return existing;
  return createVisitorId();
}

export function getVisitorCreatedAt(): Date | null {
  if (typeof window === 'undefined') return null;
  const created = localStorage.getItem(VISITOR_CREATED_KEY);
  return created ? new Date(created) : null;
}

export function clearVisitorId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(VISITOR_ID_KEY);
  localStorage.removeItem(VISITOR_CREATED_KEY);
}

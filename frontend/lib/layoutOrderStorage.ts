/**
 * Persisted order for menu sidebar and heading toolbar.
 * Sidebar and toolbar orders are independent; items cannot move between them.
 */

const SIDEBAR_ORDER_KEY = 'pulse_sidebar_nav_order';
const TOOLBAR_ORDER_KEY = 'pulse_toolbar_order';

export type NavTabId = 'executive' | 'analysis' | 'news' | 'chatroom' | 'notion';

export const DEFAULT_SIDEBAR_ORDER: NavTabId[] = [
  'executive',
  'analysis',
  'news',
  'chatroom',
  'notion',
];

export type ToolbarItemId = 'platform' | 'power' | 'layout' | 'chat' | 'heartbeat' | 'ivScore';

export const DEFAULT_TOOLBAR_ORDER: ToolbarItemId[] = [
  'platform',
  'power',
  'layout',
  'chat',
  'heartbeat',
  'ivScore',
];

function loadOrder<T>(key: string, defaultOrder: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultOrder;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultOrder;
    const valid = defaultOrder.filter((id) => parsed.includes(id));
    const rest = parsed.filter((id: unknown) => defaultOrder.includes(id as T)) as T[];
    return rest.length > 0 ? rest : defaultOrder;
  } catch {
    return defaultOrder;
  }
}

function saveOrder(key: string, order: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(order));
  } catch {
    // ignore
  }
}

export function getSidebarOrder(): NavTabId[] {
  return loadOrder(SIDEBAR_ORDER_KEY, DEFAULT_SIDEBAR_ORDER);
}

export function setSidebarOrder(order: NavTabId[]): void {
  saveOrder(SIDEBAR_ORDER_KEY, order);
}

export function getToolbarOrder(): ToolbarItemId[] {
  return loadOrder(TOOLBAR_ORDER_KEY, DEFAULT_TOOLBAR_ORDER);
}

export function setToolbarOrder(order: ToolbarItemId[]): void {
  saveOrder(TOOLBAR_ORDER_KEY, order);
}

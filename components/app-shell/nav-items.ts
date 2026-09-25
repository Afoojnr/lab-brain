import { LayoutGridIcon, SettingsIcon } from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/', labelKey: 'dashboard', Icon: LayoutGridIcon },
  { href: '/settings', labelKey: 'settings', Icon: SettingsIcon }
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

export const isNavItemActive = (item: NavItem, pathname: string) =>
  item.href === '/'
    ? pathname === '/'
    : pathname === item.href || pathname.startsWith(`${item.href}/`);

import { SettingsIcon } from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/settings', labelKey: 'settings', Icon: SettingsIcon }
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

export const isNavItemActive = (item: NavItem, pathname: string) =>
  pathname === item.href || pathname.startsWith(`${item.href}/`);

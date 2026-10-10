import { ChartScatterIcon, SettingsIcon } from 'lucide-react';

export const PLOTS_ITEM = {
  href: '/plots',
  labelKey: 'plots',
  Icon: ChartScatterIcon
} as const;

export const SETTINGS_ITEM = {
  href: '/settings',
  labelKey: 'settings',
  Icon: SettingsIcon
} as const;

export const NAV_ITEMS = [PLOTS_ITEM, SETTINGS_ITEM] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

export const isNavItemActive = (item: NavItem, pathname: string) =>
  pathname === item.href || pathname.startsWith(`${item.href}/`);

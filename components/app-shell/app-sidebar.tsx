'use client';

import { FlaskConicalIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from '@/components/ui/sidebar';

import { isNavItemActive, NAV_ITEMS } from './nav-items';
import type { NavItem } from './nav-items';

const [DASHBOARD_ITEM, SETTINGS_ITEM] = NAV_ITEMS;

/** Highlight that slides between items, so the eye follows where you went. */
const ActivePill = () => (
  <motion.span
    layoutId="sidebar-active-pill"
    className="bg-sidebar-accent absolute inset-0 -z-10 rounded-md"
    transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
  />
);

const NavLink = ({ item }: { item: NavItem }) => {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const isActive = isNavItemActive(item, pathname);
  const label = t(item.labelKey);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={label}
        onClick={() => setOpenMobile(false)}
        className="relative isolate data-active:bg-transparent"
        render={<Link href={item.href} />}
      >
        {isActive && <ActivePill />}
        <item.Icon aria-hidden />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

/** Primary navigation. Collapses to an icon rail on desktop, a sheet on mobile. */
export const AppSidebar = () => {
  const t = useTranslations('common');
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" />}
              onClick={() => setOpenMobile(false)}
            >
              <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                <FlaskConicalIcon aria-hidden />
              </span>
              <span className="text-base font-semibold tracking-tight">
                {t('appName')}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavLink item={DASHBOARD_ITEM} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <NavLink item={SETTINGS_ITEM} />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

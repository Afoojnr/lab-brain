'use client';

import { ChevronRightIcon, FolderKanbanIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar
} from '@/components/ui/sidebar';
import { usePersistentOpen } from '@/hooks/use-persistent-open';
import { cn } from '@/lib/utils';
import type { NavigationProject } from '@/types/navigation';

/**
 * "Projects": its label opens the all-projects page (the home page), and a
 * chevron collapses the list of every project under it.
 */
export const NavProjects = ({
  projects
}: {
  projects: NavigationProject[];
}) => {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [isOpen, setIsOpen] = usePersistentOpen('nav:projects', true);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      render={<SidebarMenuItem />}
    >
      <SidebarMenuButton
        tooltip={t('projects')}
        isActive={pathname === '/' || pathname.startsWith('/projects/')}
        render={<Link href="/" onClick={() => setOpenMobile(false)} />}
      >
        <FolderKanbanIcon aria-hidden />
        <span>{t('projects')}</span>
      </SidebarMenuButton>
      <CollapsibleTrigger
        render={
          <SidebarMenuAction
            aria-label={t('toggle', { name: t('projects') })}
          />
        }
      >
        <ChevronRightIcon
          aria-hidden
          className={cn('transition-transform', isOpen && 'rotate-90')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {projects.length === 0 ? (
            <li className="text-sidebar-foreground/60 px-2 py-1 text-xs">
              {t('noProjects')}
            </li>
          ) : (
            projects.map(project => {
              const path = `/projects/${project.id}`;

              return (
                <SidebarMenuSubItem key={project.id}>
                  <SidebarMenuSubButton
                    isActive={
                      pathname === path || pathname.startsWith(`${path}/`)
                    }
                    render={
                      <Link href={path} onClick={() => setOpenMobile(false)} />
                    }
                  >
                    <span>{project.name}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })
          )}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
};

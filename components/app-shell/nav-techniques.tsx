'use client';

import { ChevronRightIcon, MicroscopeIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar
} from '@/components/ui/sidebar';
import { usePersistentOpen } from '@/hooks/use-persistent-open';
import { cn } from '@/lib/utils';

/**
 * "Characterizations": one collapsible header with the techniques the app can
 * analyse. Each opens its workspace, where you analyse raw files or an
 * experiment's samples.
 */
export const NavTechniques = ({
  techniques
}: {
  techniques: readonly { kind: 'edx' | 'ellipsometry' }[];
}) => {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [isOpen, setIsOpen] = usePersistentOpen('nav:characterizations', true);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuButton
            tooltip={t('characterizations')}
            isActive={pathname.startsWith('/characterization/')}
          />
        }
      >
        <MicroscopeIcon aria-hidden />
        <span>{t('characterizations')}</span>
        <ChevronRightIcon
          aria-hidden
          className={cn(
            'ml-auto size-4 transition-transform group-data-[collapsible=icon]:hidden',
            isOpen && 'rotate-90'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {techniques.map(technique => {
            const path = `/characterization/${technique.kind}`;

            return (
              <SidebarMenuSubItem key={technique.kind}>
                <SidebarMenuSubButton
                  isActive={pathname === path}
                  render={
                    <Link href={path} onClick={() => setOpenMobile(false)} />
                  }
                >
                  <span>{t(technique.kind)}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
};

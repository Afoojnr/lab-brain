import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';

import { AppSidebar } from '@/components/app-shell/app-sidebar';
import { AppTopbar } from '@/components/app-shell/app-topbar';
import { AskAiFloating } from '@/components/ask-ai-floating';
import { SidePanel, SidePanelProvider } from '@/components/side-panel';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AssistantPanel } from '@/features/assistant';
import { TECHNIQUES } from '@/features/characterization';
import { listNavigation } from '@/features/experiments/server';

// Same cookie name that components/ui/sidebar.tsx writes when the sidebar is toggled.
const SIDEBAR_COOKIE_NAME = 'sidebar_state';

export default async function WorkspaceLayout({ children }: LayoutProps<'/'>) {
  const cookieStore = await cookies();
  const isSidebarOpen = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== 'false';
  const [navigation, t] = await Promise.all([
    listNavigation(),
    getTranslations('assistant.chat')
  ]);

  return (
    <SidePanelProvider>
      <SidebarProvider defaultOpen={isSidebarOpen}>
        <AppSidebar navigation={navigation} techniques={TECHNIQUES} />
        <SidebarInset>
          <AppTopbar />
          <div className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-32 md:px-8">
            {children}
          </div>
        </SidebarInset>
        <AskAiFloating />
        <SidePanel title={t('title')} closeLabel={t('close')}>
          <AssistantPanel projects={navigation.projects} />
        </SidePanel>
      </SidebarProvider>
    </SidePanelProvider>
  );
}

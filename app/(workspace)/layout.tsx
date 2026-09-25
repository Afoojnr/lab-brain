import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/app-shell/app-sidebar';
import { AppTopbar } from '@/components/app-shell/app-topbar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

// Same cookie name that components/ui/sidebar.tsx writes when the sidebar is toggled.
const SIDEBAR_COOKIE_NAME = 'sidebar_state';

export default async function WorkspaceLayout({ children }: LayoutProps<'/'>) {
  const cookieStore = await cookies();
  const isSidebarOpen = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== 'false';

  return (
    <SidebarProvider defaultOpen={isSidebarOpen}>
      <AppSidebar />
      <SidebarInset>
        <AppTopbar />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

import { Outlet } from 'react-router-dom';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { Separator } from '@/components/ui/separator';

export function AppLayout() {
  const appName = import.meta.env.VITE_APP_NAME;
  const appEnv = import.meta.env.VITE_APP_ENV;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{appName}</h1>
            {appEnv !== 'production' && (
              <span className="rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                {appEnv.toUpperCase()}
              </span>
            )}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

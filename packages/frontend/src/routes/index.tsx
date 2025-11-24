import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { FileSourcesPage } from '@/pages/FileSourcesPage';
import { InwardFilesPage } from '@/pages/InwardFilesPage';
import WatchersPage from '@/pages/WatchersPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'file-sources',
        element: <FileSourcesPage />,
      },
      {
        path: 'inward-files',
        element: <InwardFilesPage />,
      },
      {
        path: 'watchers',
        element: <WatchersPage />,
      },
      {
        path: 'file-tracking',
        element: (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">File Tracking</h2>
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        ),
      },
      {
        path: 'notifications',
        element: (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        ),
      },
      {
        path: 'users',
        element: (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Users</h2>
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        ),
      },
      {
        path: 'settings',
        element: (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        ),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

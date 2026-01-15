import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { FileSourcesPage } from '@/pages/FileSourcesPage';
import { InwardFilesPage } from '@/pages/InwardFilesPage';
import WatchersPage from '@/pages/WatchersPage';
import ConnectionsPage from '@/pages/ConnectionsPage';
import SchedulesPage from '@/pages/SchedulesPage';
import DepartmentsPage from '@/pages/DepartmentsPage';
import FileTrackingPage from '@/pages/FileTrackingPage';
import AnalyticsDashboardPage from '@/pages/AnalyticsDashboardPage';
import AlertsPage from '@/pages/AlertsPage';
import UsersPage from '@/pages/UsersPage';
import InvitationsPage from '@/pages/InvitationsPage';
import SettingsPage from '@/pages/SettingsPage';
import LoginPage from '@/pages/LoginPage';
import AcceptInvitationPage from '@/pages/AcceptInvitationPage';
import UnauthorizedPage from '@/pages/UnauthorizedPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  // Public routes (no authentication required)
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/accept-invitation',
    element: <AcceptInvitationPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  // Protected routes (authentication required)
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <AnalyticsDashboardPage />,
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
        path: 'connections',
        element: <ConnectionsPage />,
      },
      {
        path: 'schedules',
        element: <SchedulesPage />,
      },
      {
        path: 'departments',
        element: <DepartmentsPage />,
      },
      {
        path: 'file-tracking',
        element: <FileTrackingPage />,
      },
      {
        path: 'alerts',
        element: <AlertsPage />,
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
          <ProtectedRoute requiredRoles={['owner', 'super_admin']}>
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'invitations',
        element: (
          <ProtectedRoute requiredRoles={['owner', 'super_admin']}>
            <InvitationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);

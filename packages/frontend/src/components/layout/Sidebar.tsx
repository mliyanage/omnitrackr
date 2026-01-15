import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  FileInput,
  FileSearch,
  BellRing,
  Settings,
  Users,
  MailPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'File Sources',
    href: '/file-sources',
    icon: Database,
  },
  {
    title: 'Inward Files',
    href: '/inward-files',
    icon: FileInput,
  },
  {
    title: 'File Tracking',
    href: '/file-tracking',
    icon: FileSearch,
  },
  {
    title: 'Alerts',
    href: '/alerts',
    icon: BellRing,
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
  },
  {
    title: 'Invitations',
    href: '/invitations',
    icon: MailPlus,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-64 border-r bg-background">
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

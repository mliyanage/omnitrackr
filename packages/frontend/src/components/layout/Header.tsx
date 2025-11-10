import { cn } from '@/lib/utils';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const appName = import.meta.env.VITE_APP_NAME;
  const appEnv = import.meta.env.VITE_APP_ENV;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
    >
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{appName}</h1>
          {appEnv !== 'production' && (
            <span className="rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
              {appEnv.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* TODO: Add user menu when authentication is implemented */}
          <div className="text-sm text-muted-foreground">
            No Auth (Open Access)
          </div>
        </div>
      </div>
    </header>
  );
}

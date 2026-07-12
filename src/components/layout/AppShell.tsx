import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Wrench,
  History,
  Activity,
  Bell,
  Settings as SettingsIcon,
  FilePlus2,
  Moon,
  Sun,
  Menu,
  X,
  HelpCircle,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import logoAsset from "@/assets/pertamina-logo.png.asset.json";
import { cn } from "@/lib/utils";
import { useAuthStore, useCurrentUser } from "@/lib/auth-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/instruments", label: "Instruments", icon: Wrench },
  { to: "/maintenance", label: "Maintenance", icon: History },
  { to: "/health", label: "Health & Calibration", icon: Activity },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/input", label: "Input Data", icon: FilePlus2 },
  { to: "/help", label: "Help & Guide", icon: HelpCircle },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3 min-w-0">
      <img
        src={logoAsset.url}
        alt="Pertamina"
        className="h-9 w-auto shrink-0 object-contain"
      />
      <div className="hidden sm:block min-w-0">
        <div className="text-sm font-semibold leading-tight truncate text-foreground">
          Reliability Instrumentation
        </div>
        <div className="text-[11px] text-muted-foreground leading-tight truncate">
          Maintenance Area 2 – RU VI Balongan
        </div>
      </div>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1 p-3">
      {nav.map((n) => {
        const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
        const Icon = n.icon;
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
      className="h-9 w-9"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}

function UserMenu() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const setCurrent = useAuthStore((s) => s.setCurrent);
  if (!user) return null;
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 px-2 hover:bg-accent"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {initials || <UserIcon className="h-3.5 w-3.5" />}
          </div>
          <span className="hidden sm:inline text-sm font-medium text-foreground">
            {user.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="text-sm font-medium">{user.name}</div>
          <div className="text-xs text-muted-foreground font-normal">
            {user.email}
          </div>
          <div className="text-[11px] mt-1 text-primary font-medium">
            {user.role}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            setCurrent(null);
            navigate({ to: "/auth" });
          }}
          className="text-primary focus:text-primary"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-background/80 backdrop-blur px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setDrawer(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Brand />
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col border-r bg-sidebar min-h-[calc(100vh-4rem)] sticky top-16">
          <NavList />
          <div className="mt-auto p-3 text-[11px] text-muted-foreground">
            v1.1 · Cloudflare-ready
          </div>
        </aside>

        {/* Drawer mobile */}
        {drawer && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setDrawer(false)}
            />
            <div className="absolute left-0 top-0 h-full w-72 bg-sidebar border-r shadow-xl flex flex-col animate-in slide-in-from-left">
              <div className="flex items-center justify-between h-16 px-4 border-b">
                <Brand />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDrawer(false)}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <NavList onNavigate={() => setDrawer(false)} />
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0 p-4 md:p-8 animate-in fade-in duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}

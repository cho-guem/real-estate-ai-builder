"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";
import { appConfig } from "@/config/app.config";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  FolderOpen,
  Settings,
};

interface SidebarProps {
  userEmail: string;
  userFullName: string | null;
}

export function Sidebar({ userEmail, userFullName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r bg-background">
      {/* 로고 */}
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <span className="text-xs font-bold text-primary-foreground">AI</span>
        </div>
        <span className="font-semibold tracking-tight">{appConfig.name}</span>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          메뉴
        </p>
        <ul className="space-y-0.5">
          {appConfig.nav.dashboard.map((item) => {
            const Icon = iconMap[item.icon] ?? LayoutDashboard;
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  {item.label}
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 사용자 정보 + 로그아웃 */}
      <div className="border-t px-3 py-3">
        <div className="mb-1 rounded-md bg-muted/60 px-3 py-2.5">
          {userFullName && (
            <p className="truncate text-sm font-semibold">{userFullName}</p>
          )}
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
